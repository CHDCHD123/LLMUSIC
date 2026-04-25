import { FormEvent, useEffect, useState } from "react";

import StatusPanel from "../components/StatusPanel";
import { fetchStatus, recommend } from "../services/api";

const emotions = ["행복", "슬픔", "화남", "평온", "신남", "그리움", "집중", "운동", "휴식", "로맨틱"];

type Props = {
  initialStatus?: any;
  onStatusRefresh?: () => void;
};

export default function RecommendPage({ initialStatus, onStatusRefresh }: Props) {
  const [emotion, setEmotion] = useState("행복");
  const [situation, setSituation] = useState("");
  const [koreanOnly, setKoreanOnly] = useState(false);
  const [status, setStatus] = useState<any>(initialStatus ?? null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialStatus) {
      fetchStatus(true).then(setStatus).catch((err) => setError(err.message));
    }
  }, [initialStatus]);

  useEffect(() => {
    if (initialStatus) {
      setStatus(initialStatus);
    }
  }, [initialStatus]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await recommend({
        emotion,
        situation,
        korean_only: koreanOnly,
      });
      setResult(response);
      const nextStatus = await fetchStatus(false);
      setStatus(nextStatus);
      onStatusRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "추천 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-grid">
      <section className="hero panel">
        <p className="eyebrow">LLMUSIC</p>
        <h1>감정 기반 음악 추천</h1>
        <p className="lead">
          OpenAI 우선, 로컬 모델 fallback, 지니 차트 백업까지 포함한 추천 흐름으로 재구성했습니다.
        </p>
      </section>

      {status ? (
        <StatusPanel
          title="연결 상태"
          items={[
            { label: "iTunes Search", value: status.itunes.status, meta: status.itunes.note },
            { label: "MusicBrainz", value: status.musicbrainz.status, meta: status.musicbrainz.note },
            { label: "Last.fm", value: status.lastfm.status },
            { label: "Spotify", value: status.spotify.status, meta: status.spotify.note },
            {
              label: "OpenAI",
              value: status.openai.status,
              meta: status.openai.live_error ?? status.openai.model,
            },
            {
              label: "로컬 모델",
              value: status.local_models.status,
              meta: status.local_models.model_id,
            },
          ]}
        />
      ) : null}

      <section className="panel">
        <h2>추천 요청</h2>
        <form className="recommend-form" onSubmit={handleSubmit}>
          <div className="emotion-list">
            {emotions.map((item) => (
              <button
                type="button"
                key={item}
                className={item === emotion ? "chip active" : "chip"}
                onClick={() => setEmotion(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="field">
            <span>상황</span>
            <input
              value={situation}
              onChange={(event) => setSituation(event.target.value)}
              placeholder="예: 비 오는 날 밤, 카페에서 공부"
            />
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={koreanOnly}
              onChange={(event) => setKoreanOnly(event.target.checked)}
            />
            <span>한국 노래 중심으로 추천</span>
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "추천 생성 중..." : "추천받기"}
          </button>
        </form>
      </section>

      {error ? <section className="panel error-panel">{error}</section> : null}

      {result ? (
        <section className="panel">
          <div className="section-heading">
            <h2>추천 결과</h2>
            <span>{result.model_used}</span>
          </div>
          <p className="explanation">{result.explanation}</p>
          <div className="recommendation-grid">
            {result.recommendations.map((item: any) => (
              <article className="song-card" key={`${item.title}-${item.artist}`}>
                <strong>{item.title}</strong>
                <span>{item.artist}</span>
                <small>{item.album ?? item.source}</small>
                <small>{item.source}</small>
                <div className="song-actions">
                  {item.external_url ? (
                    <a className="secondary-button link-button" href={item.external_url} target="_blank" rel="noreferrer">
                      외부 링크
                    </a>
                  ) : null}
                  {item.preview_url ? (
                    <a className="secondary-button link-button" href={item.preview_url} target="_blank" rel="noreferrer">
                      미리듣기
                    </a>
                  ) : null}
                  {item.lastfm_url && !item.external_url ? (
                    <a className="secondary-button link-button" href={item.lastfm_url} target="_blank" rel="noreferrer">
                      Last.fm
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
