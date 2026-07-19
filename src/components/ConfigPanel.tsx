import { type FC, useState } from "react";
import type {
  ReviewConfigPayload,
  ScoringDimensionPayload,
  SettingsOverride,
} from "../types/api.ts";

// ---------------------------------------------------------------------------
// ConfigPanel – review config + settings override form
// ---------------------------------------------------------------------------

interface Props {
  config: ReviewConfigPayload;
  settingsOverride: SettingsOverride;
  onConfigChange: (c: ReviewConfigPayload) => void;
  onSettingsChange: (s: SettingsOverride) => void;
}

type TabId = "scoring" | "llm" | "concurrency";

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: "scoring", label: "评分维度", emoji: "📊" },
  { id: "llm", label: "LLM 参数", emoji: "🤖" },
  { id: "concurrency", label: "并发 & 其他", emoji: "⚡" },
];

// Pre-built dimension templates
const DIMENSION_TEMPLATES = [
  { key: "faithfulness", label: "忠实度", weight: 0.4, description: "答案是否忠实于知识点" },
  { key: "completeness", label: "完整度", weight: 0.3, description: "答案是否覆盖所有要点" },
  { key: "clarity", label: "清晰度", weight: 0.15, description: "表述是否清晰易懂" },
  { key: "correctness", label: "正确性", weight: 0.15, description: "内容是否准确无误" },
];

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

  // Sync dimensions up to parent
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

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === t.id
                ? "bg-white text-primary shadow-sm dark:bg-zinc-700 dark:text-primary-light"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Scoring Dimensions tab */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "scoring" && (
        <div className="space-y-4 animate-fade-in">
          {/* Templates */}
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
              快速添加
            </p>
            <div className="flex flex-wrap gap-2">
              {DIMENSION_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => addTemplate(t)}
                  disabled={!!dimensions.find((d) => d.key === t.key)}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-primary hover:text-primary disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-primary-light dark:hover:text-primary-light"
                >
                  + {t.label} ({t.weight})
                </button>
              ))}
            </div>
          </div>

          {/* Custom add */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-zinc-500">自定义维度</label>
              <input
                type="text"
                value={newDimLabel}
                onChange={(e) => setNewDimLabel(e.target.value)}
                placeholder="维度名称"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-primary dark:border-zinc-600 dark:focus:border-primary-light"
              />
            </div>
            <div className="w-24">
              <label className="text-xs text-zinc-500">权重</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={newDimWeight}
                onChange={(e) => setNewDimWeight(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-primary dark:border-zinc-600 dark:focus:border-primary-light"
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
                  <span className="text-xs text-zinc-400 font-mono">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate dark:text-zinc-200">
                      {d.label}
                    </p>
                    <p className="text-xs text-zinc-400">key: {d.key}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:text-primary-light">
                    ×{d.weight}
                  </span>
                  <button
                    onClick={() => removeDim(d.key)}
                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
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

      {/* ------------------------------------------------------------------ */}
      {/* LLM Parameters tab */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "llm" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500">
                模型
              </label>
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
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-600 dark:focus:border-primary-light"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">
                Provider
              </label>
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
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-600 dark:focus:border-primary-light"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500">
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
              <label className="text-xs font-medium text-zinc-500">
                Max Tokens
              </label>
              <input
                type="number"
                placeholder="如 4096"
                value={settingsOverride.llm_max_tokens ?? ""}
                onChange={(e) =>
                  onSettingsChange({
                    ...settingsOverride,
                    llm_max_tokens: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-600 dark:focus:border-primary-light"
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Concurrency & Misc tab */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "concurrency" && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="text-xs font-medium text-zinc-500">
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
            <label className="text-xs font-medium text-zinc-500">
              数据目录
            </label>
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
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-600 dark:focus:border-primary-light"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigPanel;
