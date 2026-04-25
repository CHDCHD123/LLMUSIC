from __future__ import annotations

from pathlib import Path
from typing import Optional

import torch
from openai import OpenAI

from backend.app.core.config import Settings

try:
    from transformers import AutoModelForCausalLM, AutoTokenizer

    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False


class LLMService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._tokenizer = None
        self._model = None

    def status(self, probe: bool = False) -> dict:
        openai_status = {
            "status": "연결됨" if self.settings.openai_api_key else "미연결",
            "api_key_configured": bool(self.settings.openai_api_key),
            "model": self.settings.openai_model,
            "live_check_enabled": probe,
            "live_ok": None,
            "live_error": None,
        }
        if probe and self.settings.openai_api_key:
            try:
                client = OpenAI(api_key=self.settings.openai_api_key)
                response = client.chat.completions.create(
                    model=self.settings.openai_model,
                    messages=[{"role": "user", "content": "ping"}],
                    max_tokens=8,
                )
                text = response.choices[0].message.content or ""
                openai_status["live_ok"] = bool(text.strip())
                if not openai_status["live_ok"]:
                    openai_status["status"] = "미연결"
                    openai_status["live_error"] = "빈 응답"
            except Exception as exc:
                openai_status["status"] = "미연결"
                openai_status["live_ok"] = False
                openai_status["live_error"] = f"{type(exc).__name__}: {exc}"

        cached_models = []
        if self.settings.hf_cache_dir.exists():
            cached_models = sorted(
                item.name.replace("models--", "").replace("--", "/")
                for item in self.settings.hf_cache_dir.iterdir()
                if item.is_dir() and item.name.startswith("models--")
            )

        return {
            "openai": openai_status,
            "local_models": {
                "status": "준비됨" if self.settings.model_dir.exists() else "미준비",
                "enabled": True,
                "model_id": self.settings.local_llm_model_id,
                "model_dir": str(self.settings.model_dir),
                "cache_dir": str(self.settings.hf_cache_dir),
                "cached_models": cached_models,
            },
        }

    def generate(self, user_input: str, songs_text: str, engine_mode: str = "auto") -> tuple[str, str]:
        chains = {
            "auto": ["openai", "local", "template"],
            "openai": ["openai", "local", "template"],
            "local": ["local", "template"],
            "template": ["template"],
        }

        for engine in chains.get(engine_mode, chains["auto"]):
            if engine == "openai":
                text = self._generate_openai(user_input, songs_text)
                if text:
                    return text, self.settings.openai_model
            elif engine == "local":
                text = self._generate_local(user_input, songs_text)
                if text:
                    return text, f"local:{self.settings.local_llm_model_id}"
            else:
                return self._generate_template(user_input, songs_text), "template-fallback"

        return self._generate_template(user_input, songs_text), "template-fallback"

    def _generate_openai(self, user_input: str, songs_text: str) -> Optional[str]:
        if not self.settings.openai_api_key:
            return None
        try:
            client = OpenAI(api_key=self.settings.openai_api_key)
            response = client.chat.completions.create(
                model=self.settings.openai_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "당신은 음악 큐레이터입니다. 사용자의 감정과 상황에 맞춰 추천 곡이 왜 어울리는지 "
                            "한국어로 3~4문장으로 설명하세요. 첫 문장은 전체 추천 방향, 다음 문장들은 왜 이 곡들이 맞는지 "
                            "리듬, 분위기, 상황 적합성 관점에서 구체적으로 설명하세요."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"상황: {user_input}\n추천곡: {songs_text}\n3~4문장으로 구체적으로 설명하세요.",
                    },
                ],
                temperature=0.7,
                max_tokens=220,
            )
            text = response.choices[0].message.content or ""
            return text.strip() or None
        except Exception:
            return None

    def _load_local_model(self) -> bool:
        if self._model is not None and self._tokenizer is not None:
            return True
        if not TRANSFORMERS_AVAILABLE or not self.settings.model_dir.exists():
            return False
        try:
            self._tokenizer = AutoTokenizer.from_pretrained(str(self.settings.model_dir), trust_remote_code=True)
            model_kwargs = {"trust_remote_code": True}
            if torch.cuda.is_available():
                model_kwargs["torch_dtype"] = torch.bfloat16
            self._model = AutoModelForCausalLM.from_pretrained(str(self.settings.model_dir), **model_kwargs)
            if torch.cuda.is_available():
                self._model = self._model.to("cuda:0")
            return True
        except Exception:
            self._model = None
            self._tokenizer = None
            return False

    def _generate_local(self, user_input: str, songs_text: str) -> Optional[str]:
        if not self._load_local_model():
            return None
        try:
            messages = [
                {
                    "role": "system",
                        "content": (
                            "당신은 음악 큐레이터입니다. 사용자의 감정과 상황, 곡 분위기를 연결해서 "
                            "한국어로 3~4문장으로 설명하세요."
                        ),
                },
                {
                    "role": "user",
                    "content": f"상황: {user_input}\n추천곡: {songs_text}\n3~4문장으로 자연스럽게 설명하세요.",
                },
            ]
            prompt = self._tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
            model_inputs = self._tokenizer([prompt], return_tensors="pt")
            if self._model.device.type == "cuda":
                model_inputs = {key: value.to(self._model.device) for key, value in model_inputs.items()}
            output = self._model.generate(**model_inputs, max_new_tokens=120, do_sample=False)
            generated_ids = [
                output_ids[len(input_ids):]
                for input_ids, output_ids in zip(model_inputs["input_ids"], output)
            ]
            text = self._tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
            return text or None
        except Exception:
            return None

    def _generate_template(self, user_input: str, songs_text: str) -> str:
        return (
            f"{user_input} 분위기에서는 {songs_text} 같은 곡이 감정선과 상황에 자연스럽게 맞습니다. "
            "선정된 곡들은 텐션과 질감이 한 방향으로 모이지 않도록 섞어서, 같은 무드 안에서도 지루하지 않게 이어지도록 골랐습니다. "
            "상황에 바로 얹기 좋은 곡과 감정을 조금 더 깊게 끌고 가는 곡을 함께 배치해 전체 흐름이 부드럽게 이어지도록 맞췄습니다."
        )
