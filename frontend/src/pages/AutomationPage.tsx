import { FormEvent, useEffect, useMemo, useState } from "react";

import { fetchAutomationStatus, runAutomation, updateSchedule } from "../services/api";

type Props = {
  systemStatus?: any;
  onStatusRefresh?: () => void;
};

const stepLabels: Record<string, string> = {
  idle: "대기",
  queued: "준비",
  crawl: "크롤링",
  baseline: "기준 저장",
  diff: "비교 분석",
  report: "리포트",
  done: "완료",
  failed: "실패",
};

const stepProgress: Record<string, number> = {
  idle: 0,
  queued: 0,
  crawl: 0,
  baseline: 92,
  diff: 92,
  report: 94,
  done: 100,
  failed: 100,
};

const stepExpectedSeconds: Record<string, number> = {
  queued: 2,
  crawl: 120,
  baseline: 2,
  diff: 2,
  report: 10,
};

const stepOffsets: Record<string, number> = {
  queued: 0,
  crawl: 0,
  baseline: 92,
  diff: 92,
  report: 94,
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function AutomationPage({ systemStatus, onStatusRefresh }: Props) {
  const [status, setStatus] = useState<any>(null);
  const [timeValue, setTimeValue] = useState("14:00");
  const [message, setMessage] = useState("");
  const [showAssets, setShowAssets] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [assetPage, setAssetPage] = useState(1);
  const [tick, forceTick] = useState(0);

  async function refresh() {
    const response = await fetchAutomationStatus();
    setStatus(response);
    setTimeValue(response.schedule_time ?? "14:00");
  }

  useEffect(() => {
    refresh().catch((err) => setMessage(err.message));
  }, []);

  useEffect(() => {
    if (!status?.running) return;
    const refreshTimer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 1800);
    const tickTimer = window.setInterval(() => {
      forceTick((value) => value + 1);
    }, 250);
    return () => {
      window.clearInterval(refreshTimer);
      window.clearInterval(tickTimer);
    };
  }, [status?.running]);

  async function handleRunNow() {
    try {
      await runAutomation();
      setMessage("실행을 시작했습니다.");
      await refresh();
      onStatusRefresh?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "실행 실패");
    }
  }

  async function handleScheduleSave(event: FormEvent) {
    event.preventDefault();
    try {
      await updateSchedule(true, timeValue);
      setMessage("자동 실행 저장 완료");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "저장 실패");
    }
  }

  const artifactEntries = (status?.data_artifacts ?? []).slice(0, 25);
  const currentProgress = useMemo(() => {
    if (!status?.running) return 0;
    const currentStep = status?.current_step ?? "queued";
    const startedAt = status?.step_started_at ? new Date(status.step_started_at) : null;
    if (!startedAt || Number.isNaN(startedAt.getTime())) return stepProgress[currentStep] ?? 0;
    const expectedSeconds = stepExpectedSeconds[currentStep] ?? 1;
    const offset = stepOffsets[currentStep] ?? 0;
    const remainingSpan =
      currentStep === "crawl" ? 92 :
      currentStep === "baseline" ? 2 :
      currentStep === "diff" ? 2 :
      currentStep === "report" ? 6 :
      2;
    const elapsedSeconds = Math.max(0, (Date.now() - startedAt.getTime()) / 1000);
    const ratio = Math.min(elapsedSeconds / expectedSeconds, 1);
    return Math.min(99, Math.round(offset + remainingSpan * ratio));
  }, [status, tick]);
  const recentLogs = useMemo(() => (status?.activity_log ?? []).slice().reverse(), [status]);
  const pagedLogs = useMemo(() => recentLogs.slice((logPage - 1) * 5, logPage * 5), [recentLogs, logPage]);
  const pagedArtifacts = useMemo(() => artifactEntries.slice((assetPage - 1) * 5, assetPage * 5), [artifactEntries, assetPage]);
  const totalLogPages = Math.max(1, Math.min(5, Math.ceil(recentLogs.length / 5)));
  const totalArtifactPages = Math.max(1, Math.min(5, Math.ceil(artifactEntries.length / 5)));

  useEffect(() => {
    setLogPage(1);
  }, [recentLogs.length]);

  useEffect(() => {
    setAssetPage(1);
  }, [artifactEntries.length]);

  return (
    <>
      <section className="space-y-sm">
        <h1 className="text-display-lg font-display-lg text-on-background">시스템 자동화 허브</h1>
        <p className="text-on-surface-variant text-body-base whitespace-nowrap overflow-hidden text-ellipsis">
          지속적인 음악 분석, 메타데이터 보강 및 분산 클러스터 전반의 자동 시스템 동기화를 위한 고급 오케스트레이션 엔진입니다.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        {[
          { title: "현재 단계", value: stepLabels[status?.current_step ?? "idle"], detail: status?.progress_label ?? "대기 중", icon: "settings_input_component", color: "text-primary" },
          { title: "비교 가능", value: status?.comparison_ready ? "준비됨" : "기준 대기", detail: status?.comparison_ready ? "직전 데이터 있음" : "첫 수집 대기", icon: "compare_arrows", color: "text-primary" },
          { title: "다음 예약", value: status?.schedule_enabled ? timeValue : "비활성", detail: status?.next_run_at ? formatDateTime(status.next_run_at) : "예약 정보 없음", icon: "schedule", color: "text-primary" },
          { title: "최근 결과", value: status?.last_result ?? "-", detail: message || status?.last_error || "상태 대기", icon: "check_circle", color: String(status?.last_result).includes("success") ? "text-[#4CAF50]" : "text-primary" },
        ].map((item) => (
          <div key={item.title} className="glass-card p-sm rounded-xl space-y-xs">
            <span className="text-label-sm font-label-sm text-surface-tint uppercase">{item.title}</span>
            <div className="flex items-center justify-between">
              <span className="text-headline-md font-headline-md">{item.value}</span>
              <span className={`material-symbols-outlined ${item.color}`}>{item.icon}</span>
            </div>
            <p className="text-data-mono font-data-mono text-on-surface-variant text-xs break-words">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-8 glass-card rounded-xl overflow-hidden flex flex-col">
          <div className="px-md py-sm border-b border-white/5 flex items-center justify-between">
            <h2 className="text-label-sm font-label-sm text-on-surface-variant uppercase flex items-center gap-xs">
              <span className="material-symbols-outlined text-sm">terminal</span>
              제어 패널
            </h2>
            <div className="flex items-center gap-xs bg-surface-container-lowest px-sm py-1 rounded-full border border-white/5">
              <span className={`w-2 h-2 rounded-full ${status?.running ? "bg-[#4CAF50] indicator-pulse" : "bg-[#F44336]"}`}></span>
              <span className="text-label-sm font-label-sm text-on-surface">{status?.running ? "실행 중" : "대기 중"}</span>
            </div>
          </div>
          <div className="p-md flex-grow space-y-md">
            <div className="space-y-xs">
              <div className="flex justify-between text-data-mono font-data-mono text-xs text-on-surface-variant">
                <span>{status?.progress_label ?? "대기 중"}</span>
                <span>{currentProgress}%</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary-container to-secondary-container rounded-full transition-[width] duration-700 ease-out" style={{ width: `${currentProgress}%` }}></div>
              </div>
            </div>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-md items-end" onSubmit={handleScheduleSave}>
              <div className="space-y-xs">
                <label className="text-label-sm font-label-sm text-on-surface-variant">예약 시간 (24시)</label>
                <input
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-sm py-xs text-on-surface focus:border-secondary-container focus:ring-1 focus:ring-secondary-container outline-none transition-all"
                  type="text"
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                />
              </div>
              <div className="flex gap-xs">
                <button type="button" onClick={handleRunNow} className="flex-1 bg-secondary-container text-white font-label-sm px-md py-2.5 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all">
                  지금 실행
                </button>
                <button type="submit" className="flex-1 border border-primary text-primary font-label-sm px-md py-2.5 rounded-lg hover:bg-primary/10 active:scale-[0.98] transition-all">
                  자동화 저장
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-4 glass-card rounded-xl flex flex-col">
          <div className="px-md py-sm border-b border-white/5">
            <h2 className="text-label-sm font-label-sm text-on-surface-variant uppercase">API 상태 노드</h2>
          </div>
          <div className="p-md flex-grow flex flex-col justify-around">
            {[
              { icon: "smart_toy", name: "지니 엔진", meta: systemStatus?.genie?.note ?? "현재 data 폴더 기준", ok: !String(systemStatus?.genie?.status ?? "").includes("없음") },
              { icon: "cloud", name: "OpenAI 코어", meta: systemStatus?.openai?.model ?? "모델 정보 없음", ok: !String(systemStatus?.openai?.status ?? "").includes("미연결") },
              { icon: "memory", name: "로컬 LLM", meta: systemStatus?.local_models?.model_id ?? "모델 정보 없음", ok: !String(systemStatus?.local_models?.status ?? "").includes("미") },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-sm rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-md">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary">{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-on-surface font-headline-md text-base">{item.name}</p>
                    <p className="text-label-sm text-on-surface-variant break-words">{item.meta}</p>
                  </div>
                </div>
                <span className={`w-2 h-2 rounded-full ${item.ok ? "bg-[#4CAF50]" : "bg-[#F44336]"}`}></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-8 glass-card rounded-xl flex flex-col">
          <div className="px-md py-sm border-b border-white/5 flex items-center justify-between">
            <h2 className="text-label-sm font-label-sm text-on-surface-variant uppercase">실행 로그</h2>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-xs text-primary hover:text-white transition-colors" onClick={() => refresh()}>
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span className="text-label-sm">새로고침</span>
              </button>
              <button className="rounded-lg border border-primary-container px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-container/10 transition-colors" onClick={() => setShowLogs(true)}>
                모두보기
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-label-sm text-on-surface-variant">
                <tr>
                  <th className="px-md py-sm font-semibold border-b border-white/5">단계</th>
                  <th className="px-md py-sm font-semibold border-b border-white/5">메시지</th>
                  <th className="px-md py-sm font-semibold border-b border-white/5">시간</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/5">
                {pagedLogs.map((entry: any, index: number) => (
                  <tr key={`${entry.time}-${index}`} className="hover:bg-white/5 align-top">
                    <td className="px-md py-sm text-primary whitespace-nowrap">{stepLabels[entry.step] ?? entry.step}</td>
                    <td className={`px-md py-sm ${String(entry.message).includes("완료") ? "text-[#4CAF50]" : "text-on-surface"}`}>{entry.message}</td>
                    <td className="px-md py-sm text-slate-400 whitespace-nowrap">{formatDateTime(entry.time)}</td>
                  </tr>
                ))}
                {!recentLogs.length ? (
                  <tr className="hover:bg-white/5">
                    <td className="px-md py-sm text-primary">대기</td>
                    <td className="px-md py-sm text-on-surface">로그가 아직 없습니다.</td>
                    <td className="px-md py-sm text-slate-500">-</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 px-md py-sm text-xs text-slate-400">
            <span>{recentLogs.length ? `${recentLogs.length}개 로그` : "로그 없음"}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={logPage <= 1}
                onClick={() => setLogPage((page) => Math.max(1, page - 1))}
                className="rounded border border-white/10 px-2 py-1 disabled:opacity-30"
              >
                이전
              </button>
              <span>{logPage} / {totalLogPages}</span>
              <button
                type="button"
                disabled={logPage >= totalLogPages}
                onClick={() => setLogPage((page) => Math.min(totalLogPages, page + 1))}
                className="rounded border border-white/10 px-2 py-1 disabled:opacity-30"
              >
                다음
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 glass-card rounded-xl flex flex-col">
          <div className="px-md py-sm border-b border-white/5">
            <h2 className="text-label-sm font-label-sm text-on-surface-variant uppercase">최근 산출물</h2>
          </div>
          <div className="p-sm space-y-xs">
            {pagedArtifacts.length ? (
              pagedArtifacts.map((item: any) => (
                <div key={`${item.relative_path}-${item.modified_at}`} className="flex items-center justify-between p-sm rounded-lg hover:bg-white/5 group transition-all">
                  <div className="flex items-center gap-sm min-w-0">
                    <span className="material-symbols-outlined text-secondary">description</span>
                    <div className="min-w-0">
                      <p className="text-on-surface text-sm font-medium">{item.name}</p>
                      <p className="text-data-mono text-[10px] text-on-surface-variant break-all">{item.relative_path}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between p-sm rounded-lg">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-secondary">description</span>
                  <div>
                    <p className="text-on-surface text-sm font-medium">산출물이 아직 없습니다.</p>
                    <p className="text-data-mono text-[10px] text-on-surface-variant uppercase">데이터 없음</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between px-md py-sm text-xs text-slate-400">
            <span>{artifactEntries.length ? `${artifactEntries.length}개 파일` : "파일 없음"}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={assetPage <= 1}
                onClick={() => setAssetPage((page) => Math.max(1, page - 1))}
                className="rounded border border-white/10 px-2 py-1 disabled:opacity-30"
              >
                이전
              </button>
              <span>{assetPage} / {totalArtifactPages}</span>
              <button
                type="button"
                disabled={assetPage >= totalArtifactPages}
                onClick={() => setAssetPage((page) => Math.min(totalArtifactPages, page + 1))}
                className="rounded border border-white/10 px-2 py-1 disabled:opacity-30"
              >
                다음
              </button>
            </div>
          </div>
          <div className="p-md mt-auto">
            <button
              type="button"
              onClick={() => setShowAssets(true)}
              className="w-full rounded-lg border border-primary-container py-2 text-sm font-medium text-white hover:bg-primary-container/10 transition-colors"
            >
              모든 자산 보기
            </button>
          </div>
        </div>
      </section>

      {showAssets ? (
        <div className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAssets(false)}>
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#121624] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">전체 산출물</h3>
              <button type="button" className="rounded-lg p-2 text-slate-300 hover:bg-white/5" onClick={() => setShowAssets(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-3">
              {artifactEntries.length ? (
                artifactEntries.map((item: any) => (
                  <div key={`${item.relative_path}-${item.modified_at}`} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-white">{item.name}</div>
                    <div className="mt-1 break-all text-xs text-slate-300">{item.relative_path}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{formatDateTime(item.modified_at)}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">표시할 산출물이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showLogs ? (
        <div className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowLogs(false)}>
          <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#121624] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">전체 실행 로그</h3>
              <button type="button" className="rounded-lg p-2 text-slate-300 hover:bg-white/5" onClick={() => setShowLogs(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-3">
              {recentLogs.length ? (
                recentLogs.map((entry: any, index: number) => (
                  <div key={`${entry.time}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold text-white">{stepLabels[entry.step] ?? entry.step}</div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(entry.time)}</div>
                    </div>
                    <div className="mt-2 text-sm text-slate-300">{entry.message}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">표시할 로그가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
