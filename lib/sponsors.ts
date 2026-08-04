// Client-side access to the IND register + resolved company list.
//
// Both files are static build artifacts (see scripts/build-data.mjs), fetched
// once and cached in memory. A browser cannot fetch ind.nl directly (CORS),
// which is why the register ships with the app and is refreshed monthly by
// GitHub Actions instead of by a button.

import { matchScore, normalizeName } from "./normalize";
import type { Company } from "./companies";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type Sponsor = { name: string; kvk: string; norm: string };

export type RegisterMeta = {
  indLastUpdated: string | null;
  generatedAt: string;
  count: number;
};

export type ResolvedCompany = Company & {
  sponsor: { name: string; kvk: string } | null;
};

type SponsorsFile = {
  indLastUpdated: string | null;
  generatedAt: string;
  count: number;
  sponsors: [string, string][];
};

let registerPromise: Promise<{ meta: RegisterMeta; sponsors: Sponsor[] }> | null =
  null;
let companiesPromise: Promise<{
  meta: Pick<RegisterMeta, "indLastUpdated" | "generatedAt">;
  companies: ResolvedCompany[];
}> | null = null;

export function loadRegister() {
  if (!registerPromise) {
    registerPromise = fetch(`${BASE}/sponsors.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load the register (${r.status})`);
        return r.json() as Promise<SponsorsFile>;
      })
      .then((file) => ({
        meta: {
          indLastUpdated: file.indLastUpdated,
          generatedAt: file.generatedAt,
          count: file.count,
        },
        sponsors: file.sponsors.map(([name, kvk]) => ({
          name,
          kvk,
          norm: normalizeName(name),
        })),
      }))
      .catch((err) => {
        registerPromise = null; // let a later attempt retry
        throw err;
      });
  }
  return registerPromise;
}

export function loadResolvedCompanies() {
  if (!companiesPromise) {
    companiesPromise = fetch(`${BASE}/companies-resolved.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load companies (${r.status})`);
        return r.json();
      })
      .catch((err) => {
        companiesPromise = null;
        throw err;
      });
  }
  return companiesPromise;
}

/* ── Check page ───────────────────────────────────────────────────────── */

export type CheckMatch = { name: string; kvk: string; score: number };

export type CheckResult = {
  verdict: "recognised" | "possible" | "not_found";
  matches: CheckMatch[];
  meta: RegisterMeta;
};

export async function checkCompany(query: string): Promise<CheckResult> {
  const { meta, sponsors } = await loadRegister();
  const nq = normalizeName(query);

  const scored: CheckMatch[] = [];
  for (const s of sponsors) {
    const score = matchScore(nq, s.norm);
    if (score >= 0.4) scored.push({ name: s.name, kvk: s.kvk, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const matches = scored.slice(0, 5);

  const best = matches[0];
  const verdict =
    best && best.score >= 0.85
      ? "recognised"
      : best && best.score >= 0.6
        ? "possible"
        : "not_found";

  return { verdict, matches, meta };
}

/* ── Sponsors browser ─────────────────────────────────────────────────── */

export async function searchSponsors(
  query: string,
  limit: number,
  offset: number
): Promise<{ sponsors: Sponsor[]; total: number; meta: RegisterMeta }> {
  const { meta, sponsors } = await loadRegister();
  const q = query.trim().toLowerCase();
  const nq = normalizeName(query);

  const filtered = q
    ? sponsors.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (nq && s.norm.includes(nq)) ||
          s.kvk.includes(q)
      )
    : sponsors;

  return {
    sponsors: filtered.slice(offset, offset + limit),
    total: filtered.length,
    meta,
  };
}

/* ── Discover ─────────────────────────────────────────────────────────── */

export async function discoverCompanies(
  industry: string,
  functions: string[]
): Promise<{ companies: ResolvedCompany[]; meta: { indLastUpdated: string | null } }> {
  const data = await loadResolvedCompanies();
  let list = data.companies;
  if (industry) list = list.filter((c) => c.industry === industry);
  if (functions.length > 0) {
    list = list.filter((c) => c.functions.some((f) => functions.includes(f)));
  }
  const sorted = [...list].sort(
    (a, b) =>
      Number(!!b.sponsor) - Number(!!a.sponsor) || a.name.localeCompare(b.name)
  );
  return { companies: sorted, meta: data.meta };
}
