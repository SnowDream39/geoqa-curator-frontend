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
import type { RunStat } from "../types/api.ts";

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
  const isRunning = true; // Always poll initially; stop on completed/failed/cancelled
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
  const displayName = runId ?? "";
  const qaCount = progress?.total ?? runStat?.total ?? 0;
  const done = progress?.completed ?? 0;
  const failed = progress?.failed ?? 0;
  const skipped = progress?.skipped ?? 0;
  const pct =
    qaCount > 0
      ? Math.min(((done + failed) / qaCount) * 100, 99.5)
      : 0;

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

  const isTerminal =
    status === "completed" || status === "failed" || status === "cancelled";

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
        <span className="text-zinc-800 dark:text-zinc-200 font-mono text-xs">
          {displayName}
        </span>
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight truncate font-mono">
                {displayName}
              </h1>
              <StatusBadge status={status} />
            </div>
            <p className="mt-1 text-xs text-zinc-500 font-mono">{runId}</p>
            {progress?.started_at && (
              <p className="text-xs text-zinc-400 mt-0.5">
                开始于 {formatDate(progress.started_at)}
                {progress.updated_at &&
                  isTerminal &&
                  ` · 完成于 ${formatDate(progress.updated_at)}`}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleDownload("export")}
              disabled={
                downloading === "export" ||
                status === "queued" ||
                status === "running"
              }
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {downloading === "export" ? "下载中..." : "📥 导出结果"}
            </button>
            <button
              onClick={() => handleDownload("report")}
              disabled={
                downloading === "report" ||
                status === "queued" ||
                status === "running"
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
              {done + failed} / {qaCount} · {pct.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            {/* Completed (green) + Failed (red) */}
            <div className="flex h-full transition-all duration-700">
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
                style={{
                  width: qaCount > 0 ? `${(done / qaCount) * 100}%` : "0%",
                }}
              />
              <div
                className="h-full bg-red-500 transition-all duration-700"
                style={{
                  width:
                    qaCount > 0 ? `${(failed / qaCount) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
        </div>

        {/* Run-level error */}
        {progress?.error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/20">
            <p className="text-xs font-semibold text-red-800 dark:text-red-300">
              错误信息
            </p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400 font-mono whitespace-pre-wrap">
              {progress.error}
            </p>
          </div>
        )}
      </div>

      {/* Status summary (completed or running) */}
      {qaCount > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 font-semibold">处理状态</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="总计"
              count={qaCount}
              color="zinc"
            />
            <StatCard
              label="完成"
              count={done}
              color="emerald"
            />
            <StatCard
              label="失败"
              count={failed}
              color="red"
            />
            <StatCard
              label="跳过"
              count={skipped}
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
// StatCard sub-component
// ---------------------------------------------------------------------------

const STAT_COLORS: Record<
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

function StatCard({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  const c = STAT_COLORS[color] ?? STAT_COLORS.zinc;
  return (
    <div className={`rounded-xl p-4 ${c.bg}`}>
      <p className={`text-xs font-medium ${c.text}`}>{label}</p>
      <p className={`mt-1 text-2xl font-bold ${c.text}`}>{count}</p>
    </div>
  );
}

export default RunDetail;
