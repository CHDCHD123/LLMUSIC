from fastapi import APIRouter, HTTPException, Request

from backend.app.models.schemas import RecommendRequest, RecommendResponse

router = APIRouter(prefix="/api", tags=["music"])


@router.get("/status")
def get_status(request: Request, probe: bool = False) -> dict:
    recommendation_service = request.app.state.recommendation_service
    return recommendation_service.source_status(probe_llm=probe)


@router.post("/recommend", response_model=RecommendResponse)
def recommend(request: Request, payload: RecommendRequest) -> RecommendResponse:
    recommendation_service = request.app.state.recommendation_service
    try:
        recommendations, explanation, model_used = recommendation_service.recommend(
            payload.emotion, payload.situation, payload.korean_only, payload.variation, payload.engine_mode
        )
        return RecommendResponse(
            recommendations=recommendations,
            explanation=explanation,
            model_used=model_used,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}") from exc
