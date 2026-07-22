import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  downloadDeepReview,
  extractErrorMessage,
  getDeepReview,
  type DeepReviewArtifact,
} from "../api/client.ts";
import { usePolling } from "../hooks/usePolling.ts";
import { StatusBadge } from "../components/StatusBadge.tsx";

const ARTIFACTS: { key: DeepReviewArtifact; label: string; filename: string }[] = [
  {
    key: "review_queue_xlsx",
    label: "人工审核队列 (XLSX)",
    filename: "deep_review_review_queue.xlsx",
  },
  {
    key: "review_queue_md",
    label: "人工审核队列 (Markdown)",
    filename: "deep_review_review_queue.md",
  },
  {
    key: "results_jsonl",
    label: "深度审核结果 (JSONL)",
    filename: "deep_review_results.jsonl",
  },
  {
    key: "batch_results_jsonl",
    label: "批次结果 (JSONL)",
    filename: "batch_results.jsonl",
  },
  {
    key: "batch_summary_json",
    label: "批次摘要 (JSON)",
    filename: "batch_summary.json",
  },
  {
    key: "run_report_json",
    label: "运行报告 (JSON)",
    filename: "deep_review_run_report.json",
  },
];

export function DeepReviewDetail() {
  const { runId } = useParams<{ runId: string }>();

  const fetcher = useCallback(() => getDeepReview(runId!), [runId]);
  const { data: progress, error: pollError } = usePolling(
    fetcher,
    3_000,
    !!runId,
  );

  const [downloading, setDownloading] = useState<string | null>(null);

  const status = progress?.status ?? "running";
  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const failed = progress?.failed ?? 0;
  const pct =
    total > 0
      ? Math.round((completed / total) * 100)
      : status === "completed"
        ? 100
        : 0;
  const summary = progress?.summary;
  const ready = status === "completed";

  async function handleDownload(key: DeepReviewArtifact, filename: string) {
    if (!runId) return;
    setDownloading(key);
    try {
      const blob = await downloadDeepReview(runId, key);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  }

  if (!progress) {
    return (
      <div className="space-y-4">
        <Link to="/deep-review" className="text-sm text-primary hover:underline">
          ← 返回深度审核
        </Link>
        {pollError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
            获取状态失败: {pollError}
          </div>
        ) : (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/deep-review" className="text-sm text-primary hover:underline">
          ← 返回深度审核
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{progress.run_id}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            {progress.source_run_id && (
              <span>
                来源批次：
                <Link
                  to={`/runs/${progress.source_run_id}`}
                  className="text-primary hover:underline"
                >
                  {progress.source_run_id}
                </Link>
              </span>
            )}
            {progress.started_at && <span>开始：{progress.started_at}</span>}
            {progress.updated_at && <span>更新：{progress.updated_at}</span>}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* progress */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-200">
            处理进度
          </span>
          <span className="tabular-nums text-zinc-500">
            {completed} / {total}（{pct}%）
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        {failed > 0 && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            失败 {failed} 条
          </p>
        )}
        {progress.error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/20 dark:text-red-400">
            {progress.error}
          </p>
        )}
      </section>

      {/* summary */}
      {summary && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-lg font-semibold">汇总</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="选中" value={summary.selected_count ?? 0} />
            <Stat label="完成" value={summary.completed_count ?? 0} />
            <Stat label="失败" value={summary.failed_count ?? 0} />
            <Stat
              label="需人工复核"
              value={summary.human_review_queue_count ?? 0}
            />
            <Stat
              label="校验告警"
              value={summary.validation_warning_count ?? 0}
            />
          </div>
        </section>
      )}

      {/* downloads */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-semibold">输出下载</h2>
        <div className="flex flex-wrap gap-3">
          {ARTIFACTS.map((a) => (
            <button
              key={a.key}
              onClick={() => handleDownload(a.key, a.filename)}
              disabled={!ready || downloading === a.key}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                />
              </svg>
              {downloading === a.key ? "下载中..." : a.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-800/40">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default DeepReviewDetail;
