import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  extractErrorMessage,
  listDeepReviewSources,
  listDeepReviews,
  startDeepReview,
} from "../api/client.ts";
import { RunCard } from "../components/RunCard.tsx";
import type { RunStat, SettingsOverride } from "../types/api.ts";
import { loadSceneSettings, saveSceneSettings } from "../lib/storage.ts";

interface DeepReviewPersisted {
  settingsOverride: SettingsOverride;
  riskScoreMin: number;
  limit: number | "";
  qaConcurrency: number;
  runId: string;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
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

export function DeepReview() {
  const navigate = useNavigate();

  const [sources, setSources] = useState<RunStat[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  const [runs, setRuns] = useState<RunStat[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsError, setRunsError] = useState<string | null>(null);

  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const persisted = loadSceneSettings<DeepReviewPersisted>("deep-review", {
    settingsOverride: {},
    riskScoreMin: 70,
    limit: "",
    qaConcurrency: 4,
    runId: "",
  });
  const [riskScoreMin, setRiskScoreMin] = useState(persisted.riskScoreMin);
  const [limit, setLimit] = useState<number | "">(persisted.limit);
  const [qaConcurrency, setQaConcurrency] = useState(persisted.qaConcurrency);
  const [runId, setRunId] = useState(persisted.runId);
  const [settingsOverride, setSettingsOverride] = useState<SettingsOverride>(
    persisted.settingsOverride
  );
  const [showLlmSettings, setShowLlmSettings] = useState(false);

  // Persist deep-review inputs per scene so they survive a page reload.
  useEffect(() => {
    saveSceneSettings("deep-review", {
      settingsOverride,
      riskScoreMin,
      limit,
      qaConcurrency,
      runId,
    });
  }, [settingsOverride, riskScoreMin, limit, qaConcurrency]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSources = useCallback(() => {
    listDeepReviewSources()
      .then((data) => setSources(data.runs ?? []))
      .catch((err) => setSourcesError(extractErrorMessage(err)))
      .finally(() => setSourcesLoading(false));
  }, []);

  const loadRuns = useCallback(() => {
    listDeepReviews()
      .then((data) => setRuns(data.runs ?? []))
      .catch((err) => setRunsError(extractErrorMessage(err)))
      .finally(() => setRunsLoading(false));
  }, []);

  useEffect(() => {
    loadSources();
    loadRuns();
  }, [loadSources, loadRuns]);

  async function handleStart() {
    if (!selectedSource) {
      setError("请先选择一个来源审核批次");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const resp = await startDeepReview({
        run_id: runId.trim() || null,
        source_run_id: selectedSource,
        risk_score_min: riskScoreMin,
        limit: limit ? Number(limit) : null,
        qa_concurrency: qaConcurrency,
        ids: null,
        system_decisions: null,
        evidence_sufficiencies: null,
        settings_override:
          Object.keys(settingsOverride).length > 0 ? settingsOverride : null,
      });
      navigate(`/deep-review/${resp.run_id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          深度审核 (Deep Review)
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          从已有审核批次中挑选高风险的 QA，批量运行 claim 级深度审核，生成人工复核队列。
        </p>
      </div>

      {/* Step 1: source run */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. 选择来源审核批次</h2>
        {sourcesLoading && (
          <div className="flex justify-center py-8">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {sourcesError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
            {sourcesError}
            <button
              onClick={() => {
                setSourcesLoading(true);
                loadSources();
              }}
              className="ml-3 underline underline-offset-2"
            >
              重试
            </button>
          </div>
        )}
        {!sourcesLoading && !sourcesError && sources.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            暂无可用的审核批次（需同时包含 review_results.jsonl 与 qa_items.jsonl）。
          </div>
        )}
        {sources.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((run) => {
              const selected = selectedSource === run.run_id;
              return (
                <button
                  key={run.run_id}
                  onClick={() => {
                    setSelectedSource(run.run_id);
                    // 默认让 deep review 沿用所选 review 批次的名字，方便对应。
                    setRunId(run.run_id);
                  }}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary dark:bg-primary/10"
                      : "border-zinc-200 bg-white hover:border-primary/30 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {run.run_id}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        run.status === "completed"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : run.status === "running"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {run.total} 条 QA · 创建于 {formatDate(run.created_at)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Step 2: filters */}
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">2. 筛选与参数</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-zinc-500">
              风险分阈值 (risk_score_min)
            </span>
            <input
              type="number"
              min={0}
              max={100}
              value={riskScoreMin}
              onChange={(e) => setRiskScoreMin(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-600"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-zinc-500">
              最大数量 (limit，留空=全部)
            </span>
            <input
              type="number"
              min={1}
              value={limit}
              placeholder="全部"
              onChange={(e) =>
                setLimit(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-600"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-zinc-500">
              任务名称 (run_id，默认沿用来源批次名)
            </span>
            <input
              type="text"
              placeholder="选择来源后自动填入，可修改"
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-600"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-zinc-500">
              并发数 (qa_concurrency)
            </span>
            <input
              type="number"
              min={1}
              value={qaConcurrency}
              onChange={(e) => setQaConcurrency(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-600"
            />
          </label>
        </div>

        {/* Advanced LLM settings (service / key / model) */}
        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setShowLlmSettings((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-300"
          >
            <span className="text-zinc-400">{showLlmSettings ? "▾" : "▸"}</span>
            LLM 设置（服务 / 密钥 / 模型）
          </button>
          {showLlmSettings && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-500">
                  Provider
                </span>
                <input
                  type="text"
                  placeholder="如 openai / deepseek"
                  value={settingsOverride.llm_provider ?? ""}
                  onChange={(e) =>
                    setSettingsOverride({
                      ...settingsOverride,
                      llm_provider: e.target.value || undefined,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-600"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-500">
                  模型 (model)
                </span>
                <input
                  type="text"
                  placeholder="如 deepseek-chat"
                  value={settingsOverride.llm_model ?? ""}
                  onChange={(e) =>
                    setSettingsOverride({
                      ...settingsOverride,
                      llm_model: e.target.value || undefined,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-600"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-zinc-500">
                  Base URL
                </span>
                <input
                  type="text"
                  placeholder="留空使用服务端默认"
                  value={settingsOverride.llm_base_url ?? ""}
                  onChange={(e) =>
                    setSettingsOverride({
                      ...settingsOverride,
                      llm_base_url: e.target.value || undefined,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-600"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-zinc-500">
                  API Key
                </span>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder="留空则使用服务端默认密钥"
                  value={settingsOverride.llm_api_key ?? ""}
                  onChange={(e) =>
                    setSettingsOverride({
                      ...settingsOverride,
                      llm_api_key: e.target.value || undefined,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-600"
                />
                  <span className="text-[11px] text-zinc-400">
                    仅用于本次运行（不写入服务端任务清单/日志）；会保存在本浏览器中以便下次自动填充。
                  </span>
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-zinc-500">
                  Temperature ({settingsOverride.llm_temperature ?? "默认"})
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={settingsOverride.llm_temperature ?? 0.7}
                  onChange={(e) =>
                    setSettingsOverride({
                      ...settingsOverride,
                      llm_temperature: Number(e.target.value),
                    })
                  }
                  style={{ accentColor: "rgb(var(--color-primary))" }}
                  className="w-full"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-500">
                  Max Tokens
                </span>
                <input
                  type="number"
                  min={1}
                  placeholder="默认"
                  value={settingsOverride.llm_max_tokens ?? ""}
                  onChange={(e) =>
                    setSettingsOverride({
                      ...settingsOverride,
                      llm_max_tokens: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-600"
                />
              </label>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
            {error}
          </div>
        )}
        <button
          onClick={handleStart}
          disabled={submitting || !selectedSource}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary/25 transition-all hover:bg-primary-dark active:scale-95 disabled:opacity-40"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              启动中...
            </span>
          ) : (
            "开始深度审核"
          )}
        </button>
      </section>

      {/* Deep review runs */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">深度审核任务</h2>
        {runsLoading && (
          <div className="flex justify-center py-8">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {runsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
          {runsError}
          <button
            onClick={() => {
              setRunsLoading(true);
              loadRuns();
            }}
            className="ml-3 underline underline-offset-2"
          >
            重试
          </button>
          </div>
        )}
        {!runsLoading && !runsError && runs.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            暂无深度审核任务。
          </div>
        )}
        {runs.length > 0 && (
          <div className="space-y-3">
            {runs.map((run) => (
              <RunCard
                key={run.run_id}
                run={run}
                onClick={() => navigate(`/deep-review/${run.run_id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default DeepReview;
