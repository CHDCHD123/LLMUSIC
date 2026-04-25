import { useState } from "react";

import AutomationPage from "./pages/AutomationPage";
import RecommendPage from "./pages/RecommendPage";

const tabs = [
  { key: "recommend", label: "추천" },
  { key: "automation", label: "자동화" },
] as const;

export default function App() {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("recommend");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Service</p>
          <h2>LLMUSIC</h2>
          <p className="sidebar-copy">
            프론트와 백엔드, 크롤링과 보고서를 분리한 새 구조입니다.
          </p>
        </div>
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
      </aside>
      <main className="content">{tab === "recommend" ? <RecommendPage /> : <AutomationPage />}</main>
    </div>
  );
}
