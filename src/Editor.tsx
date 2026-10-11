import { useState } from "react";
import type { FormEvent } from "react";
import { Check, Trash2 } from "lucide-react";
import type {
  Competition,
  Member,
  Priority,
  Stage,
  Task,
  Resource,
} from "./data";
import { uid } from "./data";
import {
  type EditorState,
  type Entry,
  type EntityType,
  STAGES,
  PRIORITIES,
  safeUrl,
} from "./model";
import { Modal } from "./ui";
export default function Editor({
  state,
  close,
  save,
  remove,
  competitions,
  members,
  busy,
  serverError,
}: {
  state: EditorState;
  close: () => void;
  save: (type: EntityType, data: Entry) => Promise<void>;
  remove: (type: EntityType, id: string) => void;
  competitions: Competition[];
  members: Member[];
  busy: boolean;
  serverError: string;
}) {
  const { type, data: existing } = state;
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string>>(() => {
    const f: Record<string, string> = {
      title: "",
      organizer: "",
      category: "Hackathon",
      stage: "Discovering",
      priority: "Medium",
      kind: "Link",
      completed: "false",
      competition_id: state.competitionId || "",
    };
    if (existing)
      Object.entries(existing).forEach(([k, v]) => {
        if (v != null) f[k] = String(v);
      });
    return f;
  });
  const change = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const input = (
    label: string,
    key: string,
    placeholder = "",
    kind = "text",
    required = false,
  ) => (
    <label className="field">
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      <input
        autoFocus={key === "title"}
        type={kind}
        required={required}
        maxLength={kind === "text" ? 200 : undefined}
        value={form[key] || ""}
        placeholder={placeholder}
        onInput={(e) => change(key, e.currentTarget.value)}
        onChange={(e) => change(key, e.target.value)}
      />
    </label>
  );
  const select = (label: string, key: string, values: readonly string[]) => (
    <label className="field">
      <span>{label}</span>
      <select
        value={form[key] || ""}
        onChange={(e) => change(key, e.target.value)}
      >
        {values.map((v) => (
          <option key={v} value={v}>
            {v || "Unassigned"}
          </option>
        ))}
      </select>
    </label>
  );
  const area = (label: string, key: string, placeholder: string) => (
    <label className="field">
      <span>{label}</span>
      <textarea
        maxLength={10000}
        rows={3}
        value={form[key] || ""}
        placeholder={placeholder}
        onInput={(e) => change(key, e.currentTarget.value)}
        onChange={(e) => change(key, e.target.value)}
      />
    </label>
  );
  const related = (
    <label className="field">
      <span>Hackathon</span>
      <select
        value={form.competition_id || ""}
        onChange={(e) => change("competition_id", e.target.value)}
      >
        <option value="">General / team-wide</option>
        {competitions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
    </label>
  );
  const people = [
    "",
    ...new Set(
      [
        ...members.map((m) => m.display_name),
        form.owner || "",
        form.assignee || "",
      ].filter(Boolean),
    ),
  ];
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Give this item a name.");
      return;
    }
    const url =
      type === "competition"
        ? form.application_url
        : type === "resource"
          ? form.url
          : "";
    if (url && !safeUrl(url)) {
      setError("Use a complete https:// or http:// link.");
      return;
    }
    const base = { id: existing?.id || uid(), title: form.title.trim() };
    let item: Entry;
    if (type === "competition")
      item = {
        ...base,
        organizer: form.organizer || "",
        category: form.category || "Hackathon",
        deadline: form.deadline || null,
        event_date: form.event_date || null,
        stage: form.stage as Stage,
        priority: form.priority as Priority,
        prize: form.prize || "",
        application_url: form.application_url || "",
        owner: form.owner || "",
        notes: form.notes || "",
        requirements: form.requirements || "",
      } as Competition;
    else if (type === "task")
      item = {
        ...base,
        competition_id: form.competition_id || null,
        assignee: form.assignee || "",
        due_date: form.due_date || null,
        priority: form.priority as Priority,
        completed: form.completed === "true",
        description: form.description || "",
      } as Task;
    else
      item = {
        ...base,
        url: form.url || "",
        kind: form.kind,
        competition_id: form.competition_id || null,
        description: form.description || "",
      } as Resource;
    await save(type, item);
  }
  return (
    <Modal
      title={`${existing ? "Edit" : "New"} ${type === "competition" ? "hackathon" : type}`}
      close={() => {
        if (!busy) close();
      }}
    >
      <form onSubmit={submit}>
        <div className="form-content">
          {input(
            type === "competition" ? "Hackathon name" : "Title",
            "title",
            type === "competition"
              ? "The next big opportunity"
              : "Give it a clear, useful name",
            "text",
            true,
          )}
          {type === "competition" ? (
            <>
              <div className="form-grid">
                {input("Organizer", "organizer", "University or community")}
                {input(
                  "Category / track",
                  "category",
                  "AI, startup, sustainability…",
                )}
              </div>
              <div className="form-grid">
                {input("Application deadline", "deadline", "", "date")}
                {input("Event date", "event_date", "", "date")}
              </div>
              <div className="form-grid">
                {select("Stage", "stage", STAGES)}
                {select("Priority", "priority", PRIORITIES)}
              </div>
              <div className="form-grid">
                {select("Hackathon lead", "owner", people)}
                {input("Prize / funding", "prize", "e.g. LKR 100,000")}
              </div>
              {input(
                "Official / application link",
                "application_url",
                "https://…",
                "url",
              )}
              {area(
                "Submission checklist",
                "requirements",
                "One requirement per line: pitch deck, demo video, team details…",
              )}
              {area(
                "Notes & ideas",
                "notes",
                "Eligibility, project ideas, important decisions…",
              )}
            </>
          ) : type === "task" ? (
            <>
              {related}
              <div className="form-grid">
                {select("Assignee", "assignee", people)}
                {input("Due date", "due_date", "", "date")}
              </div>
              <div className="form-grid">
                {select("Priority", "priority", PRIORITIES)}
                <label className="field">
                  <span>Status</span>
                  <select
                    value={form.completed}
                    onChange={(e) => change("completed", e.target.value)}
                  >
                    <option value="false">To do</option>
                    <option value="true">Done</option>
                  </select>
                </label>
              </div>
              {area("Description", "description", "What does done look like?")}
            </>
          ) : (
            <>
              {input("Resource URL", "url", "https://…", "url", true)}
              <div className="form-grid">
                {select("Resource type", "kind", [
                  "Link",
                  "Application",
                  "Document",
                  "Pitch deck",
                  "Repository",
                  "Video",
                  "Other",
                ])}
                {related}
              </div>
              {area(
                "Description",
                "description",
                "A little context for your team…",
              )}
            </>
          )}
          {(error || serverError) && (
            <p role="alert" className="form-error">
              {error || serverError}
            </p>
          )}
        </div>
        <div className="modal-footer">
          {existing && (
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() => remove(type, existing.id)}
            >
              <Trash2 size={15} />
              Delete
            </button>
          )}
          <span className="spacer" />
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            <Check size={16} />
            {busy
              ? "Saving…"
              : existing
                ? "Save changes"
                : "Create " + (type === "competition" ? "hackathon" : type)}
          </button>
        </div>
      </form>
    </Modal>
  );
}
