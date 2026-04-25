from pathlib import Path

from huggingface_hub import snapshot_download


MODEL_ID = "LGAI-EXAONE/EXAONE-3.5-2.4B-Instruct"
LOCAL_DIR = Path(__file__).resolve().parents[1] / "model" / "EXAONE-3.5-2.4B-Instruct"


def main():
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_download(
        repo_id=MODEL_ID,
        local_dir=str(LOCAL_DIR),
        local_dir_use_symlinks=False,
        resume_download=True,
    )
    print(f"다운로드 완료: {LOCAL_DIR}")


if __name__ == "__main__":
    main()
