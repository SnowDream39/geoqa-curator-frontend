import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  downloadRunExport,
  downloadRunReport,
  extractErrorMessage,
  getRunProgress,
  listRuns,
} from "../api/client.ts";
import { usePolling } from "../hooks/usePolling.ts";
import { StatusBadge } from "../components/StatusBadge.tsx";
import type { RunProgress, RunStat } from "../types/api.ts";

// ---------------------------------------------------------------------------
// RunDetail – live view of a single batch run
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}

export function RunDetail() {
  const { runId } = useParams<{ runId: string }>();

  // Poll progress while running
  const fetcher = useCallback(
    () => getRunProgress(runId!),
    [runId],
  );
  const isRunning = true; // Always poll initially; stop on completed/failed
  const { data: progress, error: pollError } = usePolling(
    fetcher,
    3_000,
    isRunning && !!runId,
  );

  const [runStat, setRunStat] = useState<RunStat | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Load full run stat
  useEffect(() => {
    if (!runId) return;
    listRuns()
      .then((data) => {
        const found = data.runs?.find((r) => r.run_id === runId);
        if (found) setRunStat(found);
      })
      .catch(() => {}); // silently ignore
  }, [runId, progress]);

  // Derive display data
  const status =
    progress?.status ?? runStat?.status ?? "running";
  const name = progress?.name ?? runStat?.name ?? runId ?? "";
  const qaCount = progress?.total ?? runStat?.qa_count ?? 0;
  const current = progress?.current ?? 0;
  const pct =
    progress?.percentage ??
    (qaCount > 0 ? Math.min((current / qaCount) * 100, 99.5) : 0);

  const handleDownload = async (type: "export" | "report") => {
    if (!runId) return;
    setDownloading(type);
    setDownloadError(null);
    try {
      const blob =
        type === "export"
          ? await downloadRunExport(runId)
          : await downloadRunReport(runId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${runId}-${type}.${type === "report" ? "md" : "jsonl"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(extractErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link
          to="/"
          className="hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          所有任务
        </Link>
        <span>/</span>
        <span className="text-zinc-800 dark:text-zinc-200">
          {name}
        </span>
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight truncate">
                {name}
              </h1>
              <StatusBadge status={status} />
            </div>
            <p className="mt-1 text-sm text-zinc-500">{runId}</p>
            {runStat?.created_at && (
              <p className="text-xs text-zinc-400 mt-0.5">
                创建于 {formatDate(runStat.created_at)}
                {runStat.finished_at &&
                  ` · 完成于 ${formatDate(runStat.finished_at)}`}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleDownload("export")}
              disabled={
                downloading === "export" ||
                status === "running" ||
                status === "failed"
              }
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {downloading === "export" ? "下载中..." : "📥 导出结果"}
            </button>
            <button
              onClick={() => handleDownload("report")}
              disabled={
                downloading === "report" ||
                status === "running" ||
                status === "failed"
              }
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {downloading === "report" ? "下载中..." : "📄 下载报告"}
            </button>
          </div>
        </div>

        {downloadError && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
            {downloadError}
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              进度
            </span>
            <span className="font-mono text-zinc-500">
              {current} / {qaCount} · {pct.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                status === "completed"
                  ? "bg-emerald-500"
                  : status === "failed"
                    ? "bg-red-500"
                    : "bg-primary"
              }`}
              style={{ width: `${status === "completed" ? 100 : pct}%` }}
            />
          </div>
        </div>

        {/* Speed info (running) */}
        {progress?.speed_summary &&
          status === "running" && (
            <div className="mt-3 flex gap-4 text-xs text-zinc-500">
              <span>
                ≈ {progress.speed_summary.items_per_minute} 条/分钟
              </span>
              {progress.speed_summary.estimated_remaining_minutes && (
                <span>
                  预计剩余 {progress.speed_summary.estimated_remaining_minutes}{" "}
                  分钟
                </span>
              )}
            </div>
          )}

        {/* Recent errors */}
        {progress?.recent_errors &&
          progress.recent_errors.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                最近错误
              </p>
              <ul className="mt-1 space-y-1">
                {progress.recent_errors.map((err, i) => (
                  <li
                    key={i}
                    className="text-xs text-amber-700 dark:text-amber-400 font-mono truncate"
                  >
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </div>

      {/* Decision summary (completed) */}
      {status === "completed" && runStat && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 font-semibold">审核结果分布</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <DecisionCard
              label="保留"
              count={runStat.keep_count ?? 0}
              color="emerald"
            />
            <DecisionCard
              label="小修"
              count={runStat.minor_revision_count ?? 0}
              color="amber"
            />
            <DecisionCard
              label="大修"
              count={runStat.major_revision_count ?? 0}
              color="orange"
            />
            <DecisionCard
              label="驳回"
              count={runStat.reject_count ?? 0}
              color="red"
            />
            <DecisionCard
              label="错误"
              count={runStat.error_count ?? 0}
              color="zinc"
            />
          </div>
        </div>
      )}

      {/* Poll error */}
      {pollError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
          获取状态失败: {pollError}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DecisionCard sub-component
// ---------------------------------------------------------------------------

const DECISION_COLORS: Record<
  string,
  { bg: string; text: string }
> = {
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-950/30",
    text: "text-orange-700 dark:text-orange-400",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
  },
  zinc: {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
  },
};

function DecisionCard({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  const c = DECISION_COLORS[color] ?? DECISION_COLORS.zinc;
  return (
    <div className={`rounded-xl p-4 ${c.bg}`}>
      <p className={`text-xs font-medium ${c.text}`}>{label}</p>
      <p className={`mt-1 text-2xl font-bold ${c.text}`}>{count}</p>
    </div>
  );
}

export default RunDetail;
