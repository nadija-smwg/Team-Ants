import { useCallback, useEffect, useRef, useState } from "react";
import type { Member, Workspace } from "./data";
import {
  supabase,
  loadData,
  loadWorkspace,
  errorText,
  type DataSet,
} from "./db";
import {
  emptyData,
  upsertLocal,
  deleteLocal,
  tableFor,
  type EntityType,
  type Entry,
} from "./model";

const TEAM_MEMBERS: Member[] = ["Nadija", "Kaveen", "Aloka"].map(
  (name, i) => ({
    user_id: `member-${i}`,
    display_name: name,
    role: i ? "member" : "owner",
  }),
);

export function useWorkspace() {
  const [data, setData] = useState<DataSet>(emptyData);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const request = ++requestId.current;
    setError("");
    setLoading(true);
    try {
      if (!supabase) {
        setError(
          "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env",
        );
        setData(emptyData());
        return;
      }
      const ws = await loadWorkspace();
      if (request !== requestId.current) return;
      setWorkspace(ws);
      if (ws) {
        const next = await loadData(ws.id);
        if (request !== requestId.current) return;
        setData(next);
      } else {
        setData(emptyData());
      }
    } catch (e) {
      if (request === requestId.current) setError(errorText(e));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    return () => {
      requestId.current++;
    };
  }, [reload]);

  async function mutate(action: () => Promise<void>) {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(false);
      locked.current = false;
    }
  }

  async function save(type: EntityType, item: Entry) {
    return mutate(async () => {
      if (!workspace || !supabase)
        throw new Error(
          "No workspace found. Run supabase/schema.sql and create a workspace row first.",
        );
      const table = tableFor(type);
      const exists = data[table].some((r) => r.id === item.id);
      const request = exists
        ? supabase
            .from(`ants_${table}`)
            .update({ ...item, workspace_id: workspace.id })
            .eq("id", item.id)
            .eq("workspace_id", workspace.id)
        : supabase
            .from(`ants_${table}`)
            .insert({ ...item, workspace_id: workspace.id });
      const result = await request.select().single();
      if (result.error) throw result.error;
      setData((d) => upsertLocal(d, type, result.data));
    });
  }

  async function remove(type: EntityType, id: string) {
    return mutate(async () => {
      if (!workspace || !supabase)
        throw new Error("No workspace available.");
      const result = await supabase
        .from(`ants_${tableFor(type)}`)
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspace.id)
        .select("id")
        .single();
      if (result.error) throw result.error;
      setData((d) => deleteLocal(d, type, id));
    });
  }

  return {
    data,
    members: TEAM_MEMBERS,
    workspace,
    cloud: true,
    busy,
    loading,
    error,
    setError,
    reload,
    save,
    remove,
    // no-ops kept for API compatibility with App.tsx
    replaceLocal: async (_: DataSet) => false,
    local: () => {},
    connect: () => {},
    session: null,
  };
}
