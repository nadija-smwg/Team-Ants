import type { Competition, Task, Resource } from "./data";
import { sampleCompetitions, sampleTasks, sampleResources } from "./data";
import type { DataSet } from "./db";
export const STORAGE_KEY = "ants_team_demo_v1";
export const STAGES = [
  "Discovering",
  "Preparing",
  "Submitted",
  "Shortlisted",
  "Finalist",
  "Won",
  "Not selected",
] as const;
export const PRIORITIES = ["High", "Medium", "Low"] as const;
export type EntityType = "competition" | "task" | "resource";
export type Entry = Competition | Task | Resource;
export type EditorState = {
  type: EntityType;
  data?: Entry;
  competitionId?: string;
};
export const tableFor = (type: EntityType) =>
  (
    ({
      competition: "competitions",
      task: "tasks",
      resource: "resources",
    }) as const
  )[type];
export const emptyData = (): DataSet => ({
  competitions: [],
  tasks: [],
  resources: [],
});
export const seedData = (): DataSet =>
  structuredClone({
    competitions: sampleCompetitions,
    tasks: sampleTasks,
    resources: sampleResources,
  });
export const safeUrl = (value: string) => {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
};
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function validateData(value: unknown): DataSet {
  if (!value || typeof value !== "object")
    throw new Error("Choose an Ants JSON backup file.");
  const obj = value as Record<string, unknown>;
  for (const key of ["competitions", "tasks", "resources"]) {
    const rows = obj[key];
    if (!Array.isArray(rows) || rows.length > 10000)
      throw new Error(
        `Invalid backup: ${key} must be a list with at most 10,000 items.`,
      );
    const seen = new Set<string>();
    for (const row of rows) {
      if (
        !row ||
        typeof row.id !== "string" ||
        !row.id ||
        seen.has(row.id) ||
        typeof row.title !== "string" ||
        !row.title.trim()
      )
        throw new Error(`Invalid or duplicate item in ${key}.`);
      seen.add(row.id);
      const strings =
        key === "competitions"
          ? [
              "organizer",
              "category",
              "prize",
              "application_url",
              "owner",
              "notes",
              "requirements",
            ]
          : key === "tasks"
            ? ["assignee", "description"]
            : ["url", "kind", "description"];
      if (strings.some((k) => typeof row[k] !== "string"))
        throw new Error(`Invalid fields in ${key}.`);
      for (const field of key === "competitions"
        ? ["deadline", "event_date"]
        : key === "tasks"
          ? ["due_date"]
          : []) {
        const date = row[field];
        if (
          date !== null &&
          (typeof date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date)
        )
          throw new Error("Invalid date in backup.");
      }
      if (key !== "resources" && !PRIORITIES.includes(row.priority))
        throw new Error("Invalid priority in backup.");
      if (key === "competitions" && !STAGES.includes(row.stage))
        throw new Error("Invalid hackathon stage in backup.");
      if (key === "tasks" && typeof row.completed !== "boolean")
        throw new Error("Invalid task status in backup.");
    }
  }
  const result = obj as unknown as DataSet;
  const ids = new Set(result.competitions.map((c) => c.id));
  for (const item of [...result.tasks, ...result.resources])
    if (item.competition_id !== null && !ids.has(item.competition_id))
      throw new Error("Backup contains an item linked to a missing hackathon.");
  return result;
}
export function readLocal(): DataSet {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? validateData(JSON.parse(raw)) : seedData();
}
export function writeLocal(data: DataSet) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
export function upsertLocal(
  data: DataSet,
  type: EntityType,
  item: Entry,
): DataSet {
  const table = tableFor(type);
  const rows: Entry[] = data[table];
  return {
    ...data,
    [table]: rows.some((r) => r.id === item.id)
      ? rows.map((r) => (r.id === item.id ? item : r))
      : [item, ...rows],
  };
}
export function deleteLocal(
  data: DataSet,
  type: EntityType,
  id: string,
): DataSet {
  const table = tableFor(type);
  return {
    ...data,
    [table]: data[table].filter((r) => r.id !== id),
    ...(type === "competition"
      ? {
          tasks: data.tasks.map((t) =>
            t.competition_id === id ? { ...t, competition_id: null } : t,
          ),
          resources: data.resources.map((r) =>
            r.competition_id === id ? { ...r, competition_id: null } : r,
          ),
        }
      : {}),
  };
}
export function downloadFile(content: string, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvFor(competitions: Competition[]) {
  const rows = [
    [
      "Hackathon",
      "Organizer",
      "Category",
      "Deadline",
      "Event date",
      "Stage",
      "Priority",
      "Owner",
      "Prize",
      "URL",
      "Requirements",
      "Notes",
    ],
    ...competitions.map((c) => [
      c.title,
      c.organizer,
      c.category,
      c.deadline || "",
      c.event_date || "",
      c.stage,
      c.priority,
      c.owner,
      c.prize,
      c.application_url,
      c.requirements,
      c.notes,
    ]),
  ];
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map(
            (cell) =>
              `"${(/^[=+@\-\t\r]/.test(cell) ? "'" + cell : cell).replace(/"/g, '""')}"`,
          )
          .join(","),
      )
      .join("\r\n")
  );
}
export function calendarFor(data: DataSet) {
  const escape = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const entries = [
    ...data.competitions.flatMap((c) => [
      ...(c.deadline
        ? [
            {
              id: `${c.id}-deadline`,
              title: `${c.title} — application deadline`,
              date: c.deadline,
            },
          ]
        : []),
      ...(c.event_date
        ? [
            {
              id: `${c.id}-event`,
              title: `${c.title} — event`,
              date: c.event_date,
            },
          ]
        : []),
    ]),
    ...data.tasks
      .filter((t) => t.due_date && !t.completed)
      .map((t) => ({ id: t.id, title: t.title, date: t.due_date! })),
  ];
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ants//Team Workspace//EN",
    "CALSCALE:GREGORIAN",
    ...entries.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${e.id}@ants.local`,
      `DTSTAMP:${new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "")}`,
      `DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`,
      `SUMMARY:${escape(e.title)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n");
}

export function prepareCloudImport(data: DataSet): DataSet {
  const ids = new Map(
    data.competitions.map((c) => [c.id, crypto.randomUUID()]),
  );
  return {
    competitions: data.competitions.map((c) => ({ ...c, id: ids.get(c.id)! })),
    tasks: data.tasks.map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      competition_id: t.competition_id ? ids.get(t.competition_id)! : null,
    })),
    resources: data.resources.map((r) => ({
      ...r,
      id: crypto.randomUUID(),
      competition_id: r.competition_id ? ids.get(r.competition_id)! : null,
    })),
  };
}
