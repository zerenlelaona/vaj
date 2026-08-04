"use client";

import { useState } from "react";
import Link from "next/link";
import { checkCompany, type CheckMatch, type CheckResult } from "@/lib/sponsors";
import { createApplication } from "@/lib/store";

export default function CheckPage() {
  const [query, setQuery] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedQuery, setCheckedQuery] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [roleTitle, setRoleTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");

  async function check(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setChecking(true);
    setResult(null);
    setError(null);
    setSaveState("idle");
    try {
      const data = await checkCompany(q);
      setResult(data);
      setCheckedQuery(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setChecking(false);
    }
  }

  function saveToTracker(match: CheckMatch | null) {
    setSaveState("saving");
    try {
      createApplication({
        company: match ? match.name : checkedQuery,
        role_title: roleTitle.trim() || null,
        job_url: jobUrl.trim() || null,
        sponsor_status: match ? "recognised" : "not_found",
        permit_fit: match ? "HSM" : "unknown",
        status: "saved",
      });
      setSaveState("saved");
    } catch {
      setSaveState("idle");
    }
  }

  const best = result?.matches[0] ?? null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">
        Is this company a recognised sponsor?
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Checks the official IND public register (Regular labour &amp; highly
        skilled migrants).
      </p>

      <form onSubmit={check} className="mt-6 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Company name — e.g. Adyen, Booking.com, ASML"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          disabled={checking || !query.trim()}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {checking ? "Checking…" : "Check"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`mt-6 rounded-xl border p-5 ${
            result.verdict === "recognised"
              ? "border-emerald-200 bg-emerald-50"
              : result.verdict === "possible"
                ? "border-amber-200 bg-amber-50"
                : "border-red-200 bg-red-50"
          }`}
        >
          {result.verdict === "recognised" && best && (
            <>
              <p className="text-lg font-semibold text-emerald-900">
                ✅ Recognised sponsor
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                <span className="font-medium">{best.name}</span>
                {best.kvk && (
                  <span className="text-emerald-700"> · KvK {best.kvk}</span>
                )}{" "}
                is in the IND register — it can sponsor a Highly Skilled
                Migrant permit.
              </p>
            </>
          )}
          {result.verdict === "possible" && (
            <>
              <p className="text-lg font-semibold text-amber-900">
                🤔 Possible match — check the spelling
              </p>
              <p className="mt-1 text-sm text-amber-800">
                No exact hit for “{checkedQuery}”, but these register entries
                are close:
              </p>
            </>
          )}
          {result.verdict === "not_found" && (
            <>
              <p className="text-lg font-semibold text-red-900">
                ❌ Not in the register
              </p>
              <p className="mt-1 text-sm text-red-800">
                “{checkedQuery}” doesn&apos;t match any recognised sponsor. They
                can&apos;t sponsor an HSM permit unless they become recognised
                (or you have an orientation-year visa that needs no sponsor).
              </p>
            </>
          )}

          {result.matches.length > 0 && result.verdict !== "recognised" && (
            <ul className="mt-3 space-y-1">
              {result.matches.map((m) => (
                <li
                  key={`${m.name}-${m.kvk}`}
                  className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm"
                >
                  <span>
                    {m.name}
                    {m.kvk && (
                      <span className="text-slate-400"> · KvK {m.kvk}</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400">
                    {(m.score * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-black/5 pt-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Role title (optional)"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <input
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="Job URL (optional)"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() =>
                  saveToTracker(result.verdict === "recognised" ? best : null)
                }
                disabled={saveState !== "idle"}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "saved"
                    ? "Saved ✓"
                    : "Save to tracker"}
              </button>
              {saveState === "saved" && (
                <Link
                  href="/tracker"
                  className="text-sm font-medium text-slate-600 underline hover:text-slate-900"
                >
                  Open tracker →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {result?.meta && (
        <p className="mt-4 text-xs text-slate-400">
          Register: {result.meta.count.toLocaleString()} work sponsors
          {result.meta.indLastUpdated &&
            ` · IND last updated ${result.meta.indLastUpdated}`}
        </p>
      )}
    </div>
  );
}
