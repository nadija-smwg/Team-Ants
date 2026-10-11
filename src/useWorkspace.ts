import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
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
  readLocal,
  writeLocal,
  upsertLocal,
  deleteLocal,
  tableFor,
  type EntityType,
  type Entry,
  STORAGE_KEY,
} from "./model";
const defaultMembers: Member[] = ["Nadija", "Kaveen", "Aloka"].map(
  (name, i) => ({
    user_id: `local-${i}`,
    display_name: name,
    role: i ? "member" : "owner",
  }),
);
export function useWorkspace() {
  const [data, setData] = useState<DataSet>(emptyData);
  const [members, setMembers] = useState(defaultMembers);
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [mode, setMode] = useState<"local" | "cloud">("local");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storageBroken, setStorageBroken] = useState(false);
  const locked = useRef(false);
  const requestId = useRef(0);
  const cloud = mode === "cloud" && !!session;
  const userId = session?.user.id;
  const reload = useCallback(async () => {
    const request = ++requestId.current;
    setError("");
    try {
      if (!cloud) {
        setData(readLocal());
        setStorageBroken(false);
        setWorkspace(null);
        setMembers(defaultMembers);
      } else {
        const result = await loadWorkspace();
        const next = result.workspace
          ? await loadData(result.workspace.id)
          : emptyData();
        if (request !== requestId.current) return;
        setWorkspace(result.workspace);
        setMembers(result.members);
        setData(next);
      }
    } catch (e) {
      if (request === requestId.current) {
        setError(errorText(e));
        if (!cloud) setStorageBroken(true);
      }
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [cloud, userId]);
  useEffect(() => {
    setData(emptyData());
    setWorkspace(null);
    setLoading(true);
    void reload();
    return () => {
      requestId.current++;
    };
  }, [reload]);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data.session);
      if (data.session) setMode("cloud");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (next && event === "SIGNED_IN") setMode("cloud");
      else if (!next) setMode("local");
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const listener = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && !cloud) void reload();
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, [cloud, reload]);
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
      if (!cloud) {
        if (storageBroken)
          throw new Error(
            "Export or restore your stored data before making changes.",
          );
        const next = upsertLocal(readLocal(), type, item);
        writeLocal(next);
        setData(next);
        return;
      }
      if (!workspace || !supabase)
        throw new Error("Create or join a team workspace first.");
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
      if (!cloud) {
        if (storageBroken)
          throw new Error("Restore your stored data before making changes.");
        const next = deleteLocal(readLocal(), type, id);
        writeLocal(next);
        setData(next);
        return;
      }
      if (!workspace || !supabase) throw new Error("Choose a workspace first.");
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
  async function replaceLocal(next: DataSet) {
    return mutate(async () => {
      writeLocal(next);
      setData(next);
      setStorageBroken(false);
    });
  }
  return {
    data,
    members,
    session,
    workspace,
    cloud,
    busy,
    loading,
    error,
    setError,
    reload,
    save,
    remove,
    replaceLocal,
    local: () => setMode("local"),
    connect: () => setMode("cloud"),
  };
}
