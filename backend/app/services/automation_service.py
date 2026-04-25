from __future__ import annotations

import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.app.core.config import Settings
from backend.app.services.artifact_utils import list_artifacts
from backend.app.services.crawler_service import run_crawler
from backend.app.services.diff_service import run_diff_analysis
from backend.app.services.report_service import generate_report


class AutomationService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.state_path = settings.storage_dir / "automation_state.json"
        self.lock = threading.Lock()
        self.scheduler = BackgroundScheduler(timezone=settings.timezone)
        self.state: dict[str, Any] = {
            "running": False,
            "current_step": "idle",
            "progress_label": "대기 중",
            "comparison_ready": False,
            "last_started_at": None,
            "last_finished_at": None,
            "last_result": None,
            "last_error": None,
            "last_outputs": {},
            "activity_log": [],
            "schedule_enabled": False,
            "schedule_time": "17:00",
        }
        self._load_state()

    def start(self) -> None:
        with self.lock:
            if self.state.get("running"):
                self.state["running"] = False
                self.state["current_step"] = "idle"
                self.state["progress_label"] = "서버 재시작으로 실행 상태 초기화"
                self._append_log("server", "서버 재시작으로 이전 실행 상태를 정리했습니다.")
                self._save_state()
        if not self.scheduler.running:
            self.scheduler.start()
        if self.state["schedule_enabled"]:
            self._apply_schedule(self.state["schedule_time"])

    def shutdown(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)

    def _load_state(self) -> None:
        if self.state_path.exists():
            try:
                with open(self.state_path, "r", encoding="utf-8") as file:
                    self.state.update(json.load(file))
            except Exception:
                pass

    def _save_state(self) -> None:
        with open(self.state_path, "w", encoding="utf-8") as file:
            json.dump(self.state, file, ensure_ascii=False, indent=2)

    def _append_log(self, step: str, message: str) -> None:
        logs = self.state.setdefault("activity_log", [])
        logs.append(
            {
                "time": datetime.now().astimezone().isoformat(),
                "step": step,
                "message": message,
            }
        )
        self.state["activity_log"] = logs[-25:]

    def _set_step(self, step: str, label: str, message: str | None = None) -> None:
        self.state["current_step"] = step
        self.state["progress_label"] = label
        if message:
            self._append_log(step, message)

    def _apply_schedule(self, time_text: str) -> None:
        hour_text, minute_text = time_text.split(":")
        trigger = CronTrigger(hour=int(hour_text), minute=int(minute_text), timezone=self.settings.timezone)
        if self.scheduler.get_job("daily_genie_pipeline"):
            self.scheduler.remove_job("daily_genie_pipeline")
        self.scheduler.add_job(self._run_pipeline_sync, trigger=trigger, id="daily_genie_pipeline", replace_existing=True)

    def update_schedule(self, enabled: bool, time_text: str | None) -> dict[str, Any]:
        with self.lock:
            self.state["schedule_enabled"] = enabled
            if time_text:
                self.state["schedule_time"] = time_text
            if self.scheduler.get_job("daily_genie_pipeline"):
                self.scheduler.remove_job("daily_genie_pipeline")
            if enabled:
                self._apply_schedule(self.state["schedule_time"])
                self._append_log("schedule", f"매일 {self.state['schedule_time']} 자동 실행을 설정했습니다.")
            else:
                self._append_log("schedule", "자동 실행을 비활성화했습니다.")
            self._save_state()
            return self.get_status()

    def _current_snapshot_count(self) -> int:
        return len(list_artifacts([self.settings.data_dir], "genie_top100_*.csv", "genie_top100_"))

    def start_pipeline_async(self, trigger: str = "manual") -> dict[str, Any]:
        with self.lock:
            if self.state["running"]:
                return self.get_status()
            self.state["running"] = True
            self.state["last_started_at"] = datetime.now().astimezone().isoformat()
            self.state["last_result"] = f"{trigger} started"
            self.state["last_error"] = None
            self.state["last_outputs"] = {}
            self._set_step("queued", "실행 준비 중", f"{trigger} 실행 요청을 받았습니다.")
            self._save_state()

        thread = threading.Thread(target=self._run_pipeline_sync, args=(trigger,), daemon=True)
        thread.start()
        return self.get_status()

    def _run_pipeline_sync(self, trigger: str = "scheduler") -> None:
        try:
            with self.lock:
                self._set_step("crawl", "지니 차트 수집 중", "지니 차트 크롤링을 시작합니다.")
                self._save_state()

            crawl_path = run_crawler(self.settings.data_dir)

            with self.lock:
                self.state["last_outputs"]["crawl"] = str(crawl_path)
                snapshot_count = self._current_snapshot_count()
                self.state["comparison_ready"] = snapshot_count >= 2
                self._append_log("crawl", f"차트 수집 완료: {Path(crawl_path).name}")
                self._save_state()

            if snapshot_count < 2:
                with self.lock:
                    self._set_step(
                        "baseline",
                        "비교용 기준 데이터 대기",
                        "첫 스냅샷만 있어서 이번 실행은 비교 분석 없이 기준 데이터만 저장했습니다.",
                    )
                    self.state["last_result"] = f"{trigger} baseline saved"
                    self.state["last_error"] = None
                    self.state["running"] = False
                    self.state["last_finished_at"] = datetime.now().astimezone().isoformat()
                    self._save_state()
                return

            with self.lock:
                self._set_step("diff", "직전 스냅샷과 비교 분석 중", "직전 데이터와 비교 분석을 시작합니다.")
                self._save_state()

            diff_path, brief_path = run_diff_analysis(self.settings.data_dir, self.settings.data_dir)

            with self.lock:
                self.state["last_outputs"]["diff"] = str(diff_path)
                self.state["last_outputs"]["brief"] = str(brief_path)
                self._append_log("diff", f"비교 분석 완료: {Path(diff_path).name}")
                self._set_step("report", "리포트 생성 중", "OpenAI 리포트 생성을 시작합니다.")
                self._save_state()

            report_path = generate_report(self.settings, self.settings.data_dir, self.settings.data_dir)

            with self.lock:
                self.state["last_outputs"]["report"] = str(report_path)
                self.state["last_result"] = f"{trigger} success"
                self.state["last_error"] = None
                self._set_step("done", "실행 완료", f"리포트 생성 완료: {Path(report_path).name}")
        except Exception as exc:
            with self.lock:
                self.state["last_result"] = f"{trigger} failed"
                self.state["last_error"] = f"{type(exc).__name__}: {exc}"
                self._set_step("failed", "실행 실패", f"오류 발생: {type(exc).__name__}: {exc}")
        finally:
            with self.lock:
                self.state["running"] = False
                self.state["last_finished_at"] = datetime.now().astimezone().isoformat()
                self._save_state()

    def get_status(self) -> dict[str, Any]:
        next_run = None
        job = self.scheduler.get_job("daily_genie_pipeline")
        if job and job.next_run_time:
            next_run = job.next_run_time.isoformat()
        return {**self.state, "next_run_at": next_run, "timezone": self.settings.timezone}
