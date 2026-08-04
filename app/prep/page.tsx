"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Application, COMPETENCIES, Story } from "@/lib/types";
import {
  attachStory,
  detachStory,
  getApplication,
  listStories,
  storiesForApplication,
  updateApplication,
} from "@/lib/store";

const COMPETENCY_LABELS = Object.fromEntries(
  COMPETENCIES.map((c) => [c.id, c.label])
) as Record<string, string>;

// Static export can't pre-render a route per application id, so the role is
// selected with ?id= and read on the client.
export default function PrepPage() {
  const [id, setId] = useState<number | null>(null);
  const [app, setApp] = useState<Application | null>(null);
  const [attached, setAttached] = useState<Story[]>([]);
  const [bank, setBank] = useState<Story[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    const parsed = Number(
      new URLSearchParams(window.location.search).get("id")
    );
    if (!parsed) {
      setNotFound(true);
      return;
    }
    const found = getApplication(parsed);
    if (!found) {
      setNotFound(true);
      return;
    }
    setId(parsed);
    setApp(found);
    setAttached(storiesForApplication(parsed));
    setBank(listStories());
  }, []);

  function saveField(
    field: "research_notes" | "likely_questions" | "debrief",
    value: string
  ) {
    if (!app || id === null || (app[field] ?? "") === value) return;
    const updated = updateApplication(id, { [field]: value.trim() || null });
    if (updated) {
      setApp(updated);
      setSavedFlash(field);
      setTimeout(() => setSavedFlash(null), 1500);
    }
  }

  function attach(storyId: number) {
    if (id === null) return;
    attachStory(id, storyId);
    setAttached(storiesForApplication(id));
  }

  function detach(storyId: number) {
    if (id === null) return;
    detachStory(id, storyId);
    setAttached(storiesForApplication(id));
  }

  function exportPack() {
    if (!app) return;
    const lines: string[] = [
      `# Prep pack — ${app.company}${app.role_title ? ` · ${app.role_title}` : ""}`,
      "",
      `- Status: ${app.status}`,
      `- Sponsor: ${app.sponsor_status}${app.permit_fit !== "unknown" ? ` · permit fit: ${app.permit_fit}` : ""}`,
      ...(app.job_url ? [`- Job posting: ${app.job_url}`] : []),
      "",
    ];
    if (app.research_notes) {
      lines.push("## Research notes", "", app.research_notes, "");
    }
    if (app.likely_questions) {
      lines.push("## Likely questions", "", app.likely_questions, "");
    }
    if (attached.length > 0) {
      lines.push("## Story lineup", "");
      for (const s of attached) {
        lines.push(
          `### ${s.code ? `${s.code} — ` : ""}${s.title}${s.source ? ` (${s.source})` : ""}`,
          ""
        );
        const tags = s.competencies.split(",").filter(Boolean);
        if (tags.length)
          lines.push(
            `*${tags.map((t) => COMPETENCY_LABELS[t] ?? t).join(" · ")}*`,
            ""
          );
        for (const [label, value] of [
          ["Situation", s.situation],
          ["Task", s.task],
          ["Action", s.action],
          ["Result", s.result],
          ["Learned", s.learned],
        ] as const) {
          if (value) lines.push(`**${label}:** ${value}`, "");
        }
      }
    }
    if (app.debrief) {
      lines.push("## Debrief", "", app.debrief, "");
    }
    const md = lines.join("\n");
    navigator.clipboard?.writeText(md).catch(() => {});
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `prep-${app.company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }

  if (notFound) {
    return (
      <div className="text-sm text-slate-500">
        Application not found.{" "}
        <Link href="/tracker" className="underline">
          Back to tracker
        </Link>
      </div>
    );
  }
  if (!app) {
    return <div className="text-sm text-slate-400">Loading…</div>;
  }

  const available = bank.filter((s) => !attached.some((a) => a.id === s.id));

  const textareaCls =
    "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/tracker"
        className="text-sm text-slate-400 hover:text-slate-600"
      >
        ← Tracker
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{app.company}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {app.role_title ?? "—"}
            {app.job_url && (
              <>
                {" · "}
                <a
                  href={app.job_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  posting ↗
                </a>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              app.sponsor_status === "recognised"
                ? "bg-emerald-100 text-emerald-800"
                : app.sponsor_status === "not_found"
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {app.sponsor_status === "recognised"
              ? "✓ Sponsor"
              : app.sponsor_status === "not_found"
                ? "✗ No sponsor"
                : "? Sponsor unknown"}
          </span>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            {app.status}
          </span>
          <button
            onClick={exportPack}
            className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            {exported ? "Copied + downloaded ✓" : "Export prep pack"}
          </button>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Research notes{" "}
          {savedFlash === "research_notes" && (
            <span className="normal-case text-emerald-600">saved ✓</span>
          )}
        </h2>
        <textarea
          defaultValue={app.research_notes ?? ""}
          onBlur={(e) => saveField("research_notes", e.target.value)}
          rows={5}
          placeholder="Company research: recent news, people you'll meet, why-them angle, numbers to drop…"
          className={textareaCls}
        />
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Likely questions{" "}
          {savedFlash === "likely_questions" && (
            <span className="normal-case text-emerald-600">saved ✓</span>
          )}
        </h2>
        <textarea
          defaultValue={app.likely_questions ?? ""}
          onBlur={(e) => saveField("likely_questions", e.target.value)}
          rows={5}
          placeholder={"One per line, e.g.\nWalk me through your automation project\nWhy operations rather than front office?"}
          className={textareaCls}
        />
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Story lineup ({attached.length})
        </h2>
        <div className="mt-2 space-y-2">
          {attached.map((s) => {
            const isOpen = expanded === s.id;
            return (
              <div
                key={s.id}
                className="rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex w-full items-center gap-3 px-4 py-2.5">
                  <button
                    onClick={() => setExpanded(isOpen ? null : s.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    {s.code && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                        {s.code}
                      </span>
                    )}
                    <span className="flex-1 text-sm font-medium">
                      {s.title}
                    </span>
                    <span className="text-slate-400">
                      {isOpen ? "▾" : "▸"}
                    </span>
                  </button>
                  <button
                    onClick={() => detach(s.id)}
                    title="Remove from lineup"
                    className="rounded-md px-2 py-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
                {isOpen && (
                  <div className="space-y-2 border-t border-slate-100 px-4 py-3 text-sm">
                    {(
                      [
                        ["Situation", s.situation],
                        ["Task", s.task],
                        ["Action", s.action],
                        ["Result", s.result],
                        ["Learned", s.learned],
                      ] as const
                    ).map(
                      ([label, value]) =>
                        value && (
                          <div key={label}>
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              {label}
                            </span>
                            <p className="mt-0.5 whitespace-pre-wrap text-slate-700">
                              {value}
                            </p>
                          </div>
                        )
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {attached.length === 0 && (
            <p className="text-sm text-slate-400">
              No stories attached yet — pick your lineup below.
            </p>
          )}
        </div>

        {available.length > 0 && (
          <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-3">
            <p className="text-xs font-medium text-slate-500">
              Attach from the bank:
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {available.map((s) => (
                <button
                  key={s.id}
                  onClick={() => attach(s.id)}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:border-violet-500 hover:text-violet-700"
                >
                  + {s.code ? `${s.code} ` : ""}
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        )}
        {bank.length === 0 && (
          <p className="mt-2 text-sm text-slate-400">
            Your story bank is empty —{" "}
            <Link href="/stories" className="underline">
              add stories
            </Link>{" "}
            first.
          </p>
        )}
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Debrief (after the interview){" "}
          {savedFlash === "debrief" && (
            <span className="normal-case text-emerald-600">saved ✓</span>
          )}
        </h2>
        <textarea
          defaultValue={app.debrief ?? ""}
          onBlur={(e) => saveField("debrief", e.target.value)}
          rows={4}
          placeholder="What they asked, what landed, what to sharpen for the next round…"
          className={textareaCls}
        />
      </section>
    </div>
  );
}
