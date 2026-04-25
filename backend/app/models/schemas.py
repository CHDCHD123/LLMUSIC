from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class RecommendRequest(BaseModel):
    emotion: str = Field(..., min_length=1)
    situation: str = ""
    korean_only: bool = False


class RecommendationItem(BaseModel):
    title: str
    artist: str
    album: str | None = None
    spotify_url: str | None = None
    preview_url: str | None = None
    popularity: int | None = None
    lastfm_url: str | None = None
    rank: int | None = None
    source: str


class RecommendResponse(BaseModel):
    recommendations: list[RecommendationItem]
    explanation: str
    model_used: str


class ScheduleRequest(BaseModel):
    enabled: bool
    time: str | None = None


class StatusResponse(BaseModel):
    status: dict[str, Any]

