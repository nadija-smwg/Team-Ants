import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
await build({
  entryPoints: ["src/model.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "node_modules/.cache/ants-model.mjs",
});
await build({
  entryPoints: ["src/data.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "node_modules/.cache/ants-data.mjs",
});
const m = await import(
  pathToFileURL(process.cwd() + "/node_modules/.cache/ants-model.mjs")
);
const d = await import(
  pathToFileURL(process.cwd() + "/node_modules/.cache/ants-data.mjs")
);
const data = m.seedData();
assert.equal(m.validateData(data).competitions.length, 6);
assert.throws(
  () =>
    m.validateData({
      ...data,
      tasks: [{ ...data.tasks[0], completed: "yes" }],
    }),
  /status/,
);
assert.throws(
  () =>
    m.validateData({
      ...data,
      competitions: [...data.competitions, data.competitions[0]],
    }),
  /duplicate/,
);
assert.throws(
  () =>
    m.validateData({
      ...data,
      tasks: [{ ...data.tasks[0], competition_id: "missing" }],
    }),
  /missing hackathon/,
);
assert.throws(
  () =>
    m.validateData({
      ...data,
      competitions: [{ ...data.competitions[0], deadline: "2026-02-30" }],
    }),
  /date/,
);
const removed = m.deleteLocal(data, "competition", "demo-iesl");
assert.equal(removed.tasks.find((t) => t.id === "task-1").competition_id, null);
assert.equal(
  removed.resources.find((r) => r.id === "r-2").competition_id,
  null,
);
assert.equal(
  data.tasks.find((t) => t.id === "task-1").competition_id,
  "demo-iesl",
);
const csv = m.csvFor([
  { ...data.competitions[0], title: '=HYPERLINK("https://example.com")' },
]);
assert.ok(csv.includes("\"'=HYPERLINK"));
assert.equal(m.safeUrl("javascript:alert(1)"), undefined);
assert.equal(m.safeUrl("https://example.com"), "https://example.com/");
const today = m.dateKey(new Date());
assert.equal(d.daysTill(today), 0);
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
assert.equal(d.daysTill(m.dateKey(tomorrow)), 1);
const ics = m.calendarFor(data);
assert.ok(ics.includes("BEGIN:VCALENDAR"));
assert.ok(ics.includes("demo-new2an-event@ants.local"));
assert.ok(!ics.includes("undefined"));
console.log(
  "PASS: backup validation, bad dates, duplicate IDs, orphan links, non-destructive unlinking, CSV formula protection, URL safety, date boundaries, and calendar export.",
);
