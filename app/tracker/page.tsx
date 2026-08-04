"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  APP_STATUSES,
  Application,
  AppStatus,
  PERMIT_FIT_LABELS,
  PERMIT_FITS,
  PermitFit,
  SPONSOR_STATUSES,
  SponsorStatus,
} from "@/lib/types";
import {
  createApplication,
  deleteApplication,
  exportAll,
  importAll,
  listApplications,
  updateApplication,
} from "@/lib/store";

const STATUS_STYLES: Record<AppStatus, string> = {
  saved: "bg-slate-100 text-slate-700",
  applied: "bg-blue-100 text-blue-800",
  interview: "bg-violet-100 text-violet-800",
  offer: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};

const SPONSOR_BADGES: Record<SponsorStatus, { label: string; cls: string }> = {
  recognised: { label: "✓ Sponsor", cls: "bg-emerald-100 text-emerald-800" },
  not_found: { label: "✗ No sponsor", cls: "bg-red-100 text-red-700" },
  unknown: { label: "? Unknown", cls: "bg-slate-100 text-slate-600" },
};

export default function TrackerPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sponsorFilter, setSponsorFilter] = useState<string>("all");
  const [permitFilter, setPermitFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newApp, setNewApp] = useState({
    company: "",
    role_title: "",
    job_url: "",
    sponsor_status: "unknown" as SponsorStatus,
    permit_fit: "unknown" as PermitFit,
    status: "saved" as AppStatus,
    notes: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  useEffect(() => {
    setApps(listApplications());
    setLoading(false);
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return apps.filter(
      (a) =>
        (statusFilter === "all" || a.status === statusFilter) &&
        (sponsorFilter === "all" || a.sponsor_status === sponsorFilter) &&
        (permitFilter === "all" || a.permit_fit === permitFilter) &&
        (!s ||
          a.company.toLowerCase().includes(s) ||
          (a.role_title ?? "").toLowerCase().includes(s) ||
          (a.notes ?? "").toLowerCase().includes(s))
    );
  }, [apps, statusFilter, sponsorFilter, permitFilter, search]);

  function patchApp(id: number, fields: Partial<Application>) {
    const updated = updateApplication(id, fields);
    if (updated) {
      setApps((prev) => prev.map((a) => (a.id === id ? updated : a)));
    }
  }

  function deleteApp(id: number) {
    if (!confirm("Delete this row?")) return;
    deleteApplication(id);
    setApps((prev) => prev.filter((a) => a.id !== id));
  }

  function addApp(e: React.FormEvent) {
    e.preventDefault();
    if (!newApp.company.trim()) return;
    const created = createApplication({
      ...newApp,
      company: newApp.company.trim(),
      role_title: newApp.role_title.trim() || null,
      job_url: newApp.job_url.trim() || null,
      notes: newApp.notes.trim() || null,
    });
    setApps((prev) => [created, ...prev]);
    setNewApp({
      company: "",
      role_title: "",
      job_url: "",
      sponsor_status: "unknown",
      permit_fit: "unknown",
      status: "saved",
      notes: "",
    });
    setShowAdd(false);
  }

  /* ── Backup ─────────────────────────────────────────────────────────
     Everything lives in this browser, so an export file is the only way
     to move data to another device or survive clearing site data.      */

  function downloadBackup() {
    const blob = new Blob([exportAll()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vaj-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setBackupMsg("Backup downloaded ✓");
    setTimeout(() => setBackupMsg(null), 3000);
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (
      !confirm(
        "Importing replaces everything currently in this browser (roles, stories, prep notes). Continue?"
      )
    )
      return;
    try {
      const result = importAll(await file.text());
      setApps(listApplications());
      setBackupMsg(
        `Imported ${result.applications} role${result.applications === 1 ? "" : "s"} and ${result.stories} stor${result.stories === 1 ? "y" : "ies"} ✓`
      );
    } catch (err) {
      setBackupMsg(
        err instanceof Error ? `Import failed: ${err.message}` : "Import failed"
      );
    }
    setTimeout(() => setBackupMsg(null), 6000);
  }

  const selectCls =
    "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Application tracker</h1>
          <p className="mt-1 text-sm text-slate-500">
            {apps.length} role{apps.length === 1 ? "" : "s"} tracked
            {filtered.length !== apps.length && ` · ${filtered.length} shown`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadBackup}
            title="Download all your roles, stories and prep notes as a file"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            ↓ Backup
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Restore from a backup file"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            ↑ Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={onImportFile}
            className="hidden"
          />
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            {showAdd ? "Cancel" : "+ Add role"}
          </button>
        </div>
      </div>

      {backupMsg && (
        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {backupMsg}
        </p>
      )}

      {showAdd && (
        <form
          onSubmit={addApp}
          className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <input
            value={newApp.company}
            onChange={(e) => setNewApp({ ...newApp, company: e.target.value })}
            placeholder="Company *"
            required
            className={selectCls}
          />
          <input
            value={newApp.role_title}
            onChange={(e) =>
              setNewApp({ ...newApp, role_title: e.target.value })
            }
            placeholder="Role title"
            className={selectCls}
          />
          <input
            value={newApp.job_url}
            onChange={(e) => setNewApp({ ...newApp, job_url: e.target.value })}
            placeholder="Job URL"
            className={selectCls}
          />
          <select
            value={newApp.sponsor_status}
            onChange={(e) =>
              setNewApp({
                ...newApp,
                sponsor_status: e.target.value as SponsorStatus,
              })
            }
            className={selectCls}
          >
            {SPONSOR_STATUSES.map((s) => (
              <option key={s} value={s}>
                Sponsor: {SPONSOR_BADGES[s].label}
              </option>
            ))}
          </select>
          <select
            value={newApp.permit_fit}
            onChange={(e) =>
              setNewApp({ ...newApp, permit_fit: e.target.value as PermitFit })
            }
            className={selectCls}
          >
            {PERMIT_FITS.map((p) => (
              <option key={p} value={p}>
                Permit: {PERMIT_FIT_LABELS[p]}
              </option>
            ))}
          </select>
          <select
            value={newApp.status}
            onChange={(e) =>
              setNewApp({ ...newApp, status: e.target.value as AppStatus })
            }
            className={selectCls}
          >
            {APP_STATUSES.map((s) => (
              <option key={s} value={s}>
                Status: {s}
              </option>
            ))}
          </select>
          <input
            value={newApp.notes}
            onChange={(e) => setNewApp({ ...newApp, notes: e.target.value })}
            placeholder="Notes"
            className={`${selectCls} sm:col-span-2`}
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add
          </button>
        </form>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className={`${selectCls} w-48`}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectCls}
        >
          <option value="all">All statuses</option>
          {APP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={sponsorFilter}
          onChange={(e) => setSponsorFilter(e.target.value)}
          className={selectCls}
        >
          <option value="all">All sponsor states</option>
          {SPONSOR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SPONSOR_BADGES[s].label}
            </option>
          ))}
        </select>
        <select
          value={permitFilter}
          onChange={(e) => setPermitFilter(e.target.value)}
          className={selectCls}
        >
          <option value="all">All permit fits</option>
          {PERMIT_FITS.map((p) => (
            <option key={p} value={p}>
              {PERMIT_FIT_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Company / role</th>
              <th className="px-3 py-3">Sponsor</th>
              <th className="px-3 py-3">Permit fit</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Notes</th>
              <th className="px-3 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((a) => (
              <tr key={a.id} className="align-top hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {a.job_url ? (
                      <a
                        href={a.job_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-slate-300 hover:decoration-slate-900"
                      >
                        {a.company}
                      </a>
                    ) : (
                      a.company
                    )}
                  </div>
                  {a.role_title && (
                    <div className="text-xs text-slate-500">{a.role_title}</div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${SPONSOR_BADGES[a.sponsor_status].cls}`}
                  >
                    {SPONSOR_BADGES[a.sponsor_status].label}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <select
                    value={a.permit_fit}
                    onChange={(e) =>
                      patchApp(a.id, {
                        permit_fit: e.target.value as PermitFit,
                      })
                    }
                    className="rounded-md border border-transparent bg-transparent px-1 py-1 text-sm hover:border-slate-300"
                  >
                    {PERMIT_FITS.map((p) => (
                      <option key={p} value={p}>
                        {PERMIT_FIT_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <select
                    value={a.status}
                    onChange={(e) =>
                      patchApp(a.id, { status: e.target.value as AppStatus })
                    }
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[a.status]} border-0 outline-none`}
                  >
                    {APP_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <input
                    defaultValue={a.notes ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== a.notes) patchApp(a.id, { notes: v });
                    }}
                    placeholder="—"
                    className="w-full min-w-[160px] rounded-md border border-transparent bg-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-slate-400 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <Link
                    href={`/prep/?id=${a.id}`}
                    title="Interview prep"
                    className="rounded-md px-2 py-1 text-slate-400 hover:bg-violet-50 hover:text-violet-700"
                  >
                    📝
                  </Link>
                  <button
                    onClick={() => deleteApp(a.id)}
                    title="Delete"
                    className="rounded-md px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  {apps.length === 0
                    ? "Nothing tracked yet. Check a company on the home page and save it, or add a role manually."
                    : "No rows match the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
