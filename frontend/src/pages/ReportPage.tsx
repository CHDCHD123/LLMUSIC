import { useEffect, useState } from "react";

import { fetchReportContent, fetchReports } from "../services/api";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function ReportPage() {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadReports() {
    try {
      setError("");
      const response = await fetchReports();
      const nextItems = response.items ?? [];
      setItems(nextItems);
      if (nextItems.length && !selected) {
        setSelected(nextItems[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "리포트 목록 조회 실패");
    }
  }

  useEffect(() => {
    loadReports().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selected) {
      setContent("");
      return;
    }
    setLoading(true);
    fetchReportContent(selected)
      .then(setContent)
      .catch((err) => setError(err instanceof Error ? err.message : "리포트 조회 실패"))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <>
      <section className="space-y-sm">
        <h1 className="text-display-lg font-display-lg text-on-background">리포트 허브</h1>
        <p className="text-on-surface-variant text-body-base">생성된 차트 분석 리포트를 목록과 본문으로 바로 읽을 수 있습니다.</p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter min-h-[720px]">
        <div className="lg:col-span-4 glass-card rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-white/5 px-md py-sm">
            <h2 className="text-label-sm font-label-sm uppercase text-on-surface-variant">리포트 목록</h2>
            <button className="text-sm text-primary hover:text-white transition-colors" onClick={() => loadReports()}>
              새로고침
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-sm space-y-xs">
            {items.length ? (
              items.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSelected(item.name)}
                  className={`w-full rounded-xl border p-sm text-left transition-colors ${
                    selected === item.name ? "border-secondary-container bg-secondary-container/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="text-sm font-semibold text-white break-all">{item.name}</div>
                  <div className="mt-1 text-xs text-slate-400">{formatDateTime(item.timestamp)}</div>
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-sm text-sm text-slate-300">생성된 리포트가 없습니다.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 glass-card rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-white/5 px-md py-sm">
            <h2 className="text-label-sm font-label-sm uppercase text-on-surface-variant">리포트 리더</h2>
            <div className="text-xs text-slate-400">{selected || "선택 없음"}</div>
          </div>
          <div className="flex-1 overflow-y-auto px-md py-md">
            {error ? <div className="rounded-xl border border-red-500/20 bg-red-950/40 p-sm text-sm text-red-200">{error}</div> : null}
            {loading ? <div className="text-sm text-slate-300">리포트 불러오는 중...</div> : null}
            {!loading && !content && !error ? <div className="text-sm text-slate-300">표시할 리포트가 없습니다.</div> : null}
            {content ? (
              <pre className="whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-[#0f1320] p-md text-[14px] leading-7 text-slate-100">{content}</pre>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
