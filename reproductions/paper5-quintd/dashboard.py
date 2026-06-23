#!/usr/bin/env python3
"""Reproduction dashboard — stdlib HTTP server (no external deps).

Serves the editorial fact-checker dashboard and three JSON APIs:
  GET  /                      -> dashboard.html
  GET  /api/summary           -> scoreboard (gemma4 vs Zephyr, same 20/domain)
  GET  /api/example?domain=&idx=  -> one example (data + both stories + error spans)
  POST /api/run               -> {domain, idx}: run gemma4:12b LIVE via Ollama

Run:  python3 dashboard.py     then open http://localhost:8000
"""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import dashboard_data as dd
from quintd_data import get_data
from generate_ollama import load_setup, build_prompt, generate_one

HERE = Path(__file__).resolve().parent
HTML = HERE / "dashboard.html"
OLLAMA_HOST = "http://localhost:11434"
MODELS = {"gemma4": "gemma4:12b", "zephyr": "zephyr", "qwen3": "qwen3.5:4b"}  # key -> Ollama tag
SETUP = load_setup()


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body)
        data = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype + ("; charset=utf-8" if "json" in ctype or "html" in ctype else ""))
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass  # quiet

    def do_GET(self):
        u = urlparse(self.path)
        if u.path in ("/", "/index.html"):
            self._send(200, HTML.read_text(), "text/html")
        elif u.path == "/api/summary":
            self._send(200, dd.summary())
        elif u.path == "/api/example":
            q = parse_qs(u.query)
            domain = q.get("domain", ["ice_hockey"])[0]
            idx = int(q.get("idx", ["0"])[0])
            self._send(200, dd.example(domain, idx))
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        u = urlparse(self.path)
        if u.path != "/api/run":
            self._send(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length", 0))
        req = json.loads(self.rfile.read(length) or "{}")
        domain, idx = req.get("domain", "ice_hockey"), int(req.get("idx", 0))
        tag = MODELS.get(req.get("model", "gemma4"))
        if not tag:
            self._send(400, {"error": "unknown model"})
            return
        try:
            data_input = get_data(domain, "test")[idx]
            prompt, start_with = build_prompt(SETUP, domain, data_input)
            text = generate_one(OLLAMA_HOST, tag, prompt, start_with,
                                SETUP["params"]["max_tokens"])
            self._send(200, {"text": text, "model": tag})
        except Exception as e:
            self._send(500, {"error": str(e)})


def main(port=8000):
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Dashboard running at http://localhost:{port}  (Ctrl-C to stop)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.shutdown()


if __name__ == "__main__":
    import sys
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 8000)
