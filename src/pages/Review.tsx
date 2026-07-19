import { useState } from "react";
import {
  extractErrorMessage,
  reviewSingle,
} from "../api/client.ts";
import { ConfigPanel } from "../components/ConfigPanel.tsx";
import { ScoreBar } from "../components/ScoreBar.tsx";
import type {
  QAItemPayload,
  ReviewConfigPayload,
  ReviewSingleResponse,
  SettingsOverride,
} from "../types/api.ts";

// ---------------------------------------------------------------------------
// Review – single QA review page
// ---------------------------------------------------------------------------

type TabId = "form" | "config";

export function Review() {
  // Form state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");

  // Config
  const [config, setConfig] = useState<ReviewConfigPayload>({});
  const [settingsOverride, setSettingsOverride] =
    useState<SettingsOverride>({});
  const [activeTab, setActiveTab] = useState<TabId>("form");

  // Result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewSingleResponse | null>(
    null,
  );

  const handleSubmit = async () => {
    if (!question.trim() || !answer.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const qa: QAItemPayload = {
      question: question.trim(),
      answer: answer.trim(),
    };
    if (subject.trim()) qa.subject = subject.trim();
    if (gradeLevel.trim()) qa.grade_level = gradeLevel.trim();

    try {
      const res = await reviewSingle({
        qa_item: qa,
        config: Object.keys(config).length > 0 ? config : undefined,
        settings_override:
          Object.keys(settingsOverride).length > 0
            ? settingsOverride
            : undefined,
      });
      setResult(res);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Decision badge colour
  const decisionColor = (d: string | undefined) => {
    switch (d) {
      case "keep":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
      case "minor_revision":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
      case "major_revision":
        return "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400";
      case "reject":
        return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400";
      default:
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  const decisionLabel = (d: string | undefined) => {
    switch (d) {
      case "keep":
        return "保留";
      case "minor_revision":
        return "小修";
      case "major_revision":
        return "大修";
      case "reject":
        return "驳回";
      default:
        return d ?? "未知";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          单条审核
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          输入问题和答案，实时获取 AI 审核结果
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Form + Config */}
        <div className="space-y-6 lg:col-span-2">
          {/* Tab bar */}
          <div className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
            {(
              [
                { id: "form", label: "📝 内容", emoji: "" },
                { id: "config", label: "⚙️ 参数", emoji: "" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === t.id
                    ? "bg-white text-primary shadow-sm dark:bg-zinc-700 dark:text-primary-light"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "form" ? (
            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  问题 <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="输入地理题目..."
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-primary dark:border-zinc-600 dark:focus:border-primary-light resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  答案 <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="输入参考答案..."
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-primary dark:border-zinc-600 dark:focus:border-primary-light resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    学科
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="如 地理"
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary dark:border-zinc-600 dark:focus:border-primary-light"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    年级
                  </label>
                  <input
                    type="text"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="如 高中"
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary dark:border-zinc-600 dark:focus:border-primary-light"
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={
                  loading || !question.trim() || !answer.trim()
                }
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-sm shadow-primary/25 transition-all hover:bg-primary-dark active:scale-[0.98] disabled:opacity-40"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    审核中...
                  </span>
                ) : (
                  "🚀 开始审核"
                )}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <ConfigPanel
                config={config}
                settingsOverride={settingsOverride}
                onConfigChange={setConfig}
                onSettingsChange={setSettingsOverride}
              />
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="space-y-4 lg:col-span-3">
          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-800 dark:bg-red-950/20">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                审核出错
              </p>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          )}

          {/* Loading placeholder */}
          {loading && !result && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-4 text-sm text-zinc-500">
                AI 正在审核您的题目...
              </p>
            </div>
          )}

          {/* Result card */}
          {result && (
            <div className="space-y-4 animate-slide-in">
              {/* Decision header */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">
                    审核结论
                  </h2>
                  {result.final_decision && (
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${decisionColor(result.final_decision)}`}
                    >
                      {decisionLabel(result.final_decision)}
                    </span>
                  )}
                </div>

                {result.review_scores?.overall_score !==
                  undefined && (
                  <p className="mt-3 text-3xl font-bold tabular-nums">
                    {result.review_scores.overall_score.toFixed(1)}
                    <span className="text-base font-normal text-zinc-400">
                      {" "}
                      / 5.0
                    </span>
                  </p>
                )}
              </div>

              {/* Dimension scores */}
              {result.review_scores?.dimension_scores &&
                result.review_scores.dimension_scores.length >
                  0 && (
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="mb-4 font-semibold text-zinc-700 dark:text-zinc-300">
                      维度评分
                    </h2>
                    <div className="space-y-4">
                      {result.review_scores.dimension_scores.map(
                        (dim) => (
                          <ScoreBar
                            key={dim.dimension}
                            label={dim.label}
                            score={dim.score}
                          />
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Evidence */}
              {result.review_scores?.evidence_sufficiency && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-2 font-semibold text-zinc-700 dark:text-zinc-300">
                    证据充分性
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {result.review_scores.evidence_sufficiency}
                  </p>
                </div>
              )}

              {/* Token usage */}
              {result.token_usage && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-2 font-semibold text-zinc-700 dark:text-zinc-300">
                    Token 用量
                  </h2>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-zinc-500">Prompt</p>
                      <p className="font-mono font-semibold">
                        {result.token_usage.prompt_tokens ??
                          "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Completion</p>
                      <p className="font-mono font-semibold">
                        {result.token_usage.completion_tokens ??
                          "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">总计</p>
                      <p className="font-mono font-semibold">
                        {result.token_usage.total_tokens ?? "-"}
                      </p>
                    </div>
                  </div>
                  {result.token_usage.cost_usd !==
                    undefined && (
                    <p className="mt-2 text-xs text-zinc-400">
                      估算成本: $
                      {result.token_usage.cost_usd.toFixed(6)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty state (no result, no loading, no error) */}
          {!result && !loading && !error && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-20 dark:border-zinc-700">
              <span className="text-4xl">🔍</span>
              <p className="mt-3 text-sm text-zinc-500">
                在左侧输入题目和答案，点击「开始审核」
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Review;
