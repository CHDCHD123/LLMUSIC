import { useEffect, useState } from "react";

import AutomationPage from "./pages/AutomationPage";
import RecommendPage from "./pages/RecommendPage";
import StatusPanel from "./components/StatusPanel";
import { fetchStatus } from "./services/api";

const tabs = [
  { key: "recommend", label: "추천" },
  { key: "automation", label: "자동화" },
] as const;

export default function App() {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("recommend");
  const [status, setStatus] = useState<any>(null);
  const [statusError, setStatusError] = useState("");

  async function refreshStatus(probe = false) {
    try {
      const next = await fetchStatus(probe);
      setStatus(next);
      setStatusError("");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "상태 조회 실패");
    }
  }

  useEffect(() => {
    refreshStatus(true).catch(() => undefined);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-stack">
          <p className="eyebrow">Service</p>
          <h2>LLMUSIC</h2>
          <p className="sidebar-copy">
            프론트와 백엔드, 크롤링과 보고서를 분리한 새 구조입니다.
          </p>
          <nav className="nav-list">
            {tabs.map((item) => (
              <button
                key={item.key}
                className={tab === item.key ? "nav-button active" : "nav-button"}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-stack">
          <div className="section-heading">
            <h3>API 상태</h3>
            <button className="secondary-button small-button" onClick={() => refreshStatus(true)}>
              새로고침
            </button>
          </div>
          {status ? (
            <StatusPanel
              title="현재 연결"
              compact
              items={[
                { label: "iTunes", value: status.itunes?.status ?? "-" },
                { label: "MusicBrainz", value: status.musicbrainz?.status ?? "-" },
                { label: "Last.fm", value: status.lastfm?.status ?? "-" },
                { label: "OpenAI", value: status.openai?.status ?? "-", meta: status.openai?.model },
                { label: "로컬 모델", value: status.local_models?.status ?? "-" },
              ]}
            />
          ) : null}
          {statusError ? <div className="sidebar-notice">{statusError}</div> : null}
        </div>
      </aside>
      <main className="content">
        {tab === "recommend" ? (
          <RecommendPage initialStatus={status} onStatusRefresh={() => refreshStatus(false)} />
        ) : (
          <AutomationPage systemStatus={status} onStatusRefresh={() => refreshStatus(false)} />
        )}
      </main>
    </div>
  );
}
