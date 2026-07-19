import type { RunStatus } from "../types/api.ts";

// ---------------------------------------------------------------------------
// StatusBadge – coloured pill for run status
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<
  RunStatus,
  { label: string; className: string }
> = {
  queued: {
    label: "排队中",
    className:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  running: {
    label: "运行中",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  completed: {
    label: "已完成",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  failed: {
    label: "失败",
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  cancelled: {
    label: "已取消",
    className:
      "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

interface Props {
  status: RunStatus;
}

export function StatusBadge({ status }: Props) {
  const { label, className } = STATUS_MAP[status] ?? STATUS_MAP.failed;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {status === "running" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {label}
    </span>
  );
}
