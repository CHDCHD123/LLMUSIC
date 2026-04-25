import { useEffect, useState } from "react";

import StatusPanel from "./components/StatusPanel";
import AutomationPage from "./pages/AutomationPage";
import RecommendPage from "./pages/RecommendPage";
import { fetchStatus } from "./services/api";

const tabs = [
  { key: "recommend", label: "추천", path: "/recommend" },
  { key: "automation", label: "자동화", path: "/automation" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function pathToTab(pathname: string): TabKey {
  if (pathname === "/automation") {
    return "automation";
  }
  return "recommend";
}

function tabToPath(tab: TabKey): string {
  return tabs.find((item) => item.key === tab)?.path ?? "/recommend";
}

export default function App() {
  const [tab, setTab] = useState<TabKey>(() => pathToTab(window.location.pathname));
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

  function navigate(nextTab: TabKey) {
    const nextPath = tabToPath(nextTab);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setTab(nextTab);
  }

  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState({}, "", "/recommend");
      setTab("recommend");
    }

    const handlePopState = () => {
      setTab(pathToTab(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    refreshStatus(true).catch(() => undefined);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-stack">
          <p className="eyebrow">Service</p>
          <h2>LLMUSIC</h2>
          <p className="sidebar-copy">
            추천, 자동화, 차트 분석을 분리한 구조로 운영합니다.
          </p>
          <nav className="nav-list">
            {tabs.map((item) => (
              <button
                key={item.key}
                className={tab === item.key ? "nav-button active" : "nav-button"}
                onClick={() => navigate(item.key)}
              >
                <span>{item.label}</span>
                <small>{item.path}</small>
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
