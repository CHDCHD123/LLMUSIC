import { useEffect, useState } from "react";

import AutomationPage from "./pages/AutomationPage";
import RecommendPage from "./pages/RecommendPage";
import { fetchStatus } from "./services/api";

const tabs = [
  { key: "recommend", label: "추천", path: "/recommend" },
  { key: "automation", label: "자동화", path: "/automation" },
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
      <header className="topbar">
        <div className="topbar-brand">
          <p className="eyebrow">LLMUSIC</p>
          <h1>Music concierge with live chart ops</h1>
        </div>

        <nav className="topbar-nav">
          {tabs.map((item) => (
            <button
              key={item.key}
              className={tab === item.key ? "tab-button active" : "tab-button"}
              onClick={() => navigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <div className="status-strip">
            <span className="status-dot">{status?.itunes?.status ?? "-"}</span>
            <span className="status-dot">{status?.musicbrainz?.status ?? "-"}</span>
            <span className="status-dot">{status?.openai?.status ?? "-"}</span>
          </div>
          <button className="secondary-button small-button" onClick={() => refreshStatus(true)}>
            상태 새로고침
          </button>
        </div>
      </header>

      <main className="main-shell">
        {tab === "recommend" ? (
          <RecommendPage initialStatus={status} onStatusRefresh={() => refreshStatus(false)} />
        ) : (
          <AutomationPage systemStatus={status} onStatusRefresh={() => refreshStatus(false)} />
        )}
      </main>

      <footer className="footer-bar">
        <span>LLMUSIC</span>
        <span>{statusError || "Mood recommendation + Genie automation"}</span>
      </footer>
    </div>
  );
}
