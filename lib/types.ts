// Shared types + enums, safe to import from client components
// (no better-sqlite3 dependency here).

export const APP_STATUSES = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
] as const;
export type AppStatus = (typeof APP_STATUSES)[number];

export const SPONSOR_STATUSES = ["recognised", "not_found", "unknown"] as const;
export type SponsorStatus = (typeof SPONSOR_STATUSES)[number];

export const PERMIT_FITS = [
  "HSM",
  "orientation_year",
  "other",
  "unknown",
] as const;
export type PermitFit = (typeof PERMIT_FITS)[number];

export const PERMIT_FIT_LABELS: Record<PermitFit, string> = {
  HSM: "Highly Skilled Migrant",
  orientation_year: "Orientation year",
  other: "Other",
  unknown: "Unknown",
};

export type Sponsor = {
  id: number;
  name: string;
  normalized_name: string;
  kvk: string | null;
  category: string;
  fetched_at: string;
};

export type Application = {
  id: number;
  company: string;
  role_title: string | null;
  job_url: string | null;
  sponsor_id: number | null;
  sponsor_status: SponsorStatus;
  permit_fit: PermitFit;
  status: AppStatus;
  notes: string | null;
  research_notes: string | null;
  likely_questions: string | null;
  debrief: string | null;
  created_at: string;
  updated_at: string;
};

export const COMPETENCIES = [
  { id: "analytical", label: "Analytical" },
  { id: "initiative", label: "Initiative" },
  { id: "technical", label: "Technical" },
  { id: "teamwork", label: "Teamwork" },
  { id: "leadership", label: "Leadership" },
  { id: "conflict", label: "Conflict" },
  { id: "deadline_pressure", label: "Deadline pressure" },
  { id: "communication", label: "Communication" },
  { id: "failure_learning", label: "Failure & learning" },
  { id: "commercial", label: "Commercial" },
] as const;
export type CompetencyId = (typeof COMPETENCIES)[number]["id"];

export type Story = {
  id: number;
  code: string | null;
  title: string;
  competencies: string; // comma-separated CompetencyId list
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
  learned: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

export type RegisterMeta = {
  category: string;
  last_refreshed_at: string | null;
  ind_last_updated: string | null;
  count: number;
};

export type CheckMatch = {
  id: number;
  name: string;
  kvk: string | null;
  score: number;
};

export type CheckResponse = {
  verdict: "recognised" | "possible" | "not_found" | "empty_register";
  matches: CheckMatch[];
  meta: RegisterMeta | null;
};

export type RefreshResponse = {
  category: string;
  previousCount: number;
  count: number;
  indLastUpdated: string | null;
  refreshedAt: string;
  error?: string;
};
