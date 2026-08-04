// Browser-side data store (replaces the old SQLite + API routes).
//
// Everything the user creates — tracked roles, STAR stories, prep notes —
// lives in localStorage on their own device. Nothing is ever uploaded, and
// nothing personal exists in the published repo.
//
// Because localStorage is per-browser, exportAll()/importAll() give the user a
// real backup file. All writes go through save(), which keeps one atomic blob.

import type { Application, Story } from "./types";

const KEY = "vaj.data.v1";

export type StoreData = {
  version: 1;
  applications: Application[];
  stories: Story[];
  applicationStories: { application_id: number; story_id: number }[];
};

const EMPTY: StoreData = {
  version: 1,
  applications: [],
  stories: [],
  applicationStories: [],
};

function isBrowser() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function load(): StoreData {
  if (!isBrowser()) return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return {
      version: 1,
      applications: parsed.applications ?? [],
      stories: parsed.stories ?? [],
      applicationStories: parsed.applicationStories ?? [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function save(data: StoreData) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

function nextId(rows: { id: number }[]) {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

const now = () => new Date().toISOString();

/* ── Applications ─────────────────────────────────────────────────────── */

export function listApplications(): Application[] {
  return load().applications.sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at)
  );
}

export function getApplication(id: number): Application | null {
  return load().applications.find((a) => a.id === id) ?? null;
}

export function createApplication(
  input: Partial<Application> & { company: string }
): Application {
  const data = load();
  const ts = now();
  const app: Application = {
    id: nextId(data.applications),
    company: input.company.trim(),
    role_title: input.role_title ?? null,
    job_url: input.job_url ?? null,
    sponsor_id: input.sponsor_id ?? null,
    sponsor_status: input.sponsor_status ?? "unknown",
    permit_fit: input.permit_fit ?? "unknown",
    status: input.status ?? "saved",
    notes: input.notes ?? null,
    research_notes: input.research_notes ?? null,
    likely_questions: input.likely_questions ?? null,
    debrief: input.debrief ?? null,
    created_at: ts,
    updated_at: ts,
  };
  data.applications.push(app);
  save(data);
  return app;
}

export function updateApplication(
  id: number,
  fields: Partial<Application>
): Application | null {
  const data = load();
  const idx = data.applications.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  data.applications[idx] = {
    ...data.applications[idx],
    ...fields,
    id,
    updated_at: now(),
  };
  save(data);
  return data.applications[idx];
}

export function deleteApplication(id: number) {
  const data = load();
  data.applications = data.applications.filter((a) => a.id !== id);
  data.applicationStories = data.applicationStories.filter(
    (l) => l.application_id !== id
  );
  save(data);
}

/* ── Stories ──────────────────────────────────────────────────────────── */

export function listStories(): Story[] {
  return load().stories.sort(
    (a, b) =>
      (a.code ?? "").localeCompare(b.code ?? "") ||
      a.title.localeCompare(b.title)
  );
}

// competencies are stored comma-separated but accepted as an array from forms
type StoryInput = Omit<Partial<Story>, "competencies"> & {
  competencies?: string | string[];
};

export function createStory(input: StoryInput & { title: string }): Story {
  const data = load();
  const ts = now();
  const story: Story = {
    id: nextId(data.stories),
    code: input.code ?? null,
    title: input.title.trim(),
    competencies: Array.isArray(input.competencies)
      ? input.competencies.join(",")
      : (input.competencies ?? ""),
    situation: input.situation ?? null,
    task: input.task ?? null,
    action: input.action ?? null,
    result: input.result ?? null,
    learned: input.learned ?? null,
    source: input.source ?? null,
    created_at: ts,
    updated_at: ts,
  };
  data.stories.push(story);
  save(data);
  return story;
}

export function updateStory(id: number, fields: StoryInput): Story | null {
  const data = load();
  const idx = data.stories.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const patch: Partial<Story> = {
    ...fields,
    competencies: Array.isArray(fields.competencies)
      ? fields.competencies.join(",")
      : fields.competencies,
  };
  if (patch.competencies === undefined) delete patch.competencies;
  data.stories[idx] = {
    ...data.stories[idx],
    ...patch,
    id,
    updated_at: now(),
  };
  save(data);
  return data.stories[idx];
}

export function deleteStory(id: number) {
  const data = load();
  data.stories = data.stories.filter((s) => s.id !== id);
  data.applicationStories = data.applicationStories.filter(
    (l) => l.story_id !== id
  );
  save(data);
}

/* ── Story <-> application links ──────────────────────────────────────── */

export function storiesForApplication(applicationId: number): Story[] {
  const data = load();
  const ids = new Set(
    data.applicationStories
      .filter((l) => l.application_id === applicationId)
      .map((l) => l.story_id)
  );
  return data.stories
    .filter((s) => ids.has(s.id))
    .sort(
      (a, b) =>
        (a.code ?? "").localeCompare(b.code ?? "") ||
        a.title.localeCompare(b.title)
    );
}

export function attachStory(applicationId: number, storyId: number) {
  const data = load();
  const exists = data.applicationStories.some(
    (l) => l.application_id === applicationId && l.story_id === storyId
  );
  if (!exists) {
    data.applicationStories.push({
      application_id: applicationId,
      story_id: storyId,
    });
    save(data);
  }
}

export function detachStory(applicationId: number, storyId: number) {
  const data = load();
  data.applicationStories = data.applicationStories.filter(
    (l) => !(l.application_id === applicationId && l.story_id === storyId)
  );
  save(data);
}

/* ── Backup ───────────────────────────────────────────────────────────── */

export function exportAll(): string {
  const data = load();
  return JSON.stringify(
    { ...data, exportedAt: now() },
    null,
    2
  );
}

export type ImportResult = {
  applications: number;
  stories: number;
  links: number;
};

/**
 * Replace everything with the contents of a backup file.
 * Throws on malformed input so the caller can show a real error.
 */
export function importAll(json: string): ImportResult {
  const parsed = JSON.parse(json) as Partial<StoreData>;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("That file isn't a VAJ backup.");
  }
  const data: StoreData = {
    version: 1,
    applications: Array.isArray(parsed.applications) ? parsed.applications : [],
    stories: Array.isArray(parsed.stories) ? parsed.stories : [],
    applicationStories: Array.isArray(parsed.applicationStories)
      ? parsed.applicationStories
      : [],
  };
  if (
    data.applications.length === 0 &&
    data.stories.length === 0
  ) {
    throw new Error("That backup has no roles or stories in it.");
  }
  save(data);
  return {
    applications: data.applications.length,
    stories: data.stories.length,
    links: data.applicationStories.length,
  };
}
