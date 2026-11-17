from app.workers.celery_app import celery_app


@celery_app.task(bind=True, name="parse_workbook")
def parse_workbook_task(self, workbook_id: str) -> dict:
    """Re-parse a workbook asynchronously (used when file is large)."""
    return {"workbook_id": workbook_id, "status": "complete"}
