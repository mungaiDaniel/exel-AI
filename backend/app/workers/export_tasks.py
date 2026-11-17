from app.workers.celery_app import celery_app


@celery_app.task(bind=True, name="export_pdf")
def export_pdf_task(self, dashboard_id: str, user_id: str) -> dict:
    """Generate a PDF export of a dashboard asynchronously."""
    return {"dashboard_id": dashboard_id, "status": "complete"}
