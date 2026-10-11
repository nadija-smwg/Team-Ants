import { readFile } from "node:fs/promises";
const env = Object.fromEntries(
  (await readFile(".env", "utf8"))
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [
        l.slice(0, i).trim(),
        l
          .slice(i + 1)
          .trim()
          .replace(/^['"]|['"]$/g, ""),
      ];
    }),
);
for (const table of ["competitions", "tasks", "resources", "ants_workspaces"]) {
  const response = await fetch(
    `${env.VITE_SUPABASE_URL}/rest/v1/${table}?select=id&limit=0`,
    {
      headers: {
        apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Prefer: "count=exact",
      },
    },
  );
  console.log(
    table,
    response.status,
    response.headers.get("content-range") || "",
  );
}
