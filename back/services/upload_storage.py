from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from typing import Iterable

from flask import current_app
from werkzeug.utils import secure_filename


@dataclass
class StoredAttachment:
    local_path: str
    filename: str
    mime_type: str
    remote_url: str | None = None


class UploadStorage:
    def __init__(
        self,
        backend: str,
        temp_dir: str,
        bucket: str,
        prefix: str,
        public_base_url: str,
    ) -> None:
        self.backend = backend
        self.temp_dir = temp_dir
        self.bucket = bucket
        self.prefix = prefix
        self.public_base_url = public_base_url

    @classmethod
    def from_app(cls) -> "UploadStorage":
        return cls(
            backend=current_app.config.get("UPLOAD_STORAGE_BACKEND", "local"),
            temp_dir=current_app.config.get("UPLOAD_TEMP_DIR", "/tmp/abul_cells_uploads"),
            bucket=current_app.config.get("UPLOAD_BUCKET", ""),
            prefix=current_app.config.get("UPLOAD_PREFIX", "contact-uploads/"),
            public_base_url=current_app.config.get("UPLOAD_PUBLIC_BASE_URL", ""),
        )

    def save(self, files: Iterable) -> list[StoredAttachment]:
        os.makedirs(self.temp_dir, exist_ok=True)
        stored: list[StoredAttachment] = []
        for file in files:
            if not file or not file.filename:
                continue
            filename = secure_filename(file.filename)
            if not filename:
                continue
            unique_name = f"{uuid.uuid4().hex}_{filename}"
            final_path = os.path.join(self.temp_dir, unique_name)
            file.save(final_path)
            stored.append(
                StoredAttachment(
                    local_path=final_path,
                    filename=filename,
                    mime_type=(file.mimetype or "application/octet-stream"),
                )
            )

        if stored and self.backend == "s3":
            self._upload_to_s3(stored)

        return stored

    def cleanup(self, stored: Iterable[StoredAttachment]) -> None:
        for item in stored:
            if not item.local_path:
                continue
            if os.path.exists(item.local_path):
                os.remove(item.local_path)

    def _upload_to_s3(self, stored: list[StoredAttachment]) -> None:
        if not self.bucket:
            raise ValueError("UPLOAD_BUCKET requerido para backend s3")

        import boto3  # type: ignore

        s3 = boto3.client("s3")
        for item in stored:
            key = f"{self.prefix}{item.filename}"
            s3.upload_file(
                item.local_path,
                self.bucket,
                key,
                ExtraArgs={"ContentType": item.mime_type},
            )
            if self.public_base_url:
                item.remote_url = f"{self.public_base_url.rstrip('/')}/{key}"
            else:
                item.remote_url = f"s3://{self.bucket}/{key}"