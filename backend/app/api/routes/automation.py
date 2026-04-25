from fastapi import APIRouter, Request

from backend.app.models.schemas import ScheduleRequest

router = APIRouter(prefix="/api/automation", tags=["automation"])


@router.get("/status")
def get_automation_status(request: Request) -> dict:
    return request.app.state.automation_service.get_status()


@router.post("/run")
def run_automation(request: Request) -> dict:
    return request.app.state.automation_service.start_pipeline_async(trigger="manual")


@router.post("/schedule")
def update_schedule(request: Request, payload: ScheduleRequest) -> dict:
    return request.app.state.automation_service.update_schedule(payload.enabled, payload.time)

