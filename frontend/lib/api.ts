export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://ai-gov-7d7t.onrender.com/api";

export interface ProjectLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface DetectedObject {
  class: string;
  count: number;
  confidence: number;
}

export interface AiAnalysis {
  confidence_score: number;
  label: string;
  detail: string;
  bounding_box_image: string;
  last_analyzed: string;
  // Only present once the /ai-report endpoint has been merged in
  detected_objects?: DetectedObject[];
}

export interface AiReport {
  project_id: number;
  confidence_score: number;
  label: string;
  detail: string;
  bounding_box_image: string;
  detected_objects: DetectedObject[];
  last_analyzed: string;
}

export interface WhatsappReports {
  count: number;
  summary: string;
  last_report: string;
}

export interface ProjectBudget {
  official_ngn: number;
  official_usd: number;
  disbursed_ngn: number;
  disbursed_usd: number;
}

export interface ProjectTimeline {
  start_date: string;
  expected_end: string;
  completion_pct: number;
}

export interface Project {
  id: number;
  name: string;
  status: string;
  sector: string;
  location: ProjectLocation;
  ai_analysis: AiAnalysis;
  whatsapp_reports: WhatsappReports;
  // Only present on the detail endpoint (and in the offline fallback data)
  description?: string;
  budget?: ProjectBudget;
  timeline?: ProjectTimeline;
}

const FETCH_TIMEOUT_MS = 10000;

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GET /projects failed: ${res.status}`);
  return res.json();
}

export async function fetchProjectDetail(id: number): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GET /projects/${id} failed: ${res.status}`);
  return res.json();
}

export async function fetchAiReport(id: number): Promise<AiReport> {
  const res = await fetch(`${API_BASE_URL}/projects/${id}/ai-report`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok)
    throw new Error(`GET /projects/${id}/ai-report failed: ${res.status}`);
  return res.json();
}

