#!/usr/bin/env python3
"""Stage 1 — Data-to-text generation with a local Ollama model.

Faithful re-implementation of the paper's ``model/generate.py`` generation loop,
but the model backend is Ollama's OpenAI-compatible API instead of
text-generation-webui. Prompt template, ``start_with`` prefix, deterministic
decoding and the output JSON/.out format are kept identical to the paper.
"""
import argparse
import json
import logging
import time
from pathlib import Path

import requests
import yaml

from quintd_data import get_data, DOMAINS

logging.basicConfig(format="%(asctime)s %(levelname)s %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parent.parent
SETUP_FILE = REPO_ROOT / "model" / "setups" / "direct.yaml"
OUT_BASE = REPO_ROOT / "data" / "quintd-1" / "outputs"


def load_setup():
    with open(SETUP_FILE) as f:
        return yaml.safe_load(f)


def normalize(text, start_with):
    """Based on models.py::LanguageModel.normalize. Also strips wrapping quotes
    that gemma tends to add (the paper's models avoided this via start_with
    prefill, which thinking-disabled gemma ignores)."""
    text = text.strip()
    if start_with and text.startswith(start_with):
        text = text[len(start_with):]
    text = text.strip()
    if text.startswith('"'):
        text = text[1:]
    if text.endswith('"'):
        text = text[:-1]
    text = text.strip()
    if text and not text.endswith("."):
        text += "."
    return text


def build_prompt(setup, domain, data_input):
    out_noun = setup["output"][domain]
    prompt = setup["prompt"].format_map({"output": out_noun, "DATA": data_input})
    start_with = setup["start_with"].format_map({"output": out_noun})
    return prompt, start_with


def generate_one(host, model, prompt, start_with, max_tokens):
    """Call Ollama's native chat endpoint with thinking DISABLED.

    gemma4:12b is a reasoning model; left on, it spends the whole token budget
    in the `reasoning` field and emits no answer. Disabling `think` makes it
    behave as a standard zero-shot instruct model, the fair analog to the
    paper's (non-reasoning) Llama2/Mistral/Zephyr/GPT-3.5.
    """
    messages = [{"role": "user", "content": prompt}]
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "think": False,
        "options": {
            "temperature": 0,        # deterministic decoding (do_sample: False)
            "num_predict": max_tokens,  # direct.yaml: 512
            "num_ctx": 8192,         # fit largest prompts (~2.1k tok) + output; default 2048 truncates owid/weather
            "seed": 0,
            "stop": ["\n\n"],        # single-paragraph output
        },
    }
    r = requests.post(f"{host}/api/chat", json=payload, timeout=600)
    r.raise_for_status()
    content = r.json()["message"]["content"]
    return normalize(content, start_with)


def run_domain(domain, n, split, host, model, setup, model_label):
    out_dir = OUT_BASE / split / domain / "direct"
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / f"{model_label}.json"

    # resumability: skip if already complete
    if json_path.exists():
        existing = json.loads(json_path.read_text())
        if len(existing.get("generated", [])) >= n:
            logger.info(f"[{domain}] already has {len(existing['generated'])} >= {n}, skipping")
            return

    data = get_data(domain, split)[:n]
    outputs = {"dataset": domain, "model": model_label, "setup": setup, "generated": []}

    for i, data_input in enumerate(data):
        prompt, start_with = build_prompt(setup, domain, data_input)
        t0 = time.time()
        try:
            out = generate_one(host, model, prompt, start_with, setup["params"]["max_tokens"])
        except Exception as e:
            logger.error(f"[{domain}] {i+1}/{n} generation failed: {e}")
            out = ""
        dt = time.time() - t0
        logger.info(f"[{domain}] {i+1}/{n} ({dt:.1f}s): {out[:120]}")
        outputs["generated"].append({
            "in": prompt,
            "out": out,
            "tokens": {"in_words": len(prompt.split()), "out_words": len(out.split())},
        })

    json_path.write_text(json.dumps(outputs, indent=4, ensure_ascii=False))
    with open(out_dir / f"{model_label}.out", "w") as f:
        for g in outputs["generated"]:
            f.write(g["out"].replace("\r", "").replace("\n", "\\n") + "\n")
    logger.info(f"[{domain}] wrote {len(outputs['generated'])} outputs -> {json_path}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--domains", nargs="+", default=DOMAINS)
    ap.add_argument("--n", type=int, default=20)
    ap.add_argument("--split", default="test", choices=["dev", "test"])
    ap.add_argument("--host", default="http://localhost:11434")
    ap.add_argument("--model", default="gemma4:12b", help="Ollama model tag")
    ap.add_argument("--label", default="gemma4", help="label used in output filenames")
    args = ap.parse_args()

    setup = load_setup()
    logger.info(f"Generating: model={args.model} n={args.n} split={args.split} domains={args.domains}")
    for domain in args.domains:
        run_domain(domain, args.n, args.split, args.host, args.model, setup, args.label)


if __name__ == "__main__":
    main()
