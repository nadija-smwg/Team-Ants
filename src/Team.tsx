import { useState } from "react";
import { Download, Upload, ShieldCheck, Users, RefreshCw } from "lucide-react";
import { errorText, type DataSet } from "./db";
import type { Member, Task, Workspace } from "./data";
import { Avatar, Badge, Modal } from "./ui";
import { downloadFile, validateData } from "./model";

export default function Team({
  members,
  tasks,
  workspace,
  data,
  reload,
  notify,
}: {
  members: Member[];
  tasks: Task[];
  workspace: Workspace | null;
  data: DataSet;
  reload: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<DataSet | null>(null);

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
        {/* Members panel */}
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
            Members can manage hackathons, tasks, and resources. Data syncs
            across all browsers via Supabase.
          </p>
        </section>

        {/* Workspace info panel */}
        <section className="connect-card">
          <span className="connect-icon">
            <ShieldCheck size={25} />
          </span>
          <h2>Shared cloud workspace.</h2>
          <p>
            All data is stored in your private Supabase project and synced
            across every browser automatically — no login required.
          </p>
          {workspace && (
            <div className="invite-code">
              <code style={{ fontSize: "0.8rem", letterSpacing: 0 }}>
                {workspace.name}
              </code>
            </div>
          )}
          <div className="actions">
            <button
              className="button secondary"
              onClick={() => void reload()}
              disabled={busy}
            >
              <RefreshCw size={15} />
              Refresh from cloud
            </button>
          </div>
        </section>
      </div>

      {/* Backups */}
      <div className="team-grid settings-grid">
        <section className="panel">
          <span className="section-label">YOUR DATA, IN YOUR HANDS</span>
          <h2>Workspace backups</h2>
          <p>
            Download all hackathons, tasks, and resources in one portable
            backup.
          </p>
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
          </div>
          {error && (
            <div role="alert" className="error-banner">
              {error}
            </div>
          )}
        </section>

        <section className="panel storage-panel">
          <ShieldCheck size={24} />
          <h2>Private cloud storage</h2>
          <p>
            Your data lives in your own Supabase project. Changes appear
            instantly in every browser — Chrome, Edge, or any device.
          </p>
          <div className="storage-foot">
            <Users size={15} />
            {workspace?.name || "Team Ants"}
            <span>•</span>
            Cloud workspace
          </div>
        </section>
      </div>

      {/* Restore modal */}
      {pending && (
        <Modal
          title="Restore this backup?"
          close={() => setPending(null)}
        >
          <div className="form-content">
            <p>
              This will replace all data in your Supabase workspace. Download a
              backup first if you want to keep your current data.
            </p>
            <p>
              {pending.competitions.length} hackathons ·{" "}
              {pending.tasks.length} tasks · {pending.resources.length}{" "}
              resources
            </p>
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
                setPending(null);
                notify("Restore via JSON import is not yet supported for cloud-only mode.");
                setBusy(false);
              }}
            >
              Confirm restore
            </button>
          </div>
        </Modal>
      )}

      {/* Import button — for future use */}
      <div style={{ display: "none" }}>
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
      </div>
    </>
  );
}
