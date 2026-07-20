import axios, { type AxiosError } from "axios";
import type {
  BatchRunResponse,
  HealthResponse,
  ReviewSingleRequest,
  ReviewSingleResponse,
  RunListResponse,
  RunProgress,
  SettingsInfo,
  StartBatchRequest,
} from "../types/api.ts";

// ---------------------------------------------------------------------------
// Axios instance – /api routes are proxied to the backend by Vite
// ---------------------------------------------------------------------------

const api = axios.create({
  baseURL: "/api",
  timeout: 300_000,
  headers: { "Content-Type": "application/json" },
});

// Longer timeout for file downloads
const apiLong = axios.create({
  baseURL: "/api",
  timeout: 300_000,
  responseType: "blob",
});

// ---------------------------------------------------------------------------
// Helper: extract error message from Axios errors
// ---------------------------------------------------------------------------

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const ae = err as AxiosError<{ detail?: string }>;
    return ae.response?.data?.detail ?? ae.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/** GET /api/health */
export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>("/health");
  return data;
}

/** GET /api/settings */
export async function fetchSettings(): Promise<SettingsInfo> {
  const { data } = await api.get<SettingsInfo>("/settings");
  return data;
}

/** POST /api/review/single */
export async function reviewSingle(
  payload: ReviewSingleRequest,
): Promise<ReviewSingleResponse> {
  const { data } = await api.post<ReviewSingleResponse>(
    "/review/single",
    payload,
  );
  return data;
}

/** POST /api/runs – start a batch review */
export async function startBatchRun(
  payload: StartBatchRequest,
): Promise<BatchRunResponse> {
  const { data } = await api.post<BatchRunResponse>("/runs", payload);
  return data;
}

/** GET /api/runs – list all runs */
export async function listRuns(): Promise<RunListResponse> {
  const { data } = await api.get<RunListResponse>("/runs");
  return data;
}

/** GET /api/runs/{run_id} – poll progress */
export async function getRunProgress(
  runId: string,
): Promise<RunProgress> {
  const { data } = await api.get<RunProgress>(`/runs/${runId}`);
  return data;
}

/** GET /api/runs/{run_id}/export – download improved QA JSONL */
export async function downloadRunExport(
  runId: string,
): Promise<Blob> {
  const { data } = await apiLong.get(`/runs/${runId}/export`);
  return data as Blob;
}

/** GET /api/runs/{run_id}/report – download review report */
export async function downloadRunReport(
  runId: string,
): Promise<Blob> {
  const { data } = await apiLong.get(`/runs/${runId}/report`);
  return data as Blob;
}
