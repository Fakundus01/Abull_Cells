from __future__ import annotations

import os
from datetime import datetime

from flask import Flask, jsonify, request
import win32print # type: ignore


app = Flask(__name__)


def _is_authorized() -> bool:
    token = os.getenv("PRINT_SERVICE_TOKEN", "").strip()
    if not token:
        return True
    auth_header = request.headers.get("Authorization", "")
    return auth_header == f"Bearer {token}"


def _get_printer_name() -> str:
    configured = os.getenv("PRINTER_NAME", "").strip()
    return configured or win32print.GetDefaultPrinter()


def _build_ticket_bytes(body: str) -> bytes:
    encoding = os.getenv("PRINT_ENCODING", "cp437")
    lines = body.rstrip() + "\n\n"
    cut = os.getenv("PRINT_CUT", "1").strip().lower() in {"1", "true", "yes", "on"}
    if cut:
        lines += "\x1dV\x00"
    return lines.encode(encoding, errors="replace")


def _print_raw(body: str, doc_name: str) -> None:
    printer_name = _get_printer_name()
    handle = win32print.OpenPrinter(printer_name)
    try:
        win32print.StartDocPrinter(handle, 1, (doc_name, None, "RAW"))
        win32print.StartPagePrinter(handle)
        win32print.WritePrinter(handle, _build_ticket_bytes(body))
        win32print.EndPagePrinter(handle)
        win32print.EndDocPrinter(handle)
    finally:
        win32print.ClosePrinter(handle)


@app.get("/health")
def health() -> tuple[dict, int]:
    return {"status": "ok"}, 200


@app.post("/print")
def print_ticket() -> tuple[dict, int]:
    if not _is_authorized():
        return {"msg": "Unauthorized"}, 401

    payload = request.get_json(silent=True) or {}
    body = (payload.get("body") or "").strip()
    if not body:
        return {"msg": "Missing body"}, 400

    order_id = payload.get("order_id")
    reason = payload.get("reason", "ticket")
    stamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    doc_name = f"AbulCell-{reason}-{order_id or 'na'}-{stamp}"

    try:
        _print_raw(body, doc_name)
    except Exception as exc:
        return {"msg": f"Print failed: {exc!r}"}, 500

    return {"status": "printed", "printer": _get_printer_name()}, 200


if __name__ == "__main__":
    port = int(os.getenv("PRINT_SERVICE_PORT", "9001"))
    app.run(host="0.0.0.0", port=port)