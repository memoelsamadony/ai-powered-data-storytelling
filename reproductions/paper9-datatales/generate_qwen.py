#!/usr/bin/env python3
"""Generate market reports with qwen3.5:4b (zero-shot, thinking off) via Ollama.

Uses DataTales' own task instruction (prompts/data2text_generation_task_instruction.txt):
analyze the historical market data + follow the provided report example.
"""
import argparse
import json
import time
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
HOST = "http://localhost:11434"

INSTRUCTION = ("Please act as an expert financial market analyst. Please generate a market report:\n"
               "1. by analyzing the historical market data provided.\n"
               "2. following the market report example provided.")


def build_prompt(item, example):
    return (f"{INSTRUCTION}\n\n"
            f"Historical market data (most recent two trading sessions per index/stock):\n"
            f"```\n{item['table']}\n```\n\n"
            f"Market report example (for style and length only — do not reuse its facts):\n"
            f"```\n{example}\n```\n\n"
            f"Now write the market report for {item['date']}. Report only facts derivable "
            f"from the data above. Output a single concise paragraph.")


def generate(model, prompt, num_predict):
    payload = {"model": model, "messages": [{"role": "user", "content": prompt}],
               "stream": False, "think": False,
               "options": {"temperature": 0, "num_predict": num_predict,
                           "num_ctx": 8192, "seed": 0}}
    r = requests.post(f"{HOST}/api/chat", json=payload, timeout=600)
    r.raise_for_status()
    return r.json()["message"]["content"].strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="qwen3.5:4b")
    ap.add_argument("--label", default="qwen3")
    ap.add_argument("--inputs", default=str(HERE / "eval_inputs.json"))
    ap.add_argument("--out", default=str(HERE / "generations.json"))
    ap.add_argument("--num-predict", type=int, default=400)
    args = ap.parse_args()

    data = json.loads(Path(args.inputs).read_text())
    example, items = data["example_report"], data["items"]
    gens = []
    for i, item in enumerate(items):
        prompt = build_prompt(item, example)
        t = time.time()
        try:
            text = generate(args.model, prompt, args.num_predict)
        except Exception as e:
            print(f"[{item['id']}] failed: {e}"); text = ""
        dt = time.time() - t
        print(f"{i+1}/{len(items)} {item['id']} ({dt:.1f}s): {text[:90]}")
        gens.append({"id": item["id"], "date": item["date"], "table": item["table"],
                     "generated": text, "gold": item["gold"], "model": args.model})
    Path(args.out).write_text(json.dumps(gens, ensure_ascii=False, indent=2))
    print(f"\nwrote {len(gens)} generations -> {args.out}")


if __name__ == "__main__":
    main()
