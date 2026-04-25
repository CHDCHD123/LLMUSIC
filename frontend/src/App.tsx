import { useEffect, useState } from "react";

import StatusPanel from "./components/StatusPanel";
import AutomationPage from "./pages/AutomationPage";
import RecommendPage from "./pages/RecommendPage";
import { fetchStatus } from "./services/api";

const tabs = [
  { key: "recommend", label: "Music Match", path: "/recommend" },
  { key: "automation", label: "Chart Ops", path: "/automation" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function pathToTab(pathname: string): TabKey {
  if (pathname === "/automation") return "automation";
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
    const handlePopState = () => setTab(pathToTab(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    refreshStatus(true).catch(() => undefined);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">LLMUSIC</p>
          <h1>Music intelligence for mood and charts</h1>
          <p className="sidebar-copy">
            추천은 공개 음악 API 중심으로, 자동화는 지니 크롤링과 리포트 생성 흐름으로 분리했습니다.
          </p>
        </div>

        <nav className="nav-list">
          {tabs.map((item) => (
            <button
              key={item.key}
              className={tab === item.key ? "nav-button active" : "nav-button"}
              onClick={() => navigate(item.key)}
            >
              <strong>{item.label}</strong>
              <small>{item.path}</small>
            </button>
          ))}
        </nav>

        <StatusPanel
          title="Live Integrations"
          compact
          items={[
            { label: "iTunes", value: status?.itunes?.status ?? "-", meta: status?.itunes?.note },
            { label: "MusicBrainz", value: status?.musicbrainz?.status ?? "-", meta: status?.musicbrainz?.note },
            { label: "Last.fm", value: status?.lastfm?.status ?? "-" },
            { label: "Genie", value: status?.genie?.status ?? "-", meta: status?.genie?.note },
            { label: "OpenAI", value: status?.openai?.status ?? "-", meta: status?.openai?.model },
          ]}
        />

        <div className="sidebar-actions">
          <button className="secondary-button small-button" onClick={() => refreshStatus(true)}>
            상태 새로고침
          </button>
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
