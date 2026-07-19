// ---------------------------------------------------------------------------
// Enums / union types
// ---------------------------------------------------------------------------

export type RunStatus = "running" | "completed" | "failed" | "cancelled";

export type Decision =
  | "keep"
  | "minor_revision"
  | "major_revision"
  | "reject";

export type EvidenceSufficiency = "sufficient" | "insufficient" | "partial";

export type ClaimStatus = "supported" | "unsupported" | "unverified";

// ---------------------------------------------------------------------------
// Review config payloads (sent by the client)
// ---------------------------------------------------------------------------

export interface RuleConditionPayload {
  type: string;
  params: Record<string, unknown>;
}

export interface DecisionRulePayload {
  name: string;
  priority: number;
  condition: RuleConditionPayload;
  target_decision: string;
}

export interface ScoringDimensionPayload {
  key: string;
  label: string;
  weight: number;
  description?: string;
}

export interface AnswerStyleConfigPayload {
  prefer_concise?: boolean;
  prefer_structured?: boolean;
  max_answer_length?: number;
}

export interface GuardConfigPayload {
  enable_safety_check?: boolean;
  enable_relevance_check?: boolean;
  max_retry_per_item?: number;
}

export interface RetryConfigPayload {
  max_retries?: number;
  retry_delay_seconds?: number;
  exponential_backoff?: boolean;
}

export interface ReviewConfigPayload {
  name?: string;
  scoring_dimensions?: ScoringDimensionPayload[];
  decision_rules?: DecisionRulePayload[];
  answer_style?: AnswerStyleConfigPayload;
  guard?: GuardConfigPayload;
  retry?: RetryConfigPayload;
}

export interface SettingsOverride {
  llm_model?: string;
  llm_provider?: string;
  llm_temperature?: number;
  llm_max_tokens?: number;
  review_concurrency?: number;
  data_dir?: string;
}

// ---------------------------------------------------------------------------
// QA item (input)
// ---------------------------------------------------------------------------

export interface QAItemPayload {
  id?: string;
  question: string;
  answer: string;
  subject?: string;
  grade_level?: string;
  knowledge_points?: string[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Request payloads
// ---------------------------------------------------------------------------

export interface ReviewSingleRequest {
  qa_item: QAItemPayload;
  config?: ReviewConfigPayload;
  settings_override?: SettingsOverride;
}

export interface StartBatchRequest {
  name?: string;
  qa_items: QAItemPayload[];
  config?: ReviewConfigPayload;
  settings_override?: SettingsOverride;
}

// ---------------------------------------------------------------------------
// Response types – health & settings
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: string;
  version?: string;
  data_dir?: string;
  data_dir_exists?: boolean;
  configs_loaded?: number;
}

export interface SettingsInfo {
  llm_provider: string;
  llm_model: string;
  llm_api_base?: string;
  llm_temperature?: number;
  llm_max_tokens?: number;
  data_dir?: string;
  review_concurrency?: number;
  max_retry_per_item?: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Response types – review
// ---------------------------------------------------------------------------

export interface DimensionScore {
  dimension: string;
  label: string;
  score: number;
  rationale?: string;
}

export interface ReviewScores {
  llm_label?: string;
  overall_score?: number;
  dimension_scores?: DimensionScore[];
  evidence_sufficiency?: EvidenceSufficiency;
  unsupported_claims?: UnsupportedClaim[];
  missing_key_points?: MissingKeyPoint[];
  redundancy_report?: RedundancyReport;
  raw_response?: string;
}

export interface UnsupportedClaim {
  claim: string;
  status: ClaimStatus;
  evidence_summary?: string;
}

export interface MissingKeyPoint {
  point: string;
  severity?: string;
}

export interface RedundancyReport {
  has_redundancy?: boolean;
  redundant_content?: string;
}

export interface ErrorDetail {
  step?: string;
  message: string;
  details?: string;
}

export interface ReviewSingleResponse {
  run_id?: string;
  status: string;
  original_qa?: QAItemPayload;
  review_scores?: ReviewScores;
  improved_qa?: QAItemPayload;
  final_decision?: Decision;
  errors?: ErrorDetail[];
  token_usage?: TokenUsage;
}

export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost_usd?: number;
}

// ---------------------------------------------------------------------------
// Response types – batch runs
// ---------------------------------------------------------------------------

export interface BatchRunResponse {
  run_id: string;
  name: string;
  status: RunStatus;
  created_at: string;
  qa_count: number;
}

export interface SpeedSummary {
  items_per_minute?: number;
  estimated_remaining_minutes?: number;
  avg_seconds_per_item?: number;
}

export interface RunProgress {
  run_id: string;
  name: string;
  status: RunStatus;
  progress: string;
  current?: number;
  total?: number;
  percentage?: number;
  speed_summary?: SpeedSummary;
  recent_errors?: string[];
}

export interface RunStat {
  run_id: string;
  name: string;
  status: RunStatus;
  qa_count: number;
  created_at: string;
  finished_at?: string;
  keep_count?: number;
  minor_revision_count?: number;
  major_revision_count?: number;
  reject_count?: number;
  error_count?: number;
}

export interface RunListResponse {
  runs: RunStat[];
}

// ---------------------------------------------------------------------------
// Export / report responses (FileResponse — client receives Blob)
// ---------------------------------------------------------------------------

export interface ExportSummary {
  total: number;
  keep: number;
  minor_revision: number;
  major_revision: number;
  reject: number;
  error: number;
}
