from celery import Celery
from config import settings

celery_app = Celery(
    "excelai",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.parse_tasks", "app.workers.export_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,
)
