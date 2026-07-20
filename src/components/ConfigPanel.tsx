import { type FC, useState } from "react";
import type {
  ReviewConfigPayload,
  ScoringDimensionPayload,
  SettingsOverride,
  DecisionRulePayload,
  RuleConditionPayload,
  AnswerStyleConfigPayload,
  GuardConfigPayload,
  RetryConfigPayload,
} from "../types/api.ts";

// ---------------------------------------------------------------------------
// ConfigPanel – full review config + settings override form
// ---------------------------------------------------------------------------

interface Props {
  config: ReviewConfigPayload;
  settingsOverride: SettingsOverride;
  onConfigChange: (c: ReviewConfigPayload) => void;
  onSettingsChange: (s: SettingsOverride) => void;
}

type TabId = "scoring" | "answer" | "guard" | "rules" | "retry" | "llm" | "advanced";

const TABS: { id: TabId; label: string }[] = [
  { id: "scoring", label: "评分维度" },
  { id: "answer", label: "答案风格" },
  { id: "guard", label: "Guard 检查" },
  { id: "rules", label: "决策规则" },
  { id: "retry", label: "重试策略" },
  { id: "llm", label: "LLM" },
  { id: "advanced", label: "高级" },
];

// Pre-built dimension templates
const DIMENSION_TEMPLATES = [
  { key: "faithfulness", label: "忠实度", weight: 0.4, description: "答案是否忠实于知识点" },
  { key: "completeness", label: "完整度", weight: 0.3, description: "答案是否覆盖所有要点" },
  { key: "depth_context", label: "深度与上下文", weight: 0.15, description: "答案是否具备深度和上下文" },
  { key: "formatting_norm", label: "格式规范", weight: 0.15, description: "格式是否符合规范" },
];

const VALID_DECISIONS = [
  "keep",
  "minor_rewrite",
  "major_rewrite",
  "merge_duplicate",
  "reject",
  "review_manually",
  "__model__",
];

const CONDITION_TYPES: { value: string; label: string; desc: string }[] = [
  { value: "dim_le", label: "维度 ≤ 阈值", desc: "当某个维度分数 ≤ 阈值时触发" },
  { value: "overall_score_le", label: "总分 ≤ 阈值", desc: "当整体分数 ≤ 阈值时触发" },
  { value: "all_dims_ge", label: "所有维度 ≥ 阈值", desc: "当所有维度分数都 ≥ 阈值时触发" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeAnswerStyle(
  config: ReviewConfigPayload,
  patch: Partial<AnswerStyleConfigPayload>,
): ReviewConfigPayload {
  return {
    ...config,
    answer_style: { ...config.answer_style, ...patch } as AnswerStyleConfigPayload,
  };
}

function mergeGuard(
  config: ReviewConfigPayload,
  patch: Partial<GuardConfigPayload>,
): ReviewConfigPayload {
  return {
    ...config,
    guard: { ...config.guard, ...patch } as GuardConfigPayload,
  };
}

function mergeRetry(
  config: ReviewConfigPayload,
  patch: Partial<RetryConfigPayload>,
): ReviewConfigPayload {
  return {
    ...config,
    retry: { ...config.retry, ...patch } as RetryConfigPayload,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ConfigPanel: FC<Props> = ({
  config,
  settingsOverride,
  onConfigChange,
  onSettingsChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>("scoring");
  const [dimensions, setDimensions] = useState<ScoringDimensionPayload[]>(
    config.scoring_dimensions ?? [],
  );
  const [newDimLabel, setNewDimLabel] = useState("");
  const [newDimWeight, setNewDimWeight] = useState("0.1");

  // Decision rules local state
  const rules = config.decision_rules ?? [];
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleType, setNewRuleType] = useState("dim_le");
  const [newRuleThreshold, setNewRuleThreshold] = useState("3");
  const [newRuleDimKey, setNewRuleDimKey] = useState("");
  const [newRuleDecision, setNewRuleDecision] = useState("reject");

  // Prompt extra sections
  const [extraSectionKey, setExtraSectionKey] = useState("");
  const [extraSectionBody, setExtraSectionBody] = useState("");

  // ---- Scoring helpers ----
  const syncDims = (dims: ScoringDimensionPayload[]) => {
    setDimensions(dims);
    onConfigChange({ ...config, scoring_dimensions: dims });
  };

  const addTemplate = (t: (typeof DIMENSION_TEMPLATES)[number]) => {
    if (dimensions.find((d) => d.key === t.key)) return;
    syncDims([...dimensions, { ...t }]);
  };

  const addCustom = () => {
    const label = newDimLabel.trim();
    const weight = parseFloat(newDimWeight);
    if (!label || isNaN(weight) || weight <= 0) return;
    const key = label.toLowerCase().replace(/\s+/g, "_");
    if (dimensions.find((d) => d.key === key)) return;
    syncDims([...dimensions, { key, label, weight }]);
    setNewDimLabel("");
    setNewDimWeight("0.1");
  };

  const removeDim = (key: string) => {
    syncDims(dimensions.filter((d) => d.key !== key));
  };

  // ---- Decision rule helpers ----
  const addRule = () => {
    const name = newRuleName.trim();
    if (!name) return;
    const threshold = parseFloat(newRuleThreshold);
    if (isNaN(threshold)) return;

    let condition: RuleConditionPayload;
    if (newRuleType === "dim_le") {
      const dimKey = newRuleDimKey || (dimensions[0]?.key ?? "");
      if (!dimKey) return;
      condition = { type: "dim_le", params: { dim_key: dimKey, threshold } };
    } else if (newRuleType === "overall_score_le") {
      condition = { type: "overall_score_le", params: { threshold } };
    } else {
      condition = { type: "all_dims_ge", params: { threshold } };
    }

    const newRule: DecisionRulePayload = {
      name,
      priority: rules.length,
      target_decision: newRuleDecision,
      condition,
    };
    onConfigChange({ ...config, decision_rules: [...rules, newRule] });
    setNewRuleName("");
    setNewRuleThreshold("3");
    setNewRuleDecision("reject");
  };

  const removeRule = (idx: number) => {
    onConfigChange({
      ...config,
      decision_rules: rules.filter((_, i) => i !== idx).map((r, i) => ({ ...r, priority: i })),
    });
  };

  // ---- Prompt extra sections helpers ----
  const addExtraSection = () => {
    const k = extraSectionKey.trim();
    const v = extraSectionBody.trim();
    if (!k || !v) return;
    onConfigChange({
      ...config,
      prompt_extra_sections: { ...(config.prompt_extra_sections ?? {}), [k]: v },
    });
    setExtraSectionKey("");
    setExtraSectionBody("");
  };

  const removeExtraSection = (k: string) => {
    const sections = { ...(config.prompt_extra_sections ?? {}) };
    delete sections[k];
    onConfigChange({ ...config, prompt_extra_sections: sections });
  };

  // ---- Shared input class ----
  const inputCls =
    "mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-primary dark:border-zinc-600 dark:focus:border-primary-light";
  const labelCls = "text-xs font-medium text-zinc-500";
  const sectionCls = "space-y-4 animate-fade-in";

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex flex-wrap rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === t.id
                ? "bg-white text-primary shadow-sm dark:bg-zinc-700 dark:text-primary-light"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* Scoring Dimensions tab */}
      {/* ================================================================== */}
      {activeTab === "scoring" && (
        <div className={sectionCls}>
          {/* Templates */}
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">快速添加</p>
            <div className="flex flex-wrap gap-2">
              {DIMENSION_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => addTemplate(t)}
                  disabled={!!dimensions.find((d) => d.key === t.key)}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-primary hover:text-primary disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-primary-light dark:hover:text-primary-light"
                >
                  + {t.label} (×{t.weight})
                </button>
              ))}
            </div>
          </div>

          {/* Custom add */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className={labelCls}>自定义维度</label>
              <input
                type="text"
                value={newDimLabel}
                onChange={(e) => setNewDimLabel(e.target.value)}
                placeholder="维度名称"
                className={inputCls}
              />
            </div>
            <div className="w-24">
              <label className={labelCls}>权重</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={newDimWeight}
                onChange={(e) => setNewDimWeight(e.target.value)}
                className={inputCls}
              />
            </div>
            <button
              onClick={addCustom}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              + 添加
            </button>
          </div>

          {/* Dimension list */}
          {dimensions.length > 0 && (
            <ul className="space-y-2">
              {dimensions.map((d, i) => (
                <li
                  key={d.key}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-2.5 dark:border-zinc-700"
                >
                  <span className="text-xs text-zinc-400 font-mono">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate dark:text-zinc-200">
                      {d.label}
                      {d.critical && (
                        <span className="ml-1.5 text-[10px] text-amber-500 font-normal">● 关键</span>
                      )}
                    </p>
                    {d.description && (
                      <p className="text-xs text-zinc-400 truncate">{d.description}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:text-primary-light">
                    ×{d.weight}
                  </span>
                  <button
                    onClick={() => removeDim(d.key)}
                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    title="移除"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* Answer Style tab */}
      {/* ================================================================== */}
      {activeTab === "answer" && (
        <div className={sectionCls}>
          <p className="text-xs text-zinc-400 mb-1">
            约束 LLM 改写答案的格式和内容风格
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>最少字符数</label>
              <input
                type="number"
                min={1}
                value={config.answer_style?.min_chars ?? ""}
                onChange={(e) =>
                  onConfigChange(
                    mergeAnswerStyle(config, {
                      min_chars: e.target.value ? parseInt(e.target.value) : undefined,
                    }),
                  )
                }
                placeholder="40"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>最多字符数</label>
              <input
                type="number"
                min={1}
                value={config.answer_style?.max_chars ?? ""}
                onChange={(e) =>
                  onConfigChange(
                    mergeAnswerStyle(config, {
                      max_chars: e.target.value ? parseInt(e.target.value) : null,
                    }),
                  )
                }
                placeholder="1000"
                className={inputCls}
              />
            </div>
          </div>

          <div className="space-y-2.5">
            {([
              { key: "forbid_page_references", label: "禁止引用页码", desc: "答案中不允许出现页码引用" },
              {
                key: "forbid_process_language",
                label: "禁止过程性语言",
                desc: "禁止 '接下来','首先' 等授课/引导用语",
              },
              {
                key: "require_evidence_based",
                label: "要求基于证据",
                desc: "答案必须引用已检索的证据",
              },
              {
                key: "allow_common_knowledge",
                label: "允许常识补充",
                desc: "允许使用公认的常识性知识",
              },
            ] as { key: keyof AnswerStyleConfigPayload; label: string; desc: string }[]).map((item) => (
              <label
                key={item.key}
                className="flex items-start gap-3 rounded-lg border border-zinc-200 px-4 py-2.5 cursor-pointer hover:border-primary/50 transition-colors dark:border-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={!!(config.answer_style as Record<string, unknown>)?.[item.key]}
                  onChange={(e) =>
                    onConfigChange(
                      mergeAnswerStyle(config, { [item.key]: e.target.checked }),
                    )
                  }
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{item.label}</p>
                  <p className="text-xs text-zinc-400">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div>
            <label className={labelCls}>自定义风格描述</label>
            <textarea
              rows={2}
              value={config.answer_style?.style_description ?? ""}
              onChange={(e) =>
                onConfigChange(mergeAnswerStyle(config, { style_description: e.target.value }))
              }
              placeholder="例如：使用简体中文、学术化表达、避免口语..."
              className={inputCls}
            />
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Guard tab */}
      {/* ================================================================== */}
      {activeTab === "guard" && (
        <div className={sectionCls}>
          <p className="text-xs text-zinc-400 mb-1">
            LLM 改写后的答案需要满足的 Guard 检查参数
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>建议答案最少字符</label>
              <input
                type="number"
                min={1}
                value={config.guard?.min_suggested_answer_chars ?? ""}
                onChange={(e) =>
                  onConfigChange(
                    mergeGuard(config, {
                      min_suggested_answer_chars: e.target.value ? parseInt(e.target.value) : undefined,
                    }),
                  )
                }
                placeholder="40"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>建议答案最多字符</label>
              <input
                type="number"
                min={1}
                value={config.guard?.max_suggested_answer_chars ?? ""}
                onChange={(e) =>
                  onConfigChange(
                    mergeGuard(config, {
                      max_suggested_answer_chars: e.target.value ? parseInt(e.target.value) : undefined,
                    }),
                  )
                }
                placeholder="1000"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              问题意图相似度阈值（{config.guard?.question_intent_similarity_threshold ?? 0.6}）
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.guard?.question_intent_similarity_threshold ?? 0.6}
              onChange={(e) =>
                onConfigChange(
                  mergeGuard(config, { question_intent_similarity_threshold: parseFloat(e.target.value) }),
                )
              }
              className="mt-1 w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-1">
              <span>0 (宽松)</span>
              <span>1 (严格)</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {([
              { key: "enable_entity_check", label: "实体检查", desc: "检查改写答案是否保留了关键实体" },
              { key: "enable_page_ref_check", label: "页码引用检查", desc: "检查是否错误添加了页码引用" },
              {
                key: "enable_process_language_check",
                label: "过程性语言检查",
                desc: "检查是否含有过程性/引导性用语",
              },
            ] as { key: keyof GuardConfigPayload; label: string; desc: string }[]).map((item) => (
              <label
                key={item.key}
                className="flex items-start gap-3 rounded-lg border border-zinc-200 px-4 py-2.5 cursor-pointer hover:border-primary/50 transition-colors dark:border-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={!!(config.guard as Record<string, unknown>)?.[item.key]}
                  onChange={(e) =>
                    onConfigChange(mergeGuard(config, { [item.key]: e.target.checked }))
                  }
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{item.label}</p>
                  <p className="text-xs text-zinc-400">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Decision Rules tab */}
      {/* ================================================================== */}
      {activeTab === "rules" && (
        <div className={sectionCls}>
          <p className="text-xs text-zinc-400 mb-1">
            规则按优先级从上到下匹配，命中后不再继续
          </p>

          {/* Add form */}
          <div className="rounded-lg border border-zinc-200 p-3 space-y-3 dark:border-zinc-700">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>规则名称</label>
                <input
                  type="text"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="如 低分拒绝"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>条件类型</label>
                <select
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value)}
                  className={inputCls}
                >
                  {CONDITION_TYPES.map((ct) => (
                    <option key={ct.value} value={ct.value}>
                      {ct.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>目标判定</label>
                <select
                  value={newRuleDecision}
                  onChange={(e) => setNewRuleDecision(e.target.value)}
                  className={inputCls}
                >
                  {VALID_DECISIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {newRuleType === "dim_le" && (
                <div>
                  <label className={labelCls}>目标维度</label>
                  <select
                    value={newRuleDimKey}
                    onChange={(e) => setNewRuleDimKey(e.target.value)}
                    className={inputCls}
                  >
                    {dimensions.length === 0 && <option value="">请先在"评分维度"中添加</option>}
                    {dimensions.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={labelCls}>
                  {newRuleType === "all_dims_ge" ? "最低分" : "阈值（≤）"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={1}
                  value={newRuleThreshold}
                  onChange={(e) => setNewRuleThreshold(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <button
              onClick={addRule}
              className="w-full rounded-lg border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-500 transition-colors hover:border-primary hover:text-primary dark:border-zinc-600 dark:hover:border-primary-light dark:hover:text-primary-light"
            >
              + 添加规则
            </button>
          </div>

          {/* Rule list */}
          {rules.length > 0 && (
            <ul className="space-y-2">
              {rules.map((rule, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-2.5 dark:border-zinc-700"
                >
                  <span className="text-xs text-zinc-400 font-mono whitespace-nowrap">
                    P{rule.priority}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate dark:text-zinc-200">
                      {rule.name}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {CONDITION_TYPES.find((ct) => ct.value === rule.condition.type)?.label ??
                        rule.condition.type}
                      {" → "}
                      {rule.target_decision}
                    </p>
                  </div>
                  <button
                    onClick={() => removeRule(i)}
                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    title="移除"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* Retry tab */}
      {/* ================================================================== */}
      {activeTab === "retry" && (
        <div className={sectionCls}>
          <p className="text-xs text-zinc-400 mb-1">
            LLM 调用失败时的重试策略
          </p>

          <div>
            <label className={labelCls}>最大重试次数</label>
            <input
              type="number"
              min={0}
              max={10}
              value={config.retry?.max_retries ?? ""}
              onChange={(e) =>
                onConfigChange(
                  mergeRetry(config, {
                    max_retries: e.target.value ? parseInt(e.target.value) : undefined,
                  }),
                )
              }
              placeholder="3"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>初始延迟（秒）</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={config.retry?.base_delay_seconds ?? ""}
              onChange={(e) =>
                onConfigChange(
                  mergeRetry(config, {
                    base_delay_seconds: e.target.value ? parseFloat(e.target.value) : undefined,
                  }),
                )
              }
              placeholder="2.0"
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              每次重试延迟递增，使用指数退避
            </p>
          </div>

          <div>
            <label className={labelCls}>最大延迟（秒）</label>
            <input
              type="number"
              min={1}
              value={config.retry?.max_delay_seconds ?? ""}
              onChange={(e) =>
                onConfigChange(
                  mergeRetry(config, {
                    max_delay_seconds: e.target.value ? parseFloat(e.target.value) : undefined,
                  }),
                )
              }
              placeholder="30.0"
              className={inputCls}
            />
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* LLM tab */}
      {/* ================================================================== */}
      {activeTab === "llm" && (
        <div className={sectionCls}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>模型</label>
              <input
                type="text"
                placeholder="如 deepseek-v3"
                value={settingsOverride.llm_model ?? ""}
                onChange={(e) =>
                  onSettingsChange({
                    ...settingsOverride,
                    llm_model: e.target.value || undefined,
                  })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Provider</label>
              <input
                type="text"
                placeholder="如 openai"
                value={settingsOverride.llm_provider ?? ""}
                onChange={(e) =>
                  onSettingsChange({
                    ...settingsOverride,
                    llm_provider: e.target.value || undefined,
                  })
                }
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Base URL</label>
            <input
              type="text"
              placeholder="API 地址（覆盖默认值）"
              value={settingsOverride.llm_base_url ?? ""}
              onChange={(e) =>
                onSettingsChange({
                  ...settingsOverride,
                  llm_base_url: e.target.value || undefined,
                })
              }
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Temperature ({settingsOverride.llm_temperature ?? "默认"})
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={settingsOverride.llm_temperature ?? 0.7}
                onChange={(e) =>
                  onSettingsChange({
                    ...settingsOverride,
                    llm_temperature: parseFloat(e.target.value),
                  })
                }
                className="mt-1 w-full accent-primary"
              />
            </div>
            <div>
              <label className={labelCls}>Max Tokens</label>
              <input
                type="number"
                placeholder="如 4096"
                value={settingsOverride.llm_max_tokens ?? ""}
                onChange={(e) =>
                  onSettingsChange({
                    ...settingsOverride,
                    llm_max_tokens: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className={inputCls}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Advanced tab (concurrency + data_dir + prompt) */}
      {/* ================================================================== */}
      {activeTab === "advanced" && (
        <div className={sectionCls}>
          <div>
            <label className={labelCls}>
              并发数 ({settingsOverride.review_concurrency ?? "默认"})
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={settingsOverride.review_concurrency ?? 3}
              onChange={(e) =>
                onSettingsChange({
                  ...settingsOverride,
                  review_concurrency: parseInt(e.target.value),
                })
              }
              className="mt-1 w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-1">
              <span>1</span>
              <span>{settingsOverride.review_concurrency ?? 3}</span>
              <span>10</span>
            </div>
          </div>

          <div>
            <label className={labelCls}>数据目录</label>
            <input
              type="text"
              placeholder="默认使用 .env 配置"
              value={settingsOverride.data_dir ?? ""}
              onChange={(e) =>
                onSettingsChange({
                  ...settingsOverride,
                  data_dir: e.target.value || undefined,
                })
              }
              className={inputCls}
            />
          </div>

          <hr className="border-zinc-200 dark:border-zinc-700" />

          {/* Prompt task description */}
          <div>
            <label className={labelCls}>Prompt 任务描述</label>
            <textarea
              rows={3}
              value={config.prompt_task_description ?? ""}
              onChange={(e) =>
                onConfigChange({ ...config, prompt_task_description: e.target.value })
              }
              placeholder="自定义 LLM 系统指令中的任务描述..."
              className={inputCls}
            />
          </div>

          {/* Prompt extra sections */}
          <div>
            <label className={labelCls}>Prompt 附加章节</label>
            <p className="text-xs text-zinc-400 mb-2">
              在评分维度之后、开始评审之前插入的自定义内容
            </p>

            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={extraSectionKey}
                onChange={(e) => setExtraSectionKey(e.target.value)}
                placeholder="章节标题"
                className={`${inputCls} flex-1`}
              />
              <input
                type="text"
                value={extraSectionBody}
                onChange={(e) => setExtraSectionBody(e.target.value)}
                placeholder="章节内容"
                className={`${inputCls} flex-[2]`}
              />
              <button
                onClick={addExtraSection}
                className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 shrink-0"
              >
                + 添加
              </button>
            </div>

            {/* Extra sections list */}
            {config.prompt_extra_sections &&
              Object.keys(config.prompt_extra_sections).length > 0 && (
                <ul className="space-y-1.5">
                  {Object.entries(config.prompt_extra_sections).map(([k, v]) => (
                    <li
                      key={k}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
                    >
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 shrink-0">
                        {k}
                      </span>
                      <span className="text-xs text-zinc-400 truncate flex-1">{v}</span>
                      <button
                        onClick={() => removeExtraSection(k)}
                        className="shrink-0 rounded p-0.5 text-zinc-400 hover:text-red-500"
                        title="移除"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigPanel;
