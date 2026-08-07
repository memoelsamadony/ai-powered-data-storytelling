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
        judge="gemma4:12b",
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
    "\n\nRespond with a single valid JSON object matching this schema, and nothing "
    "else - no prose, no markdown fence:\n{schema}"
)


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


def _one_call(model, system, prompt, schema_json, use_grammar, temperature,
              num_ctx, num_predict, keep_alive, timeout):
    body = {
        "model": model,
        "system": system,
        "prompt": prompt if use_grammar else prompt + _JSON_INSTRUCTION.format(
            schema=json.dumps(schema_json)),
        "stream": False,
        "think": False,
        "keep_alive": keep_alive,
        "options": {
            "temperature": temperature,
            "num_ctx": num_ctx,
            # Hard cap. At the measured 9.5 tok/s of gemma4:31b every extra
            # 100 tokens is another 10 s of wall clock.
            "num_predict": num_predict,
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
                                  temperature, num_ctx, num_predict, keep_alive, timeout)

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
            }
            if not use_grammar:
                log.info("%s succeeded via the no-grammar fallback", model)
            return obj

    raise last or OllamaError(f"{model}: no response for {schema.__name__}")
