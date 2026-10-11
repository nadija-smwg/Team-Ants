import { createClient } from "@supabase/supabase-js";
import type { Competition, Resource, Task, Member, Workspace } from "./data";
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
      "Cloud connection is not configured. Your local workspace is available.",
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
export async function loadWorkspace(): Promise<{
  workspace: Workspace | null;
  members: Member[];
}> {
  if (!supabase) return { workspace: null, members: [] };
  const { data, error } = await supabase
    .from("ants_workspaces")
    .select("*")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { workspace: null, members: [] };
  const result = await supabase
    .from("ants_members")
    .select("user_id,display_name,role")
    .eq("workspace_id", data.id);
  if (result.error) throw result.error;
  return { workspace: data, members: result.data || [] };
}
export function errorText(e: unknown) {
  const message =
    e && typeof e === "object" && "message" in e
      ? String(e.message)
      : String(e);
  if (/schema cache|does not exist/i.test(message))
    return "Private workspace setup is needed. Run supabase/schema.sql in your Supabase SQL Editor, then try again. Your local data is safe.";
  return message;
}
