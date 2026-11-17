from fastapi import APIRouter

from app.api.v1 import anomalies, auth, charts, chat, dashboards, export, formulas, search, sheets, workbooks

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(workbooks.router, prefix="/workbooks", tags=["workbooks"])
api_router.include_router(sheets.router, prefix="/sheets", tags=["sheets"])
api_router.include_router(formulas.router, prefix="/formulas", tags=["formulas"])
api_router.include_router(charts.router, prefix="/charts", tags=["charts"])
api_router.include_router(dashboards.router, prefix="/dashboards", tags=["dashboards"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(anomalies.router, prefix="/anomalies", tags=["anomalies"])
