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
    if (initialStatus) setStatus(initialStatus);
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
      <section className="hero-banner">
        <div className="hero-copy">
          <p className="eyebrow">Recommendation</p>
          <h2>지금 듣기 좋은 곡을 빠르게 고릅니다.</h2>
          <p className="lead">간단히 입력하고, 결과는 바로 듣고 확인할 수 있게 보여줍니다.</p>
        </div>
        <div className="hero-pill-row">
          <span className="hero-pill">iTunes</span>
          <span className="hero-pill">MusicBrainz</span>
          <span className="hero-pill">Last.fm</span>
          <span className="hero-pill">{status?.genie?.status ?? "Genie"}</span>
        </div>
      </section>

      <section className="search-card">
        <div className="search-card-head">
          <div>
            <h3>추천 검색</h3>
            <p>짧게 입력해도 됩니다.</p>
          </div>
          <div className="inline-status">
            <span>{loading ? "검색 중" : "대기"}</span>
          </div>
        </div>

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

          <div className="form-grid">
            <label className="field">
              <span>상황</span>
              <input
                value={situation}
                onChange={(event) => setSituation(event.target.value)}
                placeholder="예: 비 오는 밤, 드라이브, 카페에서 공부"
              />
            </label>
            <label className="toggle checkbox-card">
              <input
                type="checkbox"
                checked={koreanOnly}
                onChange={(event) => setKoreanOnly(event.target.checked)}
              />
              <span>한국 노래 위주</span>
            </label>
          </div>

          <button className="primary-button large-button" type="submit" disabled={loading}>
            {loading ? "추천 생성 중..." : "추천받기"}
          </button>
        </form>
      </section>

      <div className="page-columns">
        <section className="panel results-panel">
          <div className="section-heading">
            <div>
              <h2>추천 결과</h2>
              <p className="subtle-copy">{result ? result.model_used : "아직 생성 전"}</p>
            </div>
          </div>

          {loading ? (
            <div className="loading-stack">
              <div className="loading-bar" />
              <div className="skeleton-list">
                {[0, 1, 2, 3].map((item) => (
                  <div className="skeleton-row" key={item}>
                    <div className="skeleton-thumb shimmer" />
                    <div className="skeleton-copy">
                      <div className="skeleton-line shimmer short" />
                      <div className="skeleton-line shimmer" />
                    </div>
                    <div className="skeleton-pill shimmer" />
                  </div>
                ))}
              </div>
            </div>
          ) : result ? (
            <>
              <p className="explanation service-callout">{result.explanation}</p>
              <div className="recommendation-list">
                {result.recommendations.map((item: any, index: number) => (
                  <article className="service-row" key={`${item.title}-${item.artist}`}>
                    <div className="service-rank">{String(index + 1).padStart(2, "0")}</div>
                    {item.artwork_url ? (
                      <img className="service-artwork" src={item.artwork_url} alt={`${item.title} artwork`} />
                    ) : (
                      <div className="service-artwork service-artwork-placeholder">{item.source}</div>
                    )}
                    <div className="service-copy">
                      <strong>{item.title}</strong>
                      <span>{item.artist}</span>
                      <small>{item.album ?? "앨범 정보 없음"}</small>
                    </div>
                    <div className="service-tags">
                      <span className="source-pill">{item.source}</span>
                      {item.rank ? <small>지니 {item.rank}위</small> : <small>검색 결과</small>}
                    </div>
                    <div className="service-actions">
                      {item.external_url ? (
                        <a className="secondary-button link-button" href={item.external_url} target="_blank" rel="noreferrer">
                          열기
                        </a>
                      ) : null}
                      {item.preview_url ? (
                        <a className="secondary-button link-button" href={item.preview_url} target="_blank" rel="noreferrer">
                          미리듣기
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-copy empty-panel">추천 결과가 여기에 표시됩니다.</div>
          )}
        </section>

        {status ? (
          <StatusPanel
            title="소스 상태"
            items={[
              { label: "iTunes", value: status.itunes?.status ?? "-", meta: status.itunes?.note },
              { label: "MusicBrainz", value: status.musicbrainz?.status ?? "-", meta: status.musicbrainz?.note },
              { label: "Last.fm", value: status.lastfm?.status ?? "-" },
              { label: "Genie", value: status.genie?.status ?? "-", meta: status.genie?.note },
              { label: "OpenAI", value: status.openai?.status ?? "-", meta: status.openai?.model },
            ]}
          />
        ) : null}
      </div>

      {error ? <section className="panel error-panel">{error}</section> : null}
    </div>
  );
}
