import { useState } from "react";
import {
  extractErrorMessage,
  reviewSingle,
} from "../api/client.ts";
import { ConfigPanel } from "../components/ConfigPanel.tsx";
import { ScoreBar } from "../components/ScoreBar.tsx";
import { loadSceneSettings, saveSceneSettings } from "../lib/storage.ts";
import type {
  QAItemPayload,
  ReviewConfigPayload,
  ReviewSingleResponse,
  ReviewScoresResponse,
  SettingsOverride,
} from "../types/api.ts";

// ---------------------------------------------------------------------------
// Helpers – score dimension labels
// ---------------------------------------------------------------------------

const SCORE_DIMS: { key: keyof ReviewScoresResponse; label: string }[] = [
  { key: "faithfulness", label: "忠实度" },
  { key: "completeness", label: "完整性" },
  { key: "depth_context", label: "深度/上下文" },
  { key: "formatting_norm", label: "格式规范" },
];

// ---------------------------------------------------------------------------
// Review – single QA review page
// ---------------------------------------------------------------------------

type TabId = "form" | "config";

export function Review() {
  // Form state
  const [instruction, setInstruction] = useState("");
  const [output, setOutput] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");

  // Config
  const [config, setConfig] = useState<ReviewConfigPayload>({});
  const [settingsOverride, setSettingsOverride] = useState<SettingsOverride>(
    () => loadSceneSettings<SettingsOverride>("review", {})
  );
  const [activeTab, setActiveTab] = useState<TabId>("form");

  // Result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewSingleResponse | null>(
    null,
  );

  const handleSubmit = async () => {
    if (!instruction.trim() || !output.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const qa: QAItemPayload = {
      instruction: instruction.trim(),
      output: output.trim(),
    } as QAItemPayload;
    if (subject.trim()) (qa as Record<string, unknown>).subject = subject.trim();
    if (gradeLevel.trim()) (qa as Record<string, unknown>).grade_level = gradeLevel.trim();

    try {
      const res = await reviewSingle({
        qa_item: qa,
        config: Object.keys(config).length > 0 ? config : undefined,
        settings_override:
          Object.keys(settingsOverride).length > 0
            ? settingsOverride
            : undefined,
        include_evidence: true,
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
      case "minor_rewrite":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
      case "major_rewrite":
        return "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400";
      case "reject":
        return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400";
      case "review_manually":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
      default:
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  const decisionLabel = (d: string | undefined) => {
    switch (d) {
      case "keep":
        return "保留";
      case "minor_rewrite":
        return "小改";
      case "major_rewrite":
        return "大改";
      case "reject":
        return "驳回";
      case "review_manually":
        return "需人工审核";
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
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
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
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
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
                  loading || !instruction.trim() || !output.trim()
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
                onSettingsChange={(next) => {
                  setSettingsOverride(next);
                  saveSceneSettings("review", next);
                }}
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
                  {result.decision && (
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${decisionColor(result.decision)}`}
                    >
                      {decisionLabel(result.decision)}
                    </span>
                  )}
                </div>

                {result.scores?.overall_score != null && (
                  <p className="mt-3 text-3xl font-bold tabular-nums">
                    {result.scores.overall_score.toFixed(1)}
                    <span className="text-base font-normal text-zinc-400">
                      {" "}
                      / 5.0
                    </span>
                  </p>
                )}

                {result.decision_source && (
                  <p className="mt-2 text-xs text-zinc-400">
                    判决来源: {result.decision_source}
                    {result.model_decision && ` · 模型判定: ${result.model_decision}`}
                    {result.decision_conflict && ` · ${result.decision_conflict}`}
                  </p>
                )}
              </div>

              {/* Dimension scores */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-4 font-semibold text-zinc-700 dark:text-zinc-300">
                  维度评分
                </h2>
                <div className="space-y-4">
                  {SCORE_DIMS.map((dim) => {
                    const score = result.scores[dim.key] as
                      | number
                      | undefined
                      | null;
                    if (score === undefined || score === null) return null;
                    return (
                      <ScoreBar
                        key={dim.key}
                        label={dim.label}
                        score={score}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Retrieved evidence + retrieval audit */}
              {((result.evidence && result.evidence.length > 0) ||
                result.retrieval_audit) && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-3 font-semibold text-zinc-700 dark:text-zinc-300">
                    检索证据
                  </h2>
                  {result.retrieval_audit && (
                    <div className="mb-4 flex flex-wrap gap-3 text-xs">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${
                          result.retrieval_audit.status === "ok"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                        }`}
                      >
                        检索状态: {result.retrieval_audit.status ?? "未知"}
                      </span>
                      {result.retrieval_audit.query_count !== undefined && (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          查询数: {result.retrieval_audit.query_count}
                        </span>
                      )}
                      {result.retrieval_audit.evidence_count !== undefined && (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          证据块: {result.retrieval_audit.evidence_count}
                        </span>
                      )}
                    </div>
                  )}
                  {result.evidence && result.evidence.length > 0 ? (
                    <ul className="space-y-3">
                      {result.evidence.map((ev, i) => (
                        <li
                          key={ev.chunk_id ?? i}
                          className="rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                              {ev.chunk_id}
                            </span>
                            {ev.score !== undefined && (
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                分数 {ev.score.toFixed(3)}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                            {ev.text}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            {[
                              ev.book_title,
                              ev.page_start !== undefined && ev.page_start !== null
                                ? `第 ${ev.page_start} 页`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      未检索到证据
                    </p>
                  )}
                </div>
              )}

              {/* Evidence sufficiency */}
              {result.evidence_sufficiency && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-2 font-semibold text-zinc-700 dark:text-zinc-300">
                    证据充分性
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {result.evidence_sufficiency}
                  </p>
                </div>
              )}

              {/* Unsupported claims */}
              {result.unsupported_claims.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-3 font-semibold text-zinc-700 dark:text-zinc-300">
                    无依据的主张
                  </h2>
                  <ul className="space-y-2">
                    {result.unsupported_claims.map((c, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-red-50 px-3 py-2 text-sm dark:bg-red-950/20"
                      >
                        <span className="font-medium text-red-800 dark:text-red-300">
                          {c.claim}
                        </span>
                        {c.reason && (
                          <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                            {c.reason}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing key points */}
              {result.missing_key_points.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-3 font-semibold text-zinc-700 dark:text-zinc-300">
                    遗漏要点
                  </h2>
                  <ul className="space-y-2">
                    {result.missing_key_points.map((p, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/20"
                      >
                        <span className="font-medium text-amber-800 dark:text-amber-300">
                          {p.point}
                        </span>
                        {p.requires_evidence !== undefined && (
                          <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                            {p.requires_evidence ? "(需要证据)" : "(不需要证据)"}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Redundancy */}
              {result.redundancy_or_overlap.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-3 font-semibold text-zinc-700 dark:text-zinc-300">
                    冗余/重叠
                  </h2>
                  <ul className="space-y-2">
                    {result.redundancy_or_overlap.map((r, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800"
                      >
                        <span className="font-medium">{r.item}</span>
                        {r.issue && (
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {r.issue}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Diagnosis */}
              {result.diagnosis && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-2 font-semibold text-zinc-700 dark:text-zinc-300">
                    诊断
                  </h2>
                  <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                    {result.diagnosis}
                  </p>
                </div>
              )}

              {/* Suggested QA */}
              {(result.suggested_question || result.suggested_answer) && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-3 font-semibold text-zinc-700 dark:text-zinc-300">
                    优化建议
                  </h2>
                  {result.suggested_question && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-zinc-500">
                        建议问题
                      </p>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {result.suggested_question}
                      </p>
                    </div>
                  )}
                  {result.suggested_answer && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500">
                        建议答案
                      </p>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {result.suggested_answer}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Cited evidence */}
              {result.cited_evidence.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-3 font-semibold text-zinc-700 dark:text-zinc-300">
                    引用证据
                  </h2>
                  <ul className="space-y-2">
                    {result.cited_evidence.map((e, i) => (
                      <li
                        key={e.chunk_id ?? i}
                        className="rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800"
                      >
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {e.chunk_id ?? `引用 ${i + 1}`}
                        </span>
                        {e.page !== undefined && e.page !== null && (
                          <span className="ml-2 text-xs text-zinc-500">
                            (第 {e.page} 页)
                          </span>
                        )}
                        {e.reason && (
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {e.reason}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rule flags */}
              {result.rule_flags.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-2 font-semibold text-zinc-700 dark:text-zinc-300">
                    规则标记
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {result.rule_flags.map((f, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Guard result */}
              {result.guard_result && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-2 font-semibold text-zinc-700 dark:text-zinc-300">
                    Guard 检查
                  </h2>
                  <pre className="overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {JSON.stringify(result.guard_result, null, 2)}
                  </pre>
                </div>
              )}

              {/* Backend error */}
              {result.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-800 dark:bg-red-950/20">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                    执行错误
                  </p>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {result.error}
                  </p>
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
