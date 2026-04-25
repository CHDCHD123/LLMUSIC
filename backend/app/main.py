from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes.automation import router as automation_router
from backend.app.api.routes.health import router as health_router
from backend.app.api.routes.music import router as music_router
from backend.app.core.config import settings
from backend.app.services.automation_service import AutomationService
from backend.app.services.llm_service import LLMService
from backend.app.services.recommendation_service import RecommendationService


@asynccontextmanager
async def lifespan(app: FastAPI):
    llm_service = LLMService(settings)
    recommendation_service = RecommendationService(settings, llm_service)
    automation_service = AutomationService(settings)
    automation_service.start()

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
app.include_router(music_router)
app.include_router(automation_router)

