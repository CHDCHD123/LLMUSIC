from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse

from backend.app.models.schemas import ScheduleRequest
from backend.app.services.artifact_utils import list_artifacts

router = APIRouter(prefix="/api/automation", tags=["automation"])


@router.get("/status")
def get_automation_status(request: Request) -> dict:
    request.app.state.auth_service.require_user(request)
    return request.app.state.automation_service.get_status()


@router.post("/run")
def run_automation(request: Request) -> dict:
    request.app.state.auth_service.require_user(request)
    return request.app.state.automation_service.start_pipeline_async(trigger="manual")


@router.post("/schedule")
def update_schedule(request: Request, payload: ScheduleRequest) -> dict:
    request.app.state.auth_service.require_user(request)
    return request.app.state.automation_service.update_schedule(payload.enabled, payload.time)


@router.get("/reports")
def list_reports(request: Request) -> dict:
    request.app.state.auth_service.require_user(request)
    settings = request.app.state.automation_service.settings
    reports = list_artifacts([settings.data_dir], "genie_report_*.txt", "genie_report_")
    items = []
    for timestamp, path in reversed(reports):
        items.append(
            {
                "name": path.name,
                "timestamp": timestamp.isoformat(),
                "path": str(path),
            }
        )
    return {"items": items}


@router.get("/reports/{report_name}", response_class=PlainTextResponse)
def get_report(request: Request, report_name: str) -> str:
    request.app.state.auth_service.require_user(request)
    settings = request.app.state.automation_service.settings
    safe_name = Path(report_name).name
    path = settings.data_dir / safe_name
    if path.name != safe_name or not path.exists() or not path.is_file() or not safe_name.startswith("genie_report_"):
        raise HTTPException(status_code=404, detail="리포트를 찾을 수 없습니다.")
    for encoding in ("utf-8-sig", "utf-8"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    raise HTTPException(status_code=500, detail="리포트 인코딩을 읽을 수 없습니다.")
