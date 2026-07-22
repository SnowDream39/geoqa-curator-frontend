// ---------------------------------------------------------------------------
// Enums / union types (matching backend Pydantic enums)
// ---------------------------------------------------------------------------

export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type Decision =
  | "keep"
  | "minor_rewrite"
  | "major_rewrite"
  | "reject"
  | "review_manually";

export type EvidenceSufficiency = "sufficient" | "partial" | "insufficient";

export type DecisionSource = "model" | "rules" | "model_and_rules";

// ---------------------------------------------------------------------------
// Configuration payloads (serializable equivalents of ReviewConfig)
// ---------------------------------------------------------------------------

export interface RuleConditionPayload {
  type: string;
  params: Record<string, unknown>;
}

export interface DecisionRulePayload {
  name: string;
  priority: number;
  target_decision: string;
  condition: RuleConditionPayload;
  description?: string;
}

export interface ScoringDimensionPayload {
  key: string;
  label: string;
  weight: number;
  min_value?: number;
  max_value?: number;
  description?: string;
  critical?: boolean;
}

export interface AnswerStyleConfigPayload {
  min_chars?: number;
  max_chars?: number | null;
  forbid_page_references?: boolean;
  forbid_process_language?: boolean;
  require_evidence_based?: boolean;
  allow_common_knowledge?: boolean;
  style_description?: string;
}

export interface GuardConfigPayload {
  min_suggested_answer_chars?: number;
  max_suggested_answer_chars?: number;
  question_intent_similarity_threshold?: number;
  enable_entity_check?: boolean;
  enable_page_ref_check?: boolean;
  enable_process_language_check?: boolean;
}

export interface RetryConfigPayload {
  max_retries?: number;
  base_delay_seconds?: number;
  max_delay_seconds?: number;
}

export interface ReviewConfigPayload {
  name?: string;
  description?: string;
  scoring_dimensions?: ScoringDimensionPayload[];
  decision_rules?: DecisionRulePayload[];
  valid_decisions?: string[];
  prompt_task_description?: string;
  prompt_extra_sections?: Record<string, string>;
  answer_style?: AnswerStyleConfigPayload;
  guard?: GuardConfigPayload;
  retry?: RetryConfigPayload;
}

// ---------------------------------------------------------------------------
// Settings override
// ---------------------------------------------------------------------------

export interface SettingsOverride {
  llm_provider?: string | null;
  llm_base_url?: string | null;
  llm_model?: string | null;
  llm_api_key?: string | null;
  llm_temperature?: number | null;
  llm_max_tokens?: number | null;
  review_concurrency?: number | null;
  data_dir?: string | null;
}

// ---------------------------------------------------------------------------
// QA Item payloads
// ---------------------------------------------------------------------------

export interface QAItemPayload {
  qa_id?: string;
  original_index?: number;
  instruction: string;
  output: string;
  system?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Review results (aligned with ReviewRecord / ReviewScores / LLMReviewOutput)
// ---------------------------------------------------------------------------

export interface UnsupportedClaim {
  claim: string;
  reason?: string;
}

export interface MissingKeyPoint {
  point: string;
  requires_evidence?: boolean;
}

export interface RedundancyReport {
  item: string;
  issue?: string;
}

/** A retrieved evidence chunk with provenance (from the vector store). */
export interface EvidenceChunk {
  chunk_id: string;
  book_title?: string | null;
  book_id?: string | null;
  source_pdf?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  text: string;
  score: number;
  distance?: number | null;
  heading_path?: string | null;
  retrieval_backend?: string | null;
  matched_keywords?: string[];
}

/** Diagnostics about the evidence retrieval step. */
export interface RetrievalAudit {
  status?: string;
  query_count?: number;
  evidence_count?: number;
  [key: string]: unknown;
}

/** Evidence cited by the LLM in its review output. */
export interface CitedEvidenceItem {
  page?: number | null;
  chunk_id?: string | null;
  reason?: string | null;
}

export interface ReviewScoresResponse {
  faithfulness?: number | null;
  completeness?: number | null;
  depth_context?: number | null;
  formatting_norm?: number | null;
  overall_score?: number | null;
  [key: string]: unknown;
}

export interface ReviewSingleResponse {
  qa_id: string;
  original_index: number;
  status: string;
  decision?: string | null;
  decision_source?: string | null;
  model_decision?: string | null;
  decision_conflict?: string | null;
  evidence_sufficiency?: string | null;
  scores: ReviewScoresResponse;
  unsupported_claims: UnsupportedClaim[];
  missing_key_points: MissingKeyPoint[];
  redundancy_or_overlap: RedundancyReport[];
  diagnosis?: string;
  suggested_question?: string | null;
  suggested_answer?: string | null;
  cited_evidence: CitedEvidenceItem[];
  evidence: EvidenceChunk[];
  retrieval_audit?: RetrievalAudit;
  rule_flags: string[];
  guard_result?: Record<string, unknown> | null;
  error?: string | null;
}

// ---------------------------------------------------------------------------
// Request payloads
// ---------------------------------------------------------------------------

export interface ReviewSingleRequest {
  qa_item: QAItemPayload;
  config?: ReviewConfigPayload;
  settings_override?: SettingsOverride;
  include_evidence?: boolean;
}

export interface StartBatchRequest {
  qa_items: QAItemPayload[];
  config?: ReviewConfigPayload;
  settings_override?: SettingsOverride;
  run_id?: string;
  dry_run?: boolean;
}

// ---------------------------------------------------------------------------
// Batch run models
// ---------------------------------------------------------------------------

export interface BatchRunResponse {
  run_id: string;
  status: RunStatus;
  item_count: number;
  message?: string;
}

export interface RunProgress {
  run_id: string;
  status: RunStatus;
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  started_at?: string | null;
  updated_at?: string | null;
  error?: string | null;
}

export interface RunStat {
  run_id: string;
  status: RunStatus;
  command?: string | null;
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  created_at?: string | null;
}

export interface RunListResponse {
  runs: RunStat[];
  count: number;
}

// ----- Run report summary (simple web report) -----------------------------

export interface ReportKeyValue {
  key: string;
  value: unknown;
}

export interface RunReportSummary {
  run_id: string;
  status: string;
  command?: string | null;
  dry_run: boolean;
  started_at?: string | null;
  finished_at?: string | null;
  stopped_due_to_api_failures: boolean;
  api_failure_streak_max: number;
  error?: string | null;
  qa_counts: {
    total: number;
    submitted: number;
    processed: number;
    failed: number;
    skipped: number;
    dry_run: boolean;
  };
  token_usage: ReportKeyValue[];
  writer_counts: ReportKeyValue[];
  distributions: {
    decision_counts?: Record<string, number> | null;
    status_counts?: Record<string, number> | null;
    error_type_counts?: Record<string, number> | null;
    score_distributions?: Record<string, Record<string, number>> | null;
  };
  export_summary: ReportKeyValue[];
  artifacts: {
    review_results?: string | null;
    improved_qa?: string | null;
    report?: string | null;
    expert_review_tasks?: string | null;
  };
}

// ----- Deep Review -----------------------------------------------------------

export interface DeepReviewRequest {
  run_id?: string | null;
  source_run_id: string;
  risk_score_min?: number;
  limit?: number | null;
  ids?: string[] | null;
  system_decisions?: string[] | null;
  evidence_sufficiencies?: string[] | null;
  qa_concurrency?: number;
  settings_override?: SettingsOverride | null;
}

export interface DeepReviewResponse {
  run_id: string;
  status: RunStatus;
  item_count: number;
  message?: string | null;
}

export interface DeepReviewSummary {
  selected_count?: number;
  completed_count?: number;
  failed_count?: number;
  qa_concurrency?: number;
  risk_score_min?: number;
  status_counts?: Record<string, number>;
  human_review_queue_count?: number;
  validation_warning_count?: number;
  primary_outputs?: Record<string, string>;
  results_jsonl?: string;
  [key: string]: unknown;
}

export interface DeepReviewProgress extends RunProgress {
  source_run_id?: string | null;
  summary?: DeepReviewSummary | null;
}

// ---------------------------------------------------------------------------
// Health / Settings
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: string;
  version: string;
  llm_provider: string;
  llm_model?: string | null;
  data_dir: string;
  output_root: string;
  checks: Record<string, string>;
}

export interface SettingsInfo {
  llm_provider: string;
  llm_base_url?: string | null;
  llm_model?: string | null;
  llm_temperature: number;
  llm_max_tokens: number;
  review_concurrency: number;
  judge_concurrency: number;
  data_dir: string;
  output_root: string;
  chroma_dir: string;
  log_dir: string;
  retrieval_books: string[];
  token_audit_enabled: boolean;
}

// ---------------------------------------------------------------------------
// Generic error
// ---------------------------------------------------------------------------

export interface ErrorDetail {
  detail: string;
  code?: string | null;
}
