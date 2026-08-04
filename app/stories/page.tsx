"use client";

import { useEffect, useMemo, useState } from "react";
import { COMPETENCIES, CompetencyId, Story } from "@/lib/types";
import {
  createStory,
  deleteStory,
  listStories,
  updateStory,
} from "@/lib/store";

const COMPETENCY_LABELS = Object.fromEntries(
  COMPETENCIES.map((c) => [c.id, c.label])
) as Record<string, string>;

type StoryForm = {
  code: string;
  title: string;
  competencies: CompetencyId[];
  situation: string;
  task: string;
  action: string;
  result: string;
  learned: string;
  source: string;
};

const EMPTY_FORM: StoryForm = {
  code: "",
  title: "",
  competencies: [],
  situation: "",
  task: "",
  action: "",
  result: "",
  learned: "",
  source: "",
};

function storyToForm(s: Story): StoryForm {
  return {
    code: s.code ?? "",
    title: s.title,
    competencies: (s.competencies ? s.competencies.split(",") : []).filter(
      Boolean
    ) as CompetencyId[],
    situation: s.situation ?? "",
    task: s.task ?? "",
    action: s.action ?? "",
    result: s.result ?? "",
    learned: s.learned ?? "",
    source: s.source ?? "",
  };
}

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CompetencyId | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<StoryForm>(EMPTY_FORM);

  useEffect(() => {
    setStories(listStories());
    setLoading(false);
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return stories.filter((st) => {
      const tags = st.competencies.split(",");
      return (
        (!filter || tags.includes(filter)) &&
        (!s ||
          st.title.toLowerCase().includes(s) ||
          (st.source ?? "").toLowerCase().includes(s) ||
          (st.situation ?? "").toLowerCase().includes(s) ||
          (st.action ?? "").toLowerCase().includes(s))
      );
    });
  }, [stories, filter, search]);

  function startNew() {
    setForm(EMPTY_FORM);
    setEditing("new");
  }

  function startEdit(s: Story) {
    setForm(storyToForm(s));
    setEditing(s.id);
  }

  function save() {
    if (!form.title.trim()) return;
    const payload = {
      ...form,
      code: form.code.trim() || null,
      title: form.title.trim(),
      source: form.source.trim() || null,
    };
    if (editing === "new") {
      createStory(payload);
    } else if (typeof editing === "number") {
      updateStory(editing, payload);
    }
    setStories(listStories());
    setEditing(null);
  }

  function remove(id: number) {
    if (!confirm("Delete this story?")) return;
    deleteStory(id);
    setStories((prev) => prev.filter((s) => s.id !== id));
  }

  const inputCls =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">STAR story bank</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your interview stories, told once, reused everywhere. Attach them to
            roles from each application&apos;s Prep page.
          </p>
        </div>
        <button
          onClick={startNew}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Add story
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stories…"
          className="w-56 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-500"
        />
        {COMPETENCIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(filter === c.id ? null : c.id)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              filter === c.id
                ? "border-violet-600 bg-violet-600 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-slate-500"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {editing !== null && (
        <div className="mt-4 rounded-xl border border-slate-300 bg-white p-4">
          <p className="text-sm font-semibold">
            {editing === "new" ? "New story" : "Edit story"}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[6rem_1fr_10rem]">
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Code"
              className={inputCls}
            />
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title * — e.g. Built the Python/SQL exception-tracking tool"
              className={inputCls}
            />
            <input
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="Source (employer, project…)"
              className={inputCls}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {COMPETENCIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    competencies: f.competencies.includes(c.id)
                      ? f.competencies.filter((x) => x !== c.id)
                      : [...f.competencies, c.id],
                  }))
                }
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  form.competencies.includes(c.id)
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-slate-300 text-slate-600"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["situation", "Situation"],
                ["task", "Task"],
                ["action", "Action"],
                ["result", "Result"],
              ] as const
            ).map(([key, label]) => (
              <textarea
                key={key}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={label}
                rows={3}
                className={inputCls}
              />
            ))}
            <textarea
              value={form.learned}
              onChange={(e) => setForm({ ...form, learned: e.target.value })}
              placeholder="What I learned / how I use it (optional)"
              rows={2}
              className={`${inputCls} sm:col-span-2`}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={save}
              disabled={!form.title.trim()}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              Save story
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {filtered.map((s) => {
          const tags = s.competencies.split(",").filter(Boolean);
          const isOpen = expanded === s.id;
          return (
            <div
              key={s.id}
              className="rounded-xl border border-slate-200 bg-white"
            >
              <button
                onClick={() => setExpanded(isOpen ? null : s.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                {s.code && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                    {s.code}
                  </span>
                )}
                <span className="flex-1 font-medium">{s.title}</span>
                {s.source && (
                  <span className="text-xs text-slate-400">{s.source}</span>
                )}
                <span className="text-slate-400">{isOpen ? "▾" : "▸"}</span>
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800"
                      >
                        {COMPETENCY_LABELS[t] ?? t}
                      </span>
                    ))}
                  </div>
                  <dl className="mt-3 space-y-2 text-sm">
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
                            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              {label}
                            </dt>
                            <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">
                              {value}
                            </dd>
                          </div>
                        )
                    )}
                  </dl>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => startEdit(s)}
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(s.id)}
                      className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
            {stories.length === 0
              ? "No stories yet. Add your go-to STAR stories once — then attach them to any role you're prepping."
              : "No stories match the current filter."}
          </div>
        )}
      </div>
    </div>
  );
}
