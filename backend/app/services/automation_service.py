from __future__ import annotations

import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.app.core.config import Settings
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
            "last_started_at": None,
            "last_finished_at": None,
            "last_result": None,
            "last_error": None,
            "last_skip_reason": None,
            "last_outputs": {},
            "schedule_enabled": False,
            "schedule_time": "17:00",
        }
        self._load_state()

    def start(self) -> None:
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
            self._save_state()
            return self.get_status()

    def _already_succeeded_today(self) -> bool:
        finished_at = self.state.get("last_finished_at")
        last_result = self.state.get("last_result") or ""
        if not finished_at or "success" not in last_result:
            return False
        try:
            finished_date = datetime.fromisoformat(finished_at).astimezone(ZoneInfo(self.settings.timezone)).date()
        except ValueError:
            return False
        today = datetime.now(ZoneInfo(self.settings.timezone)).date()
        return finished_date == today

    def start_pipeline_async(self, trigger: str = "manual") -> dict[str, Any]:
        with self.lock:
            if self.state["running"]:
                return self.get_status()
            if self._already_succeeded_today():
                self.state["last_result"] = f"{trigger} skipped"
                self.state["last_skip_reason"] = "오늘은 이미 성공적으로 한 번 실행되었습니다."
                self._save_state()
                return self.get_status()
            self.state["running"] = True
            self.state["last_started_at"] = datetime.now(ZoneInfo(self.settings.timezone)).isoformat()
            self.state["last_result"] = f"{trigger} started"
            self.state["last_error"] = None
            self.state["last_skip_reason"] = None
            self._save_state()

        thread = threading.Thread(target=self._run_pipeline_sync, args=(trigger,), daemon=True)
        thread.start()
        return self.get_status()

    def _run_pipeline_sync(self, trigger: str = "scheduler") -> None:
        with self.lock:
            if self._already_succeeded_today():
                self.state["running"] = False
                self.state["last_result"] = f"{trigger} skipped"
                self.state["last_skip_reason"] = "오늘은 이미 성공적으로 한 번 실행되었습니다."
                self._save_state()
                return
        try:
            crawl_path = run_crawler(self.settings.data_dir)
            diff_path, brief_path = run_diff_analysis(self.settings.data_dir, self.settings.data_dir)
            report_path = generate_report(self.settings, self.settings.data_dir, self.settings.data_dir)
            with self.lock:
                self.state["last_outputs"] = {
                    "crawl": str(crawl_path),
                    "diff": str(diff_path),
                    "brief": str(brief_path),
                    "report": str(report_path),
                }
                self.state["last_result"] = f"{trigger} success"
                self.state["last_error"] = None
                self.state["last_skip_reason"] = None
        except Exception as exc:
            with self.lock:
                self.state["last_result"] = f"{trigger} failed"
                self.state["last_error"] = f"{type(exc).__name__}: {exc}"
                self.state["last_skip_reason"] = None
        finally:
            with self.lock:
                self.state["running"] = False
                self.state["last_finished_at"] = datetime.now(ZoneInfo(self.settings.timezone)).isoformat()
                self._save_state()

    def get_status(self) -> dict[str, Any]:
        next_run = None
        job = self.scheduler.get_job("daily_genie_pipeline")
        if job and job.next_run_time:
            next_run = job.next_run_time.isoformat()
        return {**self.state, "next_run_at": next_run, "timezone": self.settings.timezone}
