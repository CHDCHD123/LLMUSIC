from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


@dataclass(slots=True)
class Settings:
    project_root: Path = Path(__file__).resolve().parents[3]
    backend_root: Path = Path(__file__).resolve().parents[2]
    storage_dir: Path = backend_root / "storage"
    data_dir: Path = project_root / "data"
    archive_dir: Path = project_root / "delfile" / "data_archive"
    frontend_dir: Path = project_root / "frontend"
    frontend_dist_dir: Path = frontend_dir / "dist"
    model_dir: Path = project_root / "model" / "EXAONE-3.5-2.4B-Instruct"
    hf_cache_dir: Path = Path.home() / ".cache" / "huggingface" / "hub"
    timezone: str = "Asia/Seoul"
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    lastfm_api_key: str = os.getenv("LASTFM_API_KEY", "")
    local_llm_model_id: str = os.getenv(
        "LOCAL_LLM_MODEL_ID",
        "LGAI-EXAONE/EXAONE-3.5-2.4B-Instruct",
    )
    cors_origins: list[str] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.archive_dir.mkdir(parents=True, exist_ok=True)
        self.cors_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]


settings = Settings()
