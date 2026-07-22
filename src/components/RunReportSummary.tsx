import { useEffect, useRef, useState } from "react";
import {
  downloadRunExport,
  downloadRunReport,
  extractErrorMessage,
  getRunReportSummary,
} from "../api/client.ts";
import type { RunReportSummary as ReportSummary } from "../types/api.ts";

// ---------------------------------------------------------------------------
// RunReportSummary – simple review report rendered directly in the page
// ---------------------------------------------------------------------------

const DECISION_LABELS: Record<string, string> = {
  keep: "保留",
  minor_rewrite: "小改写",
  major_rewrite: "大改写",
  reject: "拒绝",
  review_manually: "人工复核",
  merge_duplicate: "合并重复",
};

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "是" : "否";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
}

function BarRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1">
      <div
        className="w-28 shrink-0 truncate text-xs text-zinc-500 dark:text-zinc-400"
        title={label}
      >
        {label}
      </div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-16 shrink-0 text-right font-mono text-xs text-zinc-600 dark:text-zinc-300">
        {count} · {pct.toFixed(0)}%
      </div>
    </div>
  );
}

function DistributionCard({
  title,
  counts,
}: {
  title: string;
  counts?: Record<string, number> | null;
}) {
  const empty = !counts || Object.keys(counts).length === 0;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {empty ? (
        <p className="text-sm text-zinc-400">（无数据）</p>
      ) : (
        (() => {
          const total = Object.values(counts as Record<string, number>).reduce(
            (a, b) => a + b,
            0,
          );
          return Object.entries(counts as Record<string, number>).map(([k, v]) => (
            <BarRow key={k} label={DECISION_LABELS[k] ?? k} count={v} total={total} />
          ));
        })()
      )}
    </div>
  );
}

function KVCard({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; value: unknown }[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">（无数据）</p>
      ) : (
        <dl className="space-y-1 text-sm">
          {rows.map((r) => (
            <div key={r.key} className="flex justify-between gap-4">
              <dt className="text-zinc-500">{r.key}</dt>
              <dd className="font-mono text-zinc-700 dark:text-zinc-200">
                {fmt(r.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function ArtifactCard({
  runId,
  artifacts,
}: {
  runId: string;
  artifacts: ReportSummary["artifacts"];
}) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handle = async (type: "export" | "report") => {
    setDownloading(type);
    setErr(null);
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
    } catch (e) {
      setErr(extractErrorMessage(e));
    } finally {
      setDownloading(null);
    }
  };

  const items: {
    label: string;
    name?: string | null;
    onDownload?: "export" | "report";
  }[] = [
    { label: "审阅结果 (jsonl)", name: artifacts.review_results },
    { label: "优化后问答 (json)", name: artifacts.improved_qa, onDownload: "export" },
    { label: "Markdown 报告", name: artifacts.report, onDownload: "report" },
    { label: "专家复核任务 (xlsx)", name: artifacts.expert_review_tasks },
  ];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 font-semibold">产物文件</h3>
      <ul className="space-y-2 text-sm">
        {items.map((it) => (
          <li
            key={it.label}
            className="flex items-center justify-between gap-3"
          >
            <span className="text-zinc-600 dark:text-zinc-300">{it.label}</span>
            {it.onDownload ? (
              <button
                onClick={() => handle(it.onDownload!)}
                disabled={!it.name || downloading === it.onDownload}
                className="font-mono text-xs text-indigo-600 hover:underline disabled:opacity-40 disabled:no-underline dark:text-indigo-400"
              >
                {it.name ?? "（无）"}
              </button>
            ) : (
              <span className="font-mono text-xs text-zinc-400">
                {it.name ?? "（无）"}
              </span>
            )}
          </li>
        ))}
      </ul>
      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
    </div>
  );
}

export function RunReportSummary({ runId }: { runId: string }) {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const stoppedRef = useRef(false);

  const load = () => {
    getRunReportSummary(runId)
      .then((data) => {
        setReport(data);
        setError(null);
        if (
          data.finished_at ||
          (data.status !== "running" && data.status !== "queued")
        ) {
          stoppedRef.current = true;
        }
      })
      .catch((err) => {
        setError(extractErrorMessage(err));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    stoppedRef.current = false;
    setLoading(true);
    load();
    const id = setInterval(() => {
      if (!stoppedRef.current) load();
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  if (loading && !report) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-400">加载简易报告中…</p>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 font-semibold">简易报告</h2>
        <p className="text-sm text-zinc-400">暂无报告：{error}</p>
      </div>
    );
  }

  if (!report) return null;

  const { qa_counts: qa, distributions: dist, artifacts } = report;

  return (
    <div className="space-y-6">
      {/* Overview + QA counts */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 font-semibold">简易报告</h2>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <KV k="命令" v={report.command ?? "—"} />
          <KV k="dry_run" v={report.dry_run} />
          <KV
            k="开始"
            v={report.started_at ? new Date(report.started_at).toLocaleString("zh-CN") : "—"}
          />
          <KV
            k="结束"
            v={report.finished_at ? new Date(report.finished_at).toLocaleString("zh-CN") : "—"}
          />
          <KV k="API 连续失败上限" v={report.api_failure_streak_max} />
          <KV k="因 API 失败中断" v={report.stopped_due_to_api_failures} />
        </div>

        {report.error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/20">
            <p className="text-xs font-semibold text-red-800 dark:text-red-300">
              错误信息
            </p>
            <p className="mt-1 whitespace-pre-wrap font-mono text-sm text-red-700 dark:text-red-400">
              {report.error}
            </p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
          <Stat label="总 QA" value={qa.total} />
          <Stat label="已提交" value={qa.submitted} />
          <Stat label="已处理" value={qa.processed} />
          <Stat label="失败" value={qa.failed} />
          <Stat label="跳过" value={qa.skipped} />
        </div>
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DistributionCard title="判定分布" counts={dist.decision_counts} />
        <DistributionCard title="状态分布" counts={dist.status_counts} />
        <DistributionCard title="错误类型分布" counts={dist.error_type_counts} />
        {dist.score_distributions &&
          Object.entries(dist.score_distributions).map(([dim, counts]) => (
            <DistributionCard
              key={dim}
              title={`评分分布 · ${dim}`}
              counts={counts}
            />
          ))}
      </div>

      {/* Token / writer / export */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <KVCard title="Token 用量" rows={report.token_usage} />
        <KVCard title="写入状态" rows={report.writer_counts} />
        <KVCard title="导出汇总" rows={report.export_summary} />
      </div>

      {/* Artifacts */}
      <ArtifactCard runId={runId} artifacts={artifacts} />
    </div>
  );
}

function KV({ k, v }: { k: string; v: unknown }) {
  return (
    <div>
      <span className="text-zinc-400">{k}: </span>
      <span className="font-mono text-zinc-700 dark:text-zinc-200">{fmt(v)}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-zinc-100 p-3 text-center dark:bg-zinc-800">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-800 dark:text-zinc-100">
        {value}
      </p>
    </div>
  );
}

export default RunReportSummary;
