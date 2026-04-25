from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.automation import router as automation_router
from backend.app.api.routes.health import router as health_router
from backend.app.api.routes.music import router as music_router
from backend.app.services.auth_service import AuthService
from backend.app.core.config import settings
from backend.app.services.automation_service import AutomationService
from backend.app.services.llm_service import LLMService
from backend.app.services.recommendation_service import RecommendationService


@asynccontextmanager
async def lifespan(app: FastAPI):
    auth_service = AuthService(settings)
    llm_service = LLMService(settings)
    recommendation_service = RecommendationService(settings, llm_service)
    automation_service = AutomationService(settings)
    automation_service.start()

    app.state.auth_service = auth_service
    app.state.llm_service = llm_service
    app.state.recommendation_service = recommendation_service
    app.state.automation_service = automation_service
    yield
    automation_service.shutdown()


app = FastAPI(title="LLMUSIC", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(music_router)
app.include_router(automation_router)


def _frontend_index_path() -> Path:
    return settings.frontend_dist_dir / "index.html"


def _serve_frontend_path(path: str = "") -> FileResponse:
    index_path = _frontend_index_path()
    if not index_path.exists():
        raise HTTPException(status_code=503, detail="frontend/dist가 없습니다. 먼저 frontend 빌드를 실행해야 합니다.")

    requested = (settings.frontend_dist_dir / path).resolve()
    try:
        requested.relative_to(settings.frontend_dist_dir.resolve())
    except ValueError:
        return FileResponse(index_path)

    if path and requested.exists() and requested.is_file():
        return FileResponse(requested)
    return FileResponse(index_path)


if settings.frontend_dist_dir.exists():
    assets_dir = settings.frontend_dist_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")
images_dir = settings.project_root / "images"
if images_dir.exists():
    app.mount("/images", StaticFiles(directory=images_dir), name="project-images")


@app.get("/", include_in_schema=False)
def serve_frontend_index():
    return _serve_frontend_path()


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend_app(full_path: str):
    if full_path.startswith(("api/", "health", "docs", "redoc", "openapi.json", "assets/", "images/")):
        raise HTTPException(status_code=404, detail="Not found")
    return _serve_frontend_path(full_path)
