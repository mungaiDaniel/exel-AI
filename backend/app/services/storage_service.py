import io
from pathlib import Path
from minio import Minio
from minio.error import S3Error
from config import settings


class StorageService:
    def __init__(self):
        self.backend = settings.STORAGE_BACKEND.lower()
        self.local_root = Path(settings.LOCAL_STORAGE_DIR)
        self.client = None

        if self.backend == "minio":
            self.client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE,
            )
            self._ensure_bucket()
        else:
            self.local_root.mkdir(parents=True, exist_ok=True)

    def _ensure_bucket(self) -> None:
        try:
            if not self.client.bucket_exists(settings.MINIO_BUCKET):
                self.client.make_bucket(settings.MINIO_BUCKET)
        except Exception:
            pass

    def upload(self, object_name: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        if self.backend != "minio":
            path = self.local_root / object_name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            return str(path.as_posix())

        self.client.put_object(
            settings.MINIO_BUCKET,
            object_name,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return f"{settings.MINIO_ENDPOINT}/{settings.MINIO_BUCKET}/{object_name}"

    def download(self, object_name: str) -> bytes:
        if self.backend != "minio":
            return (self.local_root / object_name).read_bytes()

        response = self.client.get_object(settings.MINIO_BUCKET, object_name)
        return response.read()

    def delete(self, object_name: str) -> None:
        if not object_name:
            return

        if self.backend != "minio":
            path = self.local_root / object_name
            if path.exists():
                path.unlink()
            return

        try:
            self.client.remove_object(settings.MINIO_BUCKET, object_name)
        except S3Error:
            pass

    def get_presigned_url(self, object_name: str, expires_seconds: int = 3600) -> str:
        if self.backend != "minio":
            return str((self.local_root / object_name).as_posix())

        from datetime import timedelta
        return self.client.presigned_get_object(
            settings.MINIO_BUCKET, object_name, expires=timedelta(seconds=expires_seconds)
        )
