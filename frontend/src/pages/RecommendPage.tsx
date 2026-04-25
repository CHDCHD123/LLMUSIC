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
      <section className="hero hero-split">
        <div>
          <p className="eyebrow">Music Match</p>
          <h2>감정과 상황을 기준으로, 실제 들을 수 있는 후보를 빠르게 추천합니다.</h2>
          <p className="lead">
            공개 음악 API 결과와 현재 `data/`에 존재하는 최신 지니 분석 결과를 함께 사용합니다. `data/`에 지니 분석 파일이 없으면
            추천은 공개 API만으로 동작합니다.
          </p>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <strong>공개 검색</strong>
            <span>iTunes + MusicBrainz</span>
          </div>
          <div className="metric-card">
            <strong>선택 보강</strong>
            <span>Last.fm + Genie</span>
          </div>
          <div className="metric-card">
            <strong>설명 생성</strong>
            <span>{status?.openai?.model ?? "OpenAI / Local"}</span>
          </div>
        </div>
      </section>

      <div className="page-columns">
        <section className="panel form-panel">
          <div className="section-heading">
            <h2>추천 조건</h2>
            <span>{loading ? "추천 생성 중" : "입력 대기"}</span>
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

            <label className="field">
              <span>상황</span>
              <input
                value={situation}
                onChange={(event) => setSituation(event.target.value)}
                placeholder="예: 비 오는 밤, 퇴근길, 카페에서 공부, 주말 드라이브"
              />
            </label>

            <label className="toggle">
              <input
                type="checkbox"
                checked={koreanOnly}
                onChange={(event) => setKoreanOnly(event.target.checked)}
              />
              <span>한국 노래 위주로 좁히기</span>
            </label>

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "추천 조합 생성 중..." : "추천받기"}
            </button>
          </form>
        </section>

        {status ? (
          <StatusPanel
            title="추천 소스 상태"
            items={[
              { label: "iTunes Search", value: status.itunes?.status ?? "-", meta: status.itunes?.note },
              { label: "MusicBrainz", value: status.musicbrainz?.status ?? "-", meta: status.musicbrainz?.note },
              { label: "Last.fm", value: status.lastfm?.status ?? "-" },
              { label: "Genie 분석 데이터", value: status.genie?.status ?? "-", meta: status.genie?.note },
              { label: "OpenAI", value: status.openai?.status ?? "-", meta: status.openai?.live_error ?? status.openai?.model },
              { label: "로컬 모델", value: status.local_models?.status ?? "-", meta: status.local_models?.model_id },
            ]}
          />
        ) : null}
      </div>

      {error ? <section className="panel error-panel">{error}</section> : null}

      {result ? (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>추천 결과</h2>
              <p className="subtle-copy">설명 모델: {result.model_used}</p>
            </div>
          </div>
          <p className="explanation callout-text">{result.explanation}</p>

          <div className="recommendation-list">
            {result.recommendations.map((item: any, index: number) => (
              <article className="result-row" key={`${item.title}-${item.artist}`}>
                <div className="result-rank">{String(index + 1).padStart(2, "0")}</div>
                {item.artwork_url ? (
                  <img className="result-artwork" src={item.artwork_url} alt={`${item.title} artwork`} />
                ) : (
                  <div className="result-artwork result-artwork-placeholder">{item.source}</div>
                )}
                <div className="result-copy">
                  <strong>{item.title}</strong>
                  <span>{item.artist}</span>
                  <small>{item.album ?? "앨범 정보 없음"}</small>
                </div>
                <div className="result-meta">
                  <span className="source-pill">{item.source}</span>
                  {item.rank ? <small>지니 순위 {item.rank}</small> : <small>외부 검색 결과</small>}
                </div>
                <div className="result-actions">
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
        </section>
      ) : null}
    </div>
  );
}
