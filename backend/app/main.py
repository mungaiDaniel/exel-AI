"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine
from app.core.exceptions import AppError, app_error_handler
from app.models.base import Base

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # In development, create tables automatically. Production uses `alembic upgrade head`.
    if settings.DEBUG:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Never leak stack traces or internals to clients."""
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [{"field": ".".join(str(p) for p in e["loc"] if p != "body"), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": "Validation failed", "errors": errors})


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME + " API",
        version="1.0.0",
        description="Upload Excel/CSV workbooks, explore them, and get AI-powered insights.",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        lifespan=lifespan,
    )

    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health", tags=["meta"])
    async def health_check():
        return {"status": "ok", "version": app.version}

    return app


app = create_app()
