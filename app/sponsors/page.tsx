"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import RegisterStatus from "@/components/RegisterStatus";
import { searchSponsors, type RegisterMeta, type Sponsor } from "@/lib/sponsors";

const PAGE_SIZE = 100;

export default function SponsorsPage() {
  const [query, setQuery] = useState("");
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState<RegisterMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string, offset = 0) => {
    setLoading(true);
    try {
      const data = await searchSponsors(q, PAGE_SIZE, offset);
      setSponsors((prev) =>
        offset === 0 ? data.sponsors : [...prev, ...data.sponsors]
      );
      setTotal(data.total);
      setMeta(data.meta);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load register");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  function onSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(value.trim()), 250);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">IND recognised sponsors</h1>
          <p className="mt-1 text-sm text-slate-500">
            {meta
              ? `${meta.count.toLocaleString()} organisations (Regular labour & highly skilled migrants)`
              : "Loading the register…"}
          </p>
        </div>
        <RegisterStatus meta={meta} />
      </div>

      <input
        value={query}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search by name or KvK number…"
        className="mt-6 w-full max-w-md rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-500"
      />

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Organisation</th>
              <th className="px-4 py-3 w-36">KvK</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sponsors.map((s) => (
              <tr key={`${s.kvk}-${s.name}`} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">{s.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                  {s.kvk}
                </td>
              </tr>
            ))}
            {!loading && sponsors.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-slate-400">
                  {error ?? "No sponsors match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-4">
        {sponsors.length < total && (
          <button
            onClick={() => load(query.trim(), sponsors.length)}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {loading
              ? "Loading…"
              : `Load more (${sponsors.length.toLocaleString()} of ${total.toLocaleString()})`}
          </button>
        )}
        {sponsors.length >= total && total > 0 && (
          <span className="text-xs text-slate-400">
            Showing all {total.toLocaleString()} results
          </span>
        )}
      </div>
    </div>
  );
}
