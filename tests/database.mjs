import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
const sql = await readFile(
  new URL("../supabase/schema.sql", import.meta.url),
  "utf8",
);
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
await db.exec(sql);
await db.exec(sql);
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002",
  c = "00000000-0000-4000-8000-000000000003";
await db.query("insert into auth.users values ($1),($2),($3)", [a, b, c]);
const asUser = async (id) => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
};
await asUser(a);
const teamA = (
  await db.query("select public.ants_create_workspace('Ants','Nadija') id")
).rows[0].id;
const invite = (
  await db.query("select invite_code from public.ants_workspaces")
).rows[0].invite_code;
const event = (
  await db.query(
    "insert into public.ants_competitions(workspace_id,title) values($1,'Demo hackathon') returning id",
    [teamA],
  )
).rows[0].id;
await db.query(
  "insert into public.ants_tasks(workspace_id,title,competition_id) values($1,'Ship demo',$2)",
  [teamA, event],
);
await db.query(
  "insert into public.ants_resources(workspace_id,title,competition_id,url) values($1,'Repo',$2,'https://example.com')",
  [teamA, event],
);
await asUser(b);
assert.equal(
  (await db.query("select * from public.ants_workspaces")).rows.length,
  0,
);
assert.equal(
  (await db.query("select * from public.ants_competitions")).rows.length,
  0,
);
await assert.rejects(
  db.query(
    "insert into public.ants_competitions(workspace_id,title) values($1,'Intrusion')",
    [teamA],
  ),
  /row-level security/,
);
const teamB = (
  await db.query("select public.ants_create_workspace('Other team','Other') id")
).rows[0].id;
await assert.rejects(
  db.query(
    "insert into public.ants_tasks(workspace_id,title,competition_id) values($1,'Cross-team link',$2)",
    [teamB, event],
  ),
  /foreign key/,
);
assert.equal(
  (
    await db.query(
      "update public.ants_competitions set title='Tampered' where id=$1 returning id",
      [event],
    )
  ).rows.length,
  0,
);
await assert.rejects(
  db.query("insert into public.ants_members values($1,$2,'Intruder','owner')", [
    teamA,
    b,
  ]),
  /permission denied/,
);
await asUser(c);
await assert.rejects(
  db.query("select public.ants_join_workspace('bad-code','Kaveen')"),
  /not found/,
);
await db.query("select public.ants_join_workspace($1,'Kaveen')", [invite]);
assert.equal(
  (await db.query("select * from public.ants_competitions")).rows.length,
  1,
);
await db.query(
  "update public.ants_tasks set completed=true where workspace_id=$1",
  [teamA],
);
assert.equal(
  (await db.query("select completed from public.ants_tasks")).rows[0].completed,
  true,
);
await assert.rejects(
  db.query("update public.ants_competitions set workspace_id=$1 where id=$2", [
    teamB,
    event,
  ]),
  /row-level security/,
);
await db.query("delete from public.ants_competitions where id=$1", [event]);
assert.equal(
  (await db.query("select competition_id from public.ants_tasks")).rows[0]
    .competition_id,
  null,
);
assert.equal(
  (await db.query("select competition_id from public.ants_resources")).rows[0]
    .competition_id,
  null,
);
await asUser(b);
const imported = "00000000-0000-4000-8000-000000000010";
const payload = {
  competitions: [
    {
      id: imported,
      title: "Imported",
      organizer: "Ants",
      category: "Hackathon",
      deadline: null,
      event_date: null,
      stage: "Preparing",
      priority: "High",
      prize: "",
      application_url: "",
      owner: "Other",
      notes: "",
      requirements: "",
    },
  ],
  tasks: [],
  resources: [],
};
await db.query("select public.ants_import_workspace($1,$2)", [
  teamB,
  JSON.stringify(payload),
]);
assert.equal(
  (await db.query("select title from public.ants_competitions")).rows[0].title,
  "Imported",
);
await assert.rejects(
  db.query("select public.ants_import_workspace($1,$2)", [
    teamB,
    JSON.stringify(payload),
  ]),
  /empty workspace/,
);
await assert.rejects(
  db.query("select public.ants_import_workspace($1,$2)", [
    teamA,
    JSON.stringify(payload),
  ]),
  /access denied/,
);
await db.exec("reset role;set role anon");
await assert.rejects(
  db.query("select * from public.ants_competitions"),
  /permission denied/,
);
await assert.rejects(
  db.query("select public.ants_create_workspace('Forbidden','Anon')"),
  /permission denied/,
);
await db.exec("reset role");
const enabled = await db.query(
  "select relrowsecurity from pg_class where relname in ('ants_workspaces','ants_members','ants_competitions','ants_tasks','ants_resources')",
);
assert.equal(enabled.rows.length, 5);
assert.ok(enabled.rows.every((r) => r.relrowsecurity));
await db.close();
console.log(
  "PASS: schema rerun, owner creation, private reads, unauthorized inserts/updates, membership escalation, cross-team links, invalid invites, teammate join/edit, workspace reassignment, deletion unlinking, anonymous denial, and RLS enabled on all 5 tables.",
);
