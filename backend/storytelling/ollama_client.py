"""Ollama client, model tiers, and the memory policy for this machine.

Why this file is opinionated
---------------------------
The dev machine is an **Apple M1 Max with 32 GB of unified memory**. On Apple
Silicon the GPU draws from that same pool, and macOS caps wired GPU memory at
roughly 75% of RAM (~24 GB here) unless ``iogpu.wired_limit_mb`` is raised.

That single fact drives every design choice below:

* ``gemma4:31b`` is 19 GB and ``qwen3.6:35b`` is 23 GB. **Together they are
  42 GB, so they can never be resident at the same time.** A large-tier run must
  load, infer, unload, then load the next model.
* Model swaps are part of the runtime cost. Measured on this machine:
  ``gemma4:31b`` loads in ~11 s and then generates at **~9.5 tok/s**
  (prompt eval ~62 tok/s). A moderation stage emitting ~700 tokens is therefore
  a ~90 s stage before any load cost, which is why the large tier is batch-only.
* Generation is capped by ``num_predict``; unbounded constrained decoding on a
  31B model is how a stage quietly turns into a six-minute stall.
* Concurrency is not a goal, it is a hazard. Two simultaneous requests would try
  to hold two big models at once and thrash. Every call here is serialised
  behind :data:`_LOCK`.

So the tiers are not "small/medium/large for taste". They encode what the
hardware can actually hold at once.
"""

from __future__ import annotations

import json
import logging
import re
import subprocess
import threading
from dataclasses import dataclass
from typing import Any, TypeVar

import requests
from pydantic import BaseModel, ValidationError

log = logging.getLogger(__name__)

API = "http://localhost:11434"

# One model family in memory at a time. See module docstring.
_LOCK = threading.Lock()

# Physical ceiling of this machine, and the share macOS lets the GPU wire down.
TOTAL_RAM_GB = 32.0
DEFAULT_GPU_FRACTION = 0.75
HEADROOM_GB = 2.0

T = TypeVar("T", bound=BaseModel)


class OllamaError(RuntimeError):
    pass


# --------------------------------------------------------------------------
# Tier definitions
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Tier:
    id: str
    label: str
    description: str
    generator: str
    moderator: str
    judge: str
    # Approximate on-disk/in-memory size per tag, GB. Used for the residency
    # decision; `ollama list` supplies the real number when the tag is pulled.
    sizes: dict[str, float]

    @property
    def models(self) -> dict[str, str]:
        return {"generator": self.generator, "moderator": self.moderator, "judge": self.judge}

    @property
    def distinct_models(self) -> list[str]:
        seen: list[str] = []
        for m in self.models.values():
            if m not in seen:
                seen.append(m)
        return seen


TIERS: dict[str, Tier] = {
    "demo": Tier(
        id="demo",
        label="Demo (small, live)",
        description=(
            "The tier the interim report ran. Small enough that generator and "
            "moderator stay co-resident, so a full run is interactive and safe to "
            "drive from a web request."
        ),
        generator="qwen3.5:4b",
        moderator="gemma4:12b",
        # gemma4:12b is the moderator here, so it cannot also be the judge: that
        # is the self-assessment this project measures rather than commits. The
        # local judge is a different family, and the authoritative rating comes
        # from the Claude CLI judge in judge.py.
        judge="qwen3.5:4b",
        sizes={"qwen3.5:4b": 2.6, "gemma4:12b": 8.1},
    ),
    "mid": Tier(
        id="mid",
        label="Mid (8B generator, 31B moderator)",
        description=(
            "Isolates the moderation variable: a modest generator still writes an "
            "emotive draft, but a much stronger moderator judges it. Sequential - "
            "the 31B cannot share memory with anything meaningful."
        ),
        generator="llama3.1:8b",
        moderator="gemma4:31b",
        judge="gemma4:31b",
        sizes={"llama3.1:8b": 4.9, "gemma4:31b": 19.0},
    ),
    "large": Tier(
        id="large",
        label="Large (batch only)",
        description=(
            "The scale-up tier from the report's next steps. 23 GB generator and "
            "19 GB moderator cannot coexist in 32 GB, so each stage loads and "
            "unloads. Minutes per story - run it as a batch job, never in a request."
        ),
        generator="qwen3.6:35b",
        moderator="gemma4:31b",
        judge="gemma4:31b",
        sizes={"qwen3.6:35b": 23.0, "gemma4:31b": 19.0},
    ),
    "g1b": Tier(
        id="g1b",
        label="G1B (1B generator)",
        description=(
            "Generator-size ladder, rung 1. Moderator and judge held fixed so the only moving part is how capable the writer is."
        ),
        generator="llama3.2:1b",
        moderator="gemma4:31b",
        judge="qwen3.5:4b",
        sizes={"llama3.2:1b": 1.3, "gemma4:31b": 19.0, "qwen3.5:4b": 3.4},
    ),
    "g3b": Tier(
        id="g3b",
        label="G3B (3B generator)",
        description=(
            "Generator-size ladder, rung 2."
        ),
        generator="llama3.2:3b",
        moderator="gemma4:31b",
        judge="qwen3.5:4b",
        sizes={"llama3.2:3b": 2.0, "gemma4:31b": 19.0, "qwen3.5:4b": 3.4},
    ),
    "g4b": Tier(
        id="g4b",
        label="G4B (4B generator)",
        description=(
            "Generator-size ladder, rung 3. qwen3.5:4b is the generator the interim report named."
        ),
        generator="qwen3.5:4b",
        moderator="gemma4:31b",
        judge="qwen3.5:4b",
        sizes={"qwen3.5:4b": 3.4, "gemma4:31b": 19.0, "qwen3.5:4b": 3.4},
    ),
    "g8b": Tier(
        id="g8b",
        label="G8B (8B generator)",
        description=(
            "Generator-size ladder, rung 4. Same generator as the old mid tier, but judged by a model that did not write the moderation."
        ),
        generator="llama3.1:8b",
        moderator="gemma4:31b",
        judge="qwen3.5:4b",
        sizes={"llama3.1:8b": 4.9, "gemma4:31b": 19.0, "qwen3.5:4b": 3.4},
    ),
    "m12b": Tier(
        id="m12b",
        label="M12B (12B moderator)",
        description=(
            "Moderator-size ladder, rung 1. gemma4 has no 8B tag; 12B is the smallest rung the family offers."
        ),
        generator="llama3.1:8b",
        moderator="gemma4:12b",
        judge="qwen3.5:4b",
        sizes={"llama3.1:8b": 4.9, "gemma4:12b": 8.1, "qwen3.5:4b": 3.4},
    ),
    "m26b": Tier(
        id="m26b",
        label="M26B (26B moderator)",
        description=(
            "Moderator-size ladder, rung 2."
        ),
        generator="llama3.1:8b",
        moderator="gemma4:26b",
        judge="qwen3.5:4b",
        sizes={"llama3.1:8b": 4.9, "gemma4:26b": 16.0, "qwen3.5:4b": 3.4},
    ),
    "m31b": Tier(
        id="m31b",
        label="M31B (31B moderator)",
        description=(
            "Moderator-size ladder, rung 3. Same pairing as m26b/m12b so the rungs are directly comparable."
        ),
        generator="llama3.1:8b",
        moderator="gemma4:31b",
        judge="qwen3.5:4b",
        sizes={"llama3.1:8b": 4.9, "gemma4:31b": 19.0, "qwen3.5:4b": 3.4},
    ),
    "q2b": Tier(
        id="q2b",
        label="Q2B (qwen3.5:2b generator, within-family ladder)",
        description=(
            "Generator ladder rung 1, WITHIN ONE FAMILY. The g1b/g3b/g4b/g8b "
            "ladder mixes llama3.2, qwen3.5 and llama3.1, so its size effect is "
            "confounded with family and generation. qwen3.5 is the only family "
            "here with 2b/4b/9b/27b/35b, so this ladder moves size alone."
        ),
        generator="qwen3.5:2b",
        moderator="gemma4:31b",
        judge="qwen3.5:4b",
        sizes={"qwen3.5:2b": 1.6, "gemma4:31b": 19.0, "qwen3.5:4b": 3.4},
    ),
    "q4b": Tier(
        id="q4b",
        label="Q4B (qwen3.5:4b generator, within-family ladder)",
        description="Within-family generator ladder rung 2. Same pairing as g4b.",
        generator="qwen3.5:4b",
        moderator="gemma4:31b",
        judge="qwen3.5:4b",
        sizes={"qwen3.5:4b": 3.4, "gemma4:31b": 19.0},
    ),
    "q9b": Tier(
        id="q9b",
        label="Q9B (qwen3.5:9b generator, within-family ladder)",
        description=(
            "Within-family generator ladder rung 3. qwen3.5:9b is the only model "
            "the family offers between 8B and 12B."
        ),
        generator="qwen3.5:9b",
        moderator="gemma4:31b",
        judge="qwen3.5:4b",
        sizes={"qwen3.5:9b": 6.6, "gemma4:31b": 19.0, "qwen3.5:4b": 3.4},
    ),
    "q27b": Tier(
        id="q27b",
        label="Q27B (qwen3.5:27b generator, within-family ladder)",
        description=(
            "Within-family generator ladder rung 4, and the rung L18 has been "
            "missing. The ladder so far (2b/4b/9b) showed no size effect on raw "
            "alarmism, while the one calm generator in the whole set is "
            "llama3.1:8b - so 'calm' looked like a family trait rather than a "
            "scale one. A large qwen that also writes calmly would overturn "
            "that; one that runs hot like its smaller siblings confirms it. "
            "17 GB generator against a 19 GB moderator, so the two cannot be "
            "co-resident and each stage loads and unloads."
        ),
        generator="qwen3.5:27b",
        moderator="gemma4:31b",
        judge="qwen3.5:4b",
        sizes={"qwen3.5:27b": 17.0, "gemma4:31b": 19.0, "qwen3.5:4b": 3.4},
    ),
    "x9b": Tier(
        id="x9b",
        label="X9B (qwen3.5:9b moderator, cross-family control)",
        description=(
            "Cross-family control for the moderator ladder. gemma4:12b/26b/31b "
            "share an architecture, so a trend across them is evidence about "
            "scaling within gemma4, not about capability. This pairs a 9B qwen "
            "moderator against the 12B gemma rung at near-equal size."
        ),
        generator="llama3.1:8b",
        moderator="qwen3.5:9b",
        judge="qwen3.5:4b",
        sizes={"llama3.1:8b": 4.9, "qwen3.5:9b": 6.6, "qwen3.5:4b": 3.4},
    ),
    "x35b": Tier(
        id="x35b",
        label="X35B (qwen3.6:35b moderator, top-end family control)",
        description=(
            "The cleanest family test available: 35B qwen against the 31B gemma "
            "moderator, near-identical scale, different lineage. At 23 GB it "
            "exceeds the 22 GB usable ceiling and will offload to CPU unless the "
            "wired limit is raised (sudo sysctl iogpu.wired_limit_mb=28672)."
        ),
        generator="llama3.1:8b",
        moderator="qwen3.6:35b",
        judge="qwen3.5:4b",
        sizes={"llama3.1:8b": 4.9, "qwen3.6:35b": 23.9, "qwen3.5:4b": 3.4},
    ),
    "m31b-selfjudge": Tier(
        id="m31b-selfjudge",
        label="M31B self-judging (P0.1 control)",
        description=(
            "Identical to m31b except the judge IS the moderator. Kept deliberately: the difference between this tier and m31b is the size of the self-assessment bias."
        ),
        generator="llama3.1:8b",
        moderator="gemma4:31b",
        judge="gemma4:31b",
        sizes={"llama3.1:8b": 4.9, "gemma4:31b": 19.0},
    ),
}

DEFAULT_TIER = "demo"


# --------------------------------------------------------------------------
# Capability probing
# --------------------------------------------------------------------------


def gpu_wired_limit_gb() -> float:
    """What macOS will actually let the GPU wire down."""
    try:
        out = subprocess.run(
            ["sysctl", "-n", "iogpu.wired_limit_mb"],
            capture_output=True, text=True, timeout=5,
        ).stdout.strip()
        mb = int(out)
        if mb > 0:
            return round(mb / 1024, 1)
    except Exception:  # noqa: BLE001 - probe is best-effort
        pass
    # 0 (or unreadable) means "use the default", which is ~75% of RAM.
    return round(TOTAL_RAM_GB * DEFAULT_GPU_FRACTION, 1)


def usable_gb() -> float:
    return max(gpu_wired_limit_gb() - HEADROOM_GB, 1.0)


def installed_models() -> dict[str, float]:
    """Tag -> size in GB, from the running Ollama daemon."""
    try:
        r = requests.get(f"{API}/api/tags", timeout=5)
        r.raise_for_status()
    except requests.RequestException:
        return {}
    return {
        m["name"]: round(m.get("size", 0) / 1e9, 1)
        for m in r.json().get("models", [])
    }


def is_up() -> bool:
    try:
        requests.get(f"{API}/api/tags", timeout=3).raise_for_status()
        return True
    except requests.RequestException:
        return False


def tier_plan(tier: Tier) -> dict[str, Any]:
    """Can this tier run, and must its stages be sequential?"""
    have = installed_models()
    sizes = {m: have.get(m, tier.sizes.get(m, 0.0)) for m in tier.distinct_models}
    co_resident_total = sum(sizes.values())
    peak = max(sizes.values()) if sizes else 0.0
    sequential = co_resident_total > usable_gb()
    return {
        "runnable": all(m in have for m in tier.distinct_models),
        "sequential": sequential,
        "peak_resident_gb": round(peak if sequential else co_resident_total, 1),
        "sizes": sizes,
        "installed": have,
        # A single model bigger than the wired limit will spill to CPU and crawl.
        "needs_raised_limit": peak > usable_gb(),
    }


def resolve_tier(tier_id: str) -> Tier:
    if tier_id not in TIERS:
        raise OllamaError(f"Unknown tier '{tier_id}'. Known: {', '.join(TIERS)}")
    return TIERS[tier_id]


# --------------------------------------------------------------------------
# Inference
# --------------------------------------------------------------------------


def loaded_models() -> list[str]:
    """Models currently resident in memory, per the Ollama daemon."""
    try:
        r = requests.get(f"{API}/api/ps", timeout=5)
        r.raise_for_status()
    except requests.RequestException:
        return []
    return [m["name"] for m in r.json().get("models", [])]


def ensure_exclusive(model: str) -> None:
    """Evict every *other* resident model before loading this one.

    Only meaningful on a sequential tier. Crucially this does NOT evict ``model``
    itself, so consecutive stages sharing a model (moderate, judge, factcheck all
    run on the moderator) pay the 19-23 GB load exactly once instead of per call.
    """
    for other in loaded_models():
        if other != model:
            log.info("evicting %s to make room for %s", other, model)
            unload(other)


def unload(model: str) -> None:
    """Evict a model from memory immediately.

    This is the mechanism that makes the large tier possible at all: without it
    the second stage tries to load 19 GB while 23 GB is still resident.
    """
    try:
        requests.post(
            f"{API}/api/generate",
            json={"model": model, "prompt": "", "keep_alive": 0},
            timeout=120,
        )
        log.info("unloaded %s", model)
    except requests.RequestException as exc:  # noqa: BLE001
        log.warning("could not unload %s: %s", model, exc)


_JSON_INSTRUCTION = (
    "\n\nReturn ONLY a JSON object holding your answer. Do not return the schema "
    "itself, and do not include the words 'properties', 'type' or 'required'. "
    "The object must have exactly these keys: {keys}.\n"
    "Shape (types only, replace every value with your own content):\n{schema}"
)


def _schema_hint(schema_json: dict) -> tuple[str, str]:
    """Key list plus a value-shaped skeleton.

    Passing the raw JSON Schema invites a literal echo: llama3.1:8b returned the
    schema document itself, `properties` and all, which then failed validation on
    a missing field. Showing the shape rather than the specification avoids it.
    """
    props = schema_json.get("properties", {})
    keys = ", ".join(f'"{k}"' for k in props)
    skeleton = {}
    for k, spec in props.items():
        kind = spec.get("type")
        if kind == "array":
            item = (spec.get("items") or {}).get("type", "string")
            skeleton[k] = ["<string>"] if item == "string" else [{"...": "..."}]
        elif kind in ("number", "integer"):
            skeleton[k] = 0
        else:
            skeleton[k] = "<string>"
    import json as _json
    return keys, _json.dumps(skeleton, indent=2)


def _extract_json(raw: str) -> str:
    """Pull the JSON object out of a free-text response.

    Models asked for JSON often wrap it in a ```json fence or add a sentence
    before it. Take the outermost balanced object.
    """
    s = raw.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s).strip()
    start = s.find("{")
    if start == -1:
        return s
    depth, in_str, esc = 0, False, False
    for i, ch in enumerate(s[start:], start):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return s[start:i + 1]
    return s[start:]


def model_digest(model: str) -> str | None:
    """Digest of the exact weights in use. Two machines must agree on this."""
    try:
        r = requests.get(f"{API}/api/tags", timeout=5)
        r.raise_for_status()
    except requests.RequestException:
        return None
    for m in r.json().get("models", []):
        if m["name"] == model:
            return m.get("digest") or (m.get("details") or {}).get("parent_model")
    return None


def _one_call(model, system, prompt, schema_json, use_grammar, temperature,
              num_ctx, num_predict, seed, keep_alive, timeout):
    body = {
        "model": model,
        "system": system,
        "prompt": prompt if use_grammar else prompt + _JSON_INSTRUCTION.format(
            keys=_schema_hint(schema_json)[0], schema=_schema_hint(schema_json)[1]),
        "stream": False,
        "think": False,
        "keep_alive": keep_alive,
        "options": {
            "temperature": temperature,
            "num_ctx": num_ctx,
            # Hard cap. At the measured 9.5 tok/s of gemma4:31b every extra
            # 100 tokens is another 10 s of wall clock.
            "num_predict": num_predict,
            **({"seed": seed} if seed is not None else {}),
        },
    }
    if use_grammar:
        body["format"] = schema_json
    try:
        r = requests.post(f"{API}/api/generate", json=body, timeout=timeout)
        r.raise_for_status()
    except requests.RequestException as exc:
        raise OllamaError(f"{model}: {exc}") from exc
    data = r.json()
    return data, data.get("response", "")


def generate_json(
    model: str,
    system: str,
    prompt: str,
    schema: type[T],
    *,
    temperature: float = 0.0,
    num_ctx: int = 8192,
    num_predict: int = 900,
    seed: int | None = None,
    keep_alive: str | int = "5m",
    exclusive: bool = False,
    timeout: int = 1800,
    grammar: bool = True,
) -> T:
    """Run one agent turn and get back a validated Pydantic object.

    Tries Ollama's ``format`` parameter first (grammar-constrained decoding), and
    **falls back to plain prompted JSON** if that produces truncated or invalid
    output.

    The fallback is not defensive padding, it is load-bearing. Measured here:
    grammar-constrained decoding sends ``gemma4:31b`` into a degenerate repetition
    loop - it emitted the fragment "ths year-to-date figures" several hundred times
    until it hit the token cap, and a flattened schema made it emit structural
    garbage (``":{"``). The *same* model on the *same* prompt with no ``format`` at
    all stopped cleanly after 791 tokens and produced well-formed JSON on its own.
    ``llama3.1:8b`` is unaffected and works fine either way, so this is
    model-specific rather than a property of the schema.

    Rather than maintain a denylist of models, we attempt and recover.
    """
    schema_json = schema.model_json_schema(by_alias=True)
    modes = [True, False] if grammar else [False]
    last: OllamaError | None = None

    with _LOCK:  # never let two big models load at once
        if exclusive:
            ensure_exclusive(model)
        for use_grammar in modes:
            log.info("ollama %s (ctx=%s, grammar=%s)", model, num_ctx, use_grammar)
            data, raw = _one_call(model, system, prompt, schema_json, use_grammar,
                                  temperature, num_ctx, num_predict, seed, keep_alive,
                                  timeout)

            if data.get("done_reason") == "length":
                last = OllamaError(
                    f"{model} hit the {num_predict}-token cap "
                    f"(grammar={use_grammar}) and returned truncated JSON "
                    f"for {schema.__name__}."
                )
                log.warning("%s", last)
                continue

            try:
                obj = schema.model_validate_json(_extract_json(raw))
            except (ValidationError, ValueError) as exc:
                preview = raw[:200].replace("\n", " ")
                where, msg = "<root>", str(exc)
                if isinstance(exc, ValidationError) and exc.errors():
                    first = exc.errors()[0]
                    where = ".".join(str(x) for x in first.get("loc", ())) or "<root>"
                    msg = first.get("msg", "?")
                last = OllamaError(
                    f"{model} returned JSON that does not match {schema.__name__} "
                    f"(grammar={use_grammar}); first error at '{where}': {msg}. "
                    f"Response began: {preview!r}"
                )
                log.warning("%s", last)
                continue

            # stash usage for telemetry without changing the return type
            obj.__dict__["_usage"] = {
                "eval_count": data.get("eval_count"),
                "prompt_eval_count": data.get("prompt_eval_count"),
                "done_reason": data.get("done_reason"),
                "grammar": use_grammar,
                # everything needed to reproduce this exact call
                "temperature": temperature,
                "num_ctx": num_ctx,
                "num_predict": num_predict,
                "seed": seed,
                "model_digest": model_digest(model),
            }
            if not use_grammar:
                log.info("%s succeeded via the no-grammar fallback", model)
            return obj

    raise last or OllamaError(f"{model}: no response for {schema.__name__}")
