import { createClient } from "@supabase/supabase-js";
import type { Competition, Resource, Task, Workspace } from "./data";

const url = import.meta.env.VITE_SUPABASE_URL || "";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url, key) : null;

export type DataSet = {
  competitions: Competition[];
  tasks: Task[];
  resources: Resource[];
};

export async function loadData(workspaceId: string): Promise<DataSet> {
  if (!supabase)
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env",
    );
  const [cs, ts, rs] = await Promise.all([
    supabase
      .from("ants_competitions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("ants_tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("ants_resources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
  ]);
  if (cs.error || ts.error || rs.error) throw cs.error || ts.error || rs.error;
  return {
    competitions: cs.data || [],
    tasks: ts.data || [],
    resources: rs.data || [],
  };
}

export async function loadWorkspace(): Promise<Workspace | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("ants_workspaces")
    .select("id, name")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export function errorText(e: unknown) {
  const message =
    e && typeof e === "object" && "message" in e
      ? String(e.message)
      : String(e);
  // HTTP 404 means tables haven't been created yet (schema not applied).
  if (
    /404|not found/i.test(message) ||
    (e &&
      typeof e === "object" &&
      "status" in e &&
      (e as { status: unknown }).status === 404)
  )
    return "Database not found (404). Run supabase/schema.sql in your Supabase SQL Editor to create the workspace tables, then reload.";
  if (/schema cache|does not exist/i.test(message))
    return "Database tables missing. Run supabase/schema.sql in your Supabase SQL Editor, then reload.";
  return message;
}
