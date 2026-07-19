import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  startBatchRun,
  listRuns,
  extractErrorMessage,
  fetchHealth,
} from "../api/client.ts";
import { ConfigPanel } from "../components/ConfigPanel.tsx";
import { FileUpload } from "../components/FileUpload.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import { RunCard } from "../components/RunCard.tsx";
import type {
  QAItemPayload,
  ReviewConfigPayload,
  RunStat,
  SettingsOverride,
} from "../types/api.ts";

// ---------------------------------------------------------------------------
// Dashboard – main page with stats, run list, and new-run flow
// ---------------------------------------------------------------------------

type ModalStep = 1 | 2 | 3;

export function Dashboard() {
  const navigate = useNavigate();

  // Runs list
  const [runs, setRuns] = useState<RunStat[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsError, setRunsError] = useState<string | null>(null);

  // Server health
  const [healthy, setHealthy] = useState(true);

  // New-run modal
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>(1);

  // Form state
  const [qaItems, setQaItems] = useState<QAItemPayload[]>([]);
  const [fileName, setFileName] = useState("");
  const [runName, setRunName] = useState("");
  const [config, setConfig] = useState<ReviewConfigPayload>({});
  const [settingsOverride, setSettingsOverride] =
    useState<SettingsOverride>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // Load runs + health
  // ------------------------------------------------------------------
  const loadRuns = useCallback(async () => {
    setRunsLoading(true);
    setRunsError(null);
    try {
      const data = await listRuns();
      setRuns(data.runs ?? []);
    } catch (err) {
      setRunsError(extractErrorMessage(err));
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
    fetchHealth()
      .then(() => setHealthy(true))
      .catch(() => setHealthy(false));
  }, [loadRuns]);

  // Auto-refresh runs every 10s when modal is closed
  useEffect(() => {
    if (showModal) return;
    const id = setInterval(loadRuns, 10_000);
    return () => clearInterval(id);
  }, [showModal, loadRuns]);

  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------
  const stats = {
    total: runs.length,
    running: runs.filter((r) => r.status === "running").length,
    completed: runs.filter((r) => r.status === "completed").length,
    failed: runs.filter((r) => r.status === "failed").length,
  };

  // ------------------------------------------------------------------
  // Submit new run
  // ------------------------------------------------------------------
  const handleStart = async () => {
    if (qaItems.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await startBatchRun({
        name:
          runName.trim() || `batch-${new Date().toISOString().slice(0, 16).replace("T", "-")}`,
        qa_items: qaItems,
        config: Object.keys(config).length > 0 ? config : undefined,
        settings_override:
          Object.keys(settingsOverride).length > 0
            ? settingsOverride
            : undefined,
      });
      // Close modal and navigate to detail
      setShowModal(false);
      resetModal();
      navigate(`/runs/${res.run_id}`);
    } catch (err) {
      setSubmitError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setModalStep(1);
    setQaItems([]);
    setFileName("");
    setRunName("");
    setConfig({});
    setSettingsOverride({});
    setSubmitError(null);
  };

  const onFileParsed = useCallback(
    (items: QAItemPayload[], fName: string) => {
      setQaItems(items);
      setFileName(fName);
      if (!runName) setRunName(fName.replace(/\.(jsonl?|json)$/i, ""));
    },
    [runName],
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Health warning */}
      {!healthy && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          ⚠️ 无法连接到后端服务，请确保 API 服务器已启动。
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="总任务"
          value={stats.total}
          color="bg-zinc-100 dark:bg-zinc-800"
        />
        <StatCard
          label="运行中"
          value={stats.running}
          color="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
          pulse={stats.running > 0}
        />
        <StatCard
          label="已完成"
          value={stats.completed}
          color="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
        />
        <StatCard
          label="失败"
          value={stats.failed}
          color="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
        />
      </div>

      {/* Header + action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">所有任务</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            批量审核任务的运行状态与结果
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary/25 transition-all hover:bg-primary-dark active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建任务
        </button>
      </div>

      {/* Run list */}
      {runsLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {runsError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
          {runsError}
          <button
            onClick={loadRuns}
            className="ml-3 underline underline-offset-2"
          >
            重试
          </button>
        </div>
      )}

      {!runsLoading && !runsError && runs.length === 0 && (
        <EmptyState
          icon="📂"
          title="暂无任务"
          description="点击「新建任务」上传 JSONL 文件并启动批量审核"
          action={
            <button
              onClick={() => setShowModal(true)}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary/25 transition-all hover:bg-primary-dark"
            >
              新建任务
            </button>
          }
        />
      )}

      {!runsLoading && runs.length > 0 && (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunCard
              key={run.run_id}
              run={run}
              onClick={() => navigate(`/runs/${run.run_id}`)}
            />
          ))}
        </div>
      )}

      {/* ================================================================ */}
      {/* New-run modal */}
      {/* ================================================================ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 animate-fade-in">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">新建批量审核任务</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetModal();
                }}
                className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex border-b border-zinc-100 px-6 py-3 dark:border-zinc-800">
              {([1, 2, 3] as const).map((step, i) => (
                <div
                  key={step}
                  className="flex items-center gap-2"
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      step <= modalStep
                        ? "bg-primary text-white"
                        : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                    }`}
                  >
                    {step < modalStep ? "✓" : step}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      step <= modalStep
                        ? "text-zinc-800 dark:text-zinc-200"
                        : "text-zinc-400"
                    }`}
                  >
                    {step === 1 ? "上传数据" : step === 2 ? "配置参数" : "启动"}
                  </span>
                  {i < 2 && (
                    <div className="mx-2 h-px w-8 bg-zinc-200 dark:bg-zinc-700" />
                  )}
                </div>
              ))}
            </div>

            {/* Modal body */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              {/* Step 1: Upload */}
              {modalStep === 1 && (
                <div className="space-y-4">
                  <FileUpload onParsed={onFileParsed} />
                  <div>
                    <label className="text-xs font-medium text-zinc-500">
                      任务名称（可选）
                    </label>
                    <input
                      type="text"
                      value={runName}
                      onChange={(e) => setRunName(e.target.value)}
                      placeholder="输入任务名称"
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-600 dark:focus:border-primary-light"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Config */}
              {modalStep === 2 && (
                <ConfigPanel
                  config={config}
                  settingsOverride={settingsOverride}
                  onConfigChange={setConfig}
                  onSettingsChange={setSettingsOverride}
                />
              )}

              {/* Step 3: Confirm */}
              {modalStep === 3 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                    <h3 className="font-semibold">确认信息</h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-zinc-500">任务名称</dt>
                        <dd className="font-medium">
                          {runName || fileName || "(未命名)"}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-zinc-500">数据文件</dt>
                        <dd className="font-medium">{fileName}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-zinc-500">数据量</dt>
                        <dd className="font-medium">{qaItems.length} 条</dd>
                      </div>
                      {config.scoring_dimensions &&
                        config.scoring_dimensions.length > 0 && (
                          <div className="flex justify-between">
                            <dt className="text-zinc-500">评分维度</dt>
                            <dd className="font-medium">
                              {config.scoring_dimensions.length} 个
                            </dd>
                          </div>
                        )}
                      {settingsOverride.llm_model && (
                        <div className="flex justify-between">
                          <dt className="text-zinc-500">LLM 模型</dt>
                          <dd className="font-medium text-primary">
                            {settingsOverride.llm_model}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {submitError && (
                    <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
                      {submitError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <button
                onClick={() => {
                  if (modalStep === 1) {
                    setShowModal(false);
                    resetModal();
                  } else {
                    setModalStep(
                      (modalStep - 1) as ModalStep,
                    );
                  }
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                上一步
              </button>

              {modalStep < 3 ? (
                <button
                  onClick={() =>
                    setModalStep((modalStep + 1) as ModalStep)
                  }
                  disabled={
                    (modalStep === 1 && qaItems.length === 0)
                  }
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/25 transition-all hover:bg-primary-dark disabled:opacity-40"
                >
                  下一步
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={submitting}
                  className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/25 transition-all hover:bg-primary-dark disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      启动中...
                    </span>
                  ) : (
                    "🚀 启动任务"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard sub-component
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  color,
  pulse = false,
}: {
  label: string;
  value: number;
  color?: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 ${color ?? ""}`}
    >
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">
        {value}
        {pulse && (
          <span className="ml-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-current opacity-60" />
        )}
      </p>
    </div>
  );
}

export default Dashboard;
