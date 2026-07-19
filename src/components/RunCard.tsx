import type { RunStat } from "../types/api.ts";
import { StatusBadge } from "./StatusBadge.tsx";

// ---------------------------------------------------------------------------
// RunCard – clickable card for a batch run in the list
// ---------------------------------------------------------------------------

interface Props {
  run: RunStat;
  onClick?: () => void;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function progressPct(run: RunStat): number | null {
  if (run.status !== "running") return null;
  const total = run.qa_count;
  const done =
    (run.keep_count ?? 0) +
    (run.minor_revision_count ?? 0) +
    (run.major_revision_count ?? 0) +
    (run.reject_count ?? 0) +
    (run.error_count ?? 0);
  if (total === 0) return 0;
  return Math.min((done / total) * 100, 99);
}

export function RunCard({ run, onClick }: Props) {
  const pct = progressPct(run);

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-xl border border-zinc-200 bg-white p-5 text-left transition-all hover:border-primary/30 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-primary/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h3 className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {run.name}
            </h3>
            <StatusBadge status={run.status} />
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {run.qa_count} 条数据 · 创建于 {formatDate(run.created_at)}
            {run.finished_at && ` · 完成于 ${formatDate(run.finished_at)}`}
          </p>
        </div>

        <svg
          className="mt-1 h-4 w-4 flex-shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary dark:text-zinc-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>

      {/* Progress bar (only for running) */}
      {pct !== null && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Decision summary (only for completed) */}
      {run.status === "completed" && (
        <div className="mt-3 flex gap-2 text-xs">
          {run.keep_count !== undefined && run.keep_count > 0 && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              保留 {run.keep_count}
            </span>
          )}
          {run.minor_revision_count !== undefined &&
            run.minor_revision_count > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                小改 {run.minor_revision_count}
              </span>
            )}
          {run.major_revision_count !== undefined &&
            run.major_revision_count > 0 && (
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                大改 {run.major_revision_count}
              </span>
            )}
          {run.reject_count !== undefined && run.reject_count > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              驳回 {run.reject_count}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export default RunCard;
