from __future__ import annotations

import os
import re

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity # type: ignore

from email_utils import send_contact_autoreply, send_contact_message_to_admin
from models import User
from services.upload_storage import UploadStorage


def _total_upload_size(file_list):
    total = 0
    for file in file_list:
        pos = file.stream.tell()
        file.stream.seek(0, os.SEEK_END)
        total += file.stream.tell()
        file.stream.seek(pos)
    return total


def contact():
    user = None
    user_id = get_jwt_identity()
    if user_id:
        user = User.query.get(int(user_id))

    is_multipart = request.content_type and "multipart/form-data" in request.content_type

    if is_multipart:
        name = (request.form.get("name") or (user.name if user else "") or "").strip()
        email = (request.form.get("email") or (user.email if user else "") or "").strip().lower()
        subject = (request.form.get("subject") or "").strip()
        message = (request.form.get("message") or "").strip()
        files = request.files.getlist("files")
    else:
        data = request.get_json() or {}
        name = (data.get("name") or (user.name if user else "") or "").strip()
        email = (data.get("email") or (user.email if user else "") or "").strip().lower()
        subject = (data.get("subject") or "").strip()
        message = (data.get("message") or "").strip()
        files = []

    email_re = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    if not name:
        return jsonify({"msg": "El nombre es obligatorio"}), 400
    if not email or not email_re.match(email):
        return jsonify({"msg": "Email inválido"}), 400
    if not subject:
        return jsonify({"msg": "El asunto es obligatorio"}), 400
    if not message or len(message) < 10:
        return jsonify({"msg": "El mensaje debe tener al menos 10 caracteres"}), 400

    saved_files = []
    stored_attachments = []
    attachment_links = []
    if files:
        total = _total_upload_size(files)
        max_upload_mb = current_app.config.get("MAX_UPLOAD_MB", 8)
        max_bytes = max_upload_mb * 1024 * 1024
        if total > max_bytes:
            return jsonify({"msg": f"Adjuntos demasiado grandes (max {max_upload_mb}MB)"}), 400

        allowed_mime = current_app.config.get(
            "ALLOWED_MIME",
            {"image/jpeg", "image/png", "image/webp", "application/pdf"},
        )

        for file in files:
            if not file or not file.filename:
                continue
            mt = (file.mimetype or "").lower()
            if mt not in allowed_mime:
                return jsonify({"msg": "Tipo de archivo no permitido (solo imágenes o PDF)"}), 400

        storage = UploadStorage.from_app()
        stored_attachments = storage.save(files)
        saved_files = [item.local_path for item in stored_attachments]
        attachment_links = [item.remote_url for item in stored_attachments if item.remote_url]

    ok_admin = send_contact_message_to_admin(
        name,
        email,
        subject,
        message,
        attachments=saved_files,
        attachment_links=attachment_links,
    )
    if not ok_admin:
        if stored_attachments:
            storage.cleanup(stored_attachments)
        return jsonify({"msg": "No se pudo enviar el mensaje (config mail)"}), 500

    try:
        send_contact_autoreply(email, name)
    except Exception as exc:
        current_app.logger.exception(f"[MAIL] Error autoreply contacto: {exc!r}")
    finally:
        if stored_attachments:
            storage.cleanup(stored_attachments)

    return jsonify({"ok": True}), 200