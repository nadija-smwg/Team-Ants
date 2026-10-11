import { useState } from "react";
import {
  Cloud,
  Copy,
  Download,
  Upload,
  LogOut,
  ShieldCheck,
  Users,
  ArrowRight,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase, configured, errorText, type DataSet } from "./db";
import type { Member, Workspace, Task } from "./data";
import { Avatar, Badge, Modal } from "./ui";
import {
  downloadFile,
  validateData,
  emptyData,
  readLocal,
  prepareCloudImport,
} from "./model";
export default function Team({
  members,
  tasks,
  workspace,
  session,
  cloud,
  data,
  reload,
  local,
  connect,
  replace,
  notify,
}: {
  members: Member[];
  tasks: Task[];
  workspace: Workspace | null;
  session: Session | null;
  cloud: boolean;
  data: DataSet;
  reload: () => Promise<void>;
  local: () => void;
  connect: () => void;
  replace: (d: DataSet) => Promise<boolean>;
  notify: (s: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("Team Ants");
  const [code, setCode] = useState("");
  const [join, setJoin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState<DataSet | null>(null);
  const [reset, setReset] = useState(false);
  async function auth() {
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function setup() {
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.rpc(
        join ? "ants_join_workspace" : "ants_create_workspace",
        join
          ? { invite: code.trim(), display_name: name.trim() }
          : { team_name: teamName.trim(), display_name: name.trim() },
      );
      if (error) throw error;
      await reload();
      notify(
        join ? "Welcome to the team!" : "Your private workspace is ready.",
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function copyLocal() {
    if (!supabase || !workspace) return;
    setBusy(true);
    setError("");
    try {
      const payload = prepareCloudImport(readLocal());
      const result = await supabase.rpc("ants_import_workspace", {
        target: workspace.id,
        payload,
      });
      if (result.error) throw result.error;
      await reload();
      notify("Your local data is now in the team workspace.");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 10_000_000)
        throw new Error("Backup files must be smaller than 10 MB.");
      setPending(validateData(JSON.parse(await file.text())));
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <>
      <div className="team-grid">
        <section className="panel">
          <div className="section-title">
            <h2>The people behind the ideas</h2>
            <Badge>{members.length} people</Badge>
          </div>
          {members.map((m) => {
            const own = tasks.filter((t) => t.assignee === m.display_name);
            return (
              <div className="member-row" key={m.user_id}>
                <Avatar name={m.display_name} />
                <div>
                  <strong>{m.display_name}</strong>
                  <span>
                    {own.filter((t) => !t.completed).length} open tasks ·{" "}
                    {own.filter((t) => t.completed).length} done
                  </span>
                </div>
                <Badge tone={m.role === "owner" ? "Preparing" : ""}>
                  {m.role}
                </Badge>
              </div>
            );
          })}
          <p className="panel-note">
            {cloud
              ? "Members can manage hackathons, tasks, and resources in this private workspace."
              : "This local roster helps assign work. Connect a private workspace to invite real teammates."}
          </p>
        </section>
        <section className="connect-card">
          <span className="connect-icon">
            <Cloud size={25} />
          </span>
          <h2>
            {cloud && workspace
              ? "A shared home for your team."
              : "Build together. Stay in sync."}
          </h2>
          <p>
            {cloud && workspace
              ? "Only signed-in members can access your team’s workspace. Refresh to see your teammates’ latest updates."
              : "Connect a private workspace to share hackathons, deadlines, and resources across devices."}
          </p>
          {cloud && workspace ? (
            <>
              <div className="invite-code">
                <code>{workspace.invite_code}</code>
                <button
                  className="icon-button"
                  aria-label="Copy invite code"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(workspace.invite_code)
                      .then(() => notify("Invite code copied"))
                      .catch(() =>
                        setError(
                          "Could not copy. Select and copy the code manually.",
                        ),
                      )
                  }
                >
                  <Copy size={16} />
                </button>
              </div>
              <small>
                Share this code privately. Teammates sign in, then choose “Join
                a team”.
              </small>
              <div className="actions">
                <button
                  className="button secondary"
                  onClick={() => void reload()}
                >
                  <RefreshCw size={15} />
                  Refresh
                </button>
                <button className="button secondary" onClick={local}>
                  <HardDrive size={15} />
                  Local workspace
                </button>
              </div>
            </>
          ) : session ? (
            cloud ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void setup();
                }}
              >
                <div className="segmented">
                  <button
                    type="button"
                    className={!join ? "active" : ""}
                    onClick={() => setJoin(false)}
                  >
                    Create a team
                  </button>
                  <button
                    type="button"
                    className={join ? "active" : ""}
                    onClick={() => setJoin(true)}
                  >
                    Join a team
                  </button>
                </div>
                <label className="field">
                  <span>Your name</span>
                  <input
                    required
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="How your team knows you"
                  />
                </label>
                {join ? (
                  <label className="field">
                    <span>Invite code</span>
                    <input
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Paste your team's code"
                    />
                  </label>
                ) : (
                  <label className="field">
                    <span>Team name</span>
                    <input
                      required
                      maxLength={80}
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                    />
                  </label>
                )}
                <button
                  className="button primary"
                  disabled={busy || !name.trim()}
                >
                  {busy
                    ? "Connecting…"
                    : join
                      ? "Join workspace"
                      : "Create workspace"}
                  <ArrowRight size={16} />
                </button>
              </form>
            ) : (
              <button className="button primary" onClick={connect}>
                Open shared workspace
                <ArrowRight size={16} />
              </button>
            )
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void auth();
              }}
            >
              <label className="field">
                <span>Email address</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                />
              </label>
              <button className="button primary" disabled={busy || !configured}>
                {busy
                  ? "Sending…"
                  : sent
                    ? "Send another sign-in link"
                    : "Email me a sign-in link"}
                <ArrowRight size={16} />
              </button>
              {sent && (
                <p role="status" className="success-message">
                  Check your inbox for a sign-in link. It will bring you back
                  here.
                </p>
              )}
              {!configured && (
                <p>
                  Add your Supabase URL and publishable key to enable team
                  syncing.
                </p>
              )}
            </form>
          )}
          {session && (
            <button
              className="text-link signout"
              onClick={() =>
                void supabase?.auth.signOut().then(({ error }) => {
                  if (error) setError(error.message);
                  else notify("Signed out. Your local workspace is available.");
                })
              }
            >
              <LogOut size={14} />
              Sign out of {session.user.email}
            </button>
          )}
        </section>
      </div>
      <div className="team-grid settings-grid">
        <section className="panel">
          <span className="section-label">YOUR DATA, IN YOUR HANDS</span>
          <h2>Workspace backups</h2>
          <p>
            Download all hackathons, tasks, and resources in one portable
            backup. Keep a copy before moving devices.
          </p>
          {cloud &&
            workspace &&
            !data.competitions.length &&
            !data.tasks.length &&
            !data.resources.length && (
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void copyLocal()}
              >
                <Upload size={16} />
                {busy ? "Copying…" : "Copy local data to this team"}
              </button>
            )}
          <div className="actions">
            <button
              className="button secondary"
              onClick={() => {
                downloadFile(
                  JSON.stringify(data, null, 2),
                  "ants-workspace-backup.json",
                  "application/json",
                );
                notify("Backup downloaded");
              }}
            >
              <Download size={16} />
              Download backup
            </button>
            {!cloud && (
              <label className="button secondary upload-button">
                <Upload size={16} />
                Restore backup
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    void importFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
          {!cloud && (
            <button className="text-link muted" onClick={() => setReset(true)}>
              Start a fresh local workspace
            </button>
          )}
        </section>
        <section className="panel storage-panel">
          <ShieldCheck size={24} />
          <h2>{cloud ? "Private team storage" : "Saved on this device"}</h2>
          <p>
            {cloud
              ? "Your team data is protected by workspace membership. Members can edit shared records."
              : "Changes are saved in this browser. They stay here when you reload, but clearing browser data removes them. Use backups to keep a separate copy."}
          </p>
          <div className="storage-foot">
            <Users size={15} />
            {workspace?.name || "Team Ants"}
            <span>•</span>
            {cloud ? "Cloud workspace" : "Local workspace"}
          </div>
        </section>
      </div>
      {error && (
        <div role="alert" className="error-banner">
          {error}
        </div>
      )}
      {(pending || reset) && (
        <Modal
          title={
            reset ? "Start with a clean slate?" : "Restore this workspace?"
          }
          close={() => {
            setPending(null);
            setReset(false);
          }}
        >
          <div className="form-content">
            <p>
              This replaces the data in this browser. Download a backup first if
              you want to keep your current workspace.
            </p>
            {pending && (
              <p>
                {pending.competitions.length} hackathons ·{" "}
                {pending.tasks.length} tasks · {pending.resources.length}{" "}
                resources
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() =>
                downloadFile(
                  JSON.stringify(data, null, 2),
                  "ants-before-restore.json",
                  "application/json",
                )
              }
            >
              <Download size={15} />
              Back up current data
            </button>
            <button
              disabled={busy}
              className="button primary"
              onClick={async () => {
                setBusy(true);
                if (await replace(pending || emptyData())) {
                  setPending(null);
                  setReset(false);
                  notify("Local workspace updated");
                }
                setBusy(false);
              }}
            >
              Confirm {reset ? "reset" : "restore"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
