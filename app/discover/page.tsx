"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  COMPANIES,
  Company,
  FUNCTIONS,
  FunctionId,
  INDUSTRIES,
  IndustryId,
} from "@/lib/companies";
import { discoverCompanies, type ResolvedCompany } from "@/lib/sponsors";
import { createApplication } from "@/lib/store";

type DiscoverCompany = ResolvedCompany;

const industryCounts = COMPANIES.reduce<Record<string, number>>((acc, c) => {
  acc[c.industry] = (acc[c.industry] ?? 0) + 1;
  return acc;
}, {});

export default function DiscoverPage() {
  const [industry, setIndustry] = useState<IndustryId | null>(null);
  const [fns, setFns] = useState<FunctionId[]>([]);
  const [resultFilter, setResultFilter] = useState("");
  const [companies, setCompanies] = useState<DiscoverCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracked, setTracked] = useState<Record<string, "saving" | "saved">>(
    {}
  );

  useEffect(() => {
    if (!industry) {
      setCompanies([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    discoverCompanies(industry, fns)
      .then((d) => {
        if (cancelled) return;
        setCompanies(d.companies);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load data");
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [industry, fns]);

  function toggleFn(id: FunctionId) {
    setFns((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  function track(c: DiscoverCompany) {
    const industryLabel = INDUSTRIES.find((i) => i.id === c.industry)?.label;
    try {
      createApplication({
        company: c.sponsor?.name ?? c.name,
        sponsor_status: c.sponsor ? "recognised" : "unknown",
        permit_fit: c.sponsor ? "HSM" : "unknown",
        status: "saved",
        notes: `Found via Discover (${industryLabel})`,
      });
      setTracked((t) => ({ ...t, [c.name]: "saved" }));
    } catch {
      setTracked((t) => {
        const next = { ...t };
        delete next[c.name];
        return next;
      });
    }
  }

  function careersHref(c: Company) {
    return (
      c.careersUrl ??
      `https://www.google.com/search?q=${encodeURIComponent(`${c.name} careers`)}`
    );
  }

  const rf = resultFilter.trim().toLowerCase();
  const visible = rf
    ? companies.filter(
        (c) =>
          c.name.toLowerCase().includes(rf) ||
          (c.blurb ?? "").toLowerCase().includes(rf) ||
          c.city.toLowerCase().includes(rf)
      )
    : companies;
  const sponsorCount = visible.filter((c) => c.sponsor).length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Discover sponsoring employers</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pick an industry, narrow down by what you want to do, and get companies
        that sponsor visas — verified against the IND register.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Step 1: industry */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          1 · Industry
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {INDUSTRIES.map((i) => (
            <button
              key={i.id}
              onClick={() => setIndustry(industry === i.id ? null : i.id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                industry === i.id
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
              }`}
            >
              {i.emoji} {i.label}
              <span
                className={`ml-1.5 text-xs ${industry === i.id ? "text-slate-300" : "text-slate-400"}`}
              >
                {industryCounts[i.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: functions */}
      {industry && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            2 · What do you want to do?{" "}
            <span className="normal-case font-normal">
              (optional, pick any)
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {FUNCTIONS.map((f) => (
              <button
                key={f.id}
                onClick={() => toggleFn(f.id)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                  fns.includes(f.id)
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {industry && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              placeholder="Filter results…"
              className="w-48 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-500"
            />
            <p className="text-sm text-slate-500">
              {loading
                ? "Checking the register…"
                : `${visible.length} compan${visible.length === 1 ? "y" : "ies"}, ${sponsorCount} verified sponsor${sponsorCount === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((c) => (
              <div
                key={c.name}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{c.name}</h3>
                  <span className="shrink-0 text-xs text-slate-400">
                    {c.city}
                  </span>
                </div>
                {c.blurb ? (
                  <p className="mt-1 flex-1 text-sm text-slate-500">{c.blurb}</p>
                ) : (
                  <div className="flex-1" />
                )}
                <div className="mt-3">
                  {c.sponsor ? (
                    <span
                      className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
                      title={`Register entry: ${c.sponsor.name}`}
                    >
                      ✓ IND sponsor · KvK {c.sponsor.kvk}
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      ⚠ Not verified — check ind.nl
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <a
                    href={careersHref(c)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-center text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Careers ↗
                  </a>
                  <button
                    onClick={() => track(c)}
                    disabled={!!tracked[c.name]}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60"
                  >
                    {tracked[c.name] === "saved"
                      ? "✓ Tracked"
                      : tracked[c.name] === "saving"
                        ? "…"
                        : "+ Track"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {!loading && visible.length === 0 && (
            <p className="mt-6 text-sm text-slate-400">
              No curated companies match this combination — try fewer function
              filters, or search the full 12,000+ register on the{" "}
              <Link href="/sponsors" className="underline">
                Sponsors page
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {!industry && (
        <p className="mt-8 text-sm text-slate-400">
          👆 Start by picking an industry. Curated list of ~280 employers known
          for hiring internationals (no public data exists on *how many* visas
          each company sponsors) — the full register (12,000+) is on the{" "}
          <Link href="/sponsors" className="underline">
            Sponsors page
          </Link>
          .
        </p>
      )}
    </div>
  );
}
