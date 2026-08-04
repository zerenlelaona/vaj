"use client";

import type { RegisterMeta } from "@/lib/sponsors";

/**
 * Replaces the old "Refresh IND register" button.
 *
 * A browser can't fetch ind.nl (CORS), so refreshing happens in CI instead:
 * a scheduled GitHub Action re-scrapes the register every month — the same
 * cadence the IND itself publishes at — and redeploys the site.
 */
export default function RegisterStatus({
  meta,
}: {
  meta: Pick<RegisterMeta, "indLastUpdated"> | null;
}) {
  if (!meta) return null;
  return (
    <p className="text-xs text-slate-400">
      {meta.indLastUpdated
        ? `IND register updated ${meta.indLastUpdated}`
        : "IND register"}{" "}
      · refreshed automatically each month
    </p>
  );
}
