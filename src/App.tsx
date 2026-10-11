import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Sparkles,
  Cloud,
  Code2,
  ExternalLink,
  Flag,
  FolderOpen,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  List,
  ListTodo,
  Search,
  Target,
  Trophy,
  Users,
  X,
  RefreshCw,
} from "lucide-react";
import type { Competition, Task } from "./data";
import { daysTill, fmtDate } from "./data";
import {
  STAGES,
  type EditorState,
  type EntityType,
  type Entry,
  safeUrl,
  csvFor,
  downloadFile,
} from "./model";
import {
  Avatar,
  Badge,
  Deadline,
  Empty,
  HackathonCard,
  Logo,
  Modal,
  SectionTitle,
  TaskRow,
  AddButton,
  TextLink,
} from "./ui";
import { useWorkspace } from "./useWorkspace";
import Editor from "./Editor";
import Calendar from "./Calendar";
import Team from "./Team";
import Launchpad from "./Launchpad";
import Pipeline from "./Pipeline";
import "./style.css";
type Page =
  | "Overview"
  | "Hackathons"
  | "Tasks"
  | "Calendar"
  | "Resources"
  | "Team & settings";
const NAV = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Hackathons", icon: Trophy },
  { name: "Tasks", icon: ListTodo },
  { name: "Calendar", icon: CalendarDays },
  { name: "Resources", icon: FolderOpen },
] as const;
const TITLES: Record<Page, { title: string; description: string }> = {
  Overview: {
    title: "Your launchpad.",
    description:
      "Find your next challenge. Give it everything. Build it together.",
  },
  Hackathons: {
    title: "Chase the next big thing.",
    description: "One pipeline for every opportunity, application, and win.",
  },
  Tasks: {
    title: "Make moves.",
    description:
      "The work that gets you from a good idea to a great submission.",
  },
  Calendar: {
    title: "Eyes on the deadline.",
    description:
      "Application deadlines, event days, and all the little steps in between.",
  },
  Resources: {
    title: "The shared brain.",
    description:
      "The decks, docs, repos, and links that keep your team moving.",
  },
  "Team & settings": {
    title: "Meet the colony.",
    description:
      "Your people, your workspace, and everything that keeps it together.",
  },
};
export default function App() {
  const ws = useWorkspace();
  const { data, members, cloud, busy, loading } = ws;
  const { competitions, tasks, resources } = data;
  const [page, setPage] = useState<Page>("Overview");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("All");
  const [priority, setPriority] = useState("All");
  const [taskFilter, setTaskFilter] = useState("To do");
  const [assignee, setAssignee] = useState("Everyone");
  const [resourceKind, setResourceKind] = useState("All");
  const [view, setView] = useState<"board" | "cards" | "list">("board");
  const [alerts, setAlerts] = useState(false);
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState("");
  const [deleting, setDeleting] = useState<{
    type: EntityType;
    id: string;
  } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearch("");
        setAlerts(false);
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  const go = (p: Page) => {
    setPage(p);
    setSearch("");
    if (p === "Tasks") setTaskFilter("To do");
    if (p === "Hackathons") {
      setStage("All");
      setPriority("All");
    }
    setAlerts(false);
    window.scrollTo({ top: 0 });
  };
  const add = (type: EntityType = "competition", competitionId?: string) =>
    setEditor({ type, competitionId });
  const detail = competitions.find((c) => c.id === detailId);
  const sorted = [...competitions].sort((a, b) =>
    (a.deadline || "9999").localeCompare(b.deadline || "9999"),
  );
  const active = sorted.filter(
    (c) => !["Won", "Not selected"].includes(c.stage),
  );
  const upcoming = active.filter(
    (c) => c.deadline && (daysTill(c.deadline) ?? -1) >= 0,
  );
  const urgent = active.filter(
    (c) =>
      c.deadline &&
      (daysTill(c.deadline) ?? 99) <= 7 &&
      !["Submitted", "Shortlisted", "Finalist"].includes(c.stage),
  );
  const openTasks = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
  const completed = tasks.filter((t) => t.completed).length;
  const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const nameFor = (id: string | null) =>
    competitions.find((c) => c.id === id)?.title || "Team workspace";
  const matches = (...values: string[]) =>
    values.join(" ").toLowerCase().includes(search.toLowerCase().trim());
  const filtered = sorted.filter(
    (c) =>
      matches(c.title, c.organizer, c.category, c.owner, c.notes) &&
      (stage === "All" || c.stage === stage) &&
      (priority === "All" || c.priority === priority),
  );
  const filteredTasks = [...tasks]
    .filter(
      (t) =>
        matches(
          t.title,
          t.description,
          t.assignee,
          nameFor(t.competition_id),
        ) &&
        (taskFilter === "All tasks" ||
          (taskFilter === "Done" ? t.completed : !t.completed)) &&
        (assignee === "Everyone" || t.assignee === assignee),
    )
    .sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        (a.due_date || "9999").localeCompare(b.due_date || "9999"),
    );
  const filteredResources = resources.filter(
    (r) =>
      matches(r.title, r.kind, r.description) &&
      (resourceKind === "All" || resourceKind === r.kind),
  );
  const searchResults = search.trim()
    ? [
        ...competitions
          .filter((c) => matches(c.title, c.organizer, c.notes))
          .map((c) => ({
            id: c.id,
            title: c.title,
            type: "Hackathon",
            action: () => {
              setDetailId(c.id);
              setSearch("");
            },
          })),
        ...tasks
          .filter((t) => matches(t.title, t.description, t.assignee))
          .map((t) => ({
            id: t.id,
            title: t.title,
            type: "Task",
            action: () => {
              setEditor({ type: "task", data: t });
              setSearch("");
            },
          })),
        ...resources
          .filter((r) => matches(r.title, r.description))
          .map((r) => ({
            id: r.id,
            title: r.title,
            type: "Resource",
            action: () => {
              setEditor({ type: "resource", data: r });
              setSearch("");
            },
          })),
      ].slice(0, 8)
    : [];
  async function save(type: EntityType, item: Entry) {
    if (await ws.save(type, item)) {
      setEditor(null);
      setToast("Saved to your " + (cloud ? "team workspace" : "browser"));
    }
  }
  const toggle = async (t: Task) => {
    if (await ws.save("task", { ...t, completed: !t.completed }))
      setToast(
        t.completed ? "Task reopened" : "One step closer. Task complete!",
      );
  };
  const action =
    page === "Tasks" ? (
      <AddButton onClick={() => add("task")}>Add task</AddButton>
    ) : page === "Resources" ? (
      <AddButton onClick={() => add("resource")}>Add resource</AddButton>
    ) : page === "Team & settings" ? null : (
      <AddButton onClick={() => add()} />
    );
  return (
    <div className="app">
      <div className="app-main">
        <header className="topbar">
          <div className="identity">
            <button
              className="brand"
              aria-label="Ants launchpad"
              onClick={() => go("Overview")}
            >
              <Logo />
              <span>
                ants<span className="brand-dot">.</span>
              </span>
            </button>
            <span className="identity-divider" />
            <button
              className="workspace-switch"
              onClick={() => go("Team & settings")}
            >
              <span>{ws.workspace?.name || "Team Ants"}</span>
              <ChevronRight size={14} />
            </button>
            <span className="workspace-chip">WORKSPACE</span>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <Search size={16} />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search anything…"
                aria-label="Search workspace"
              />
              <kbd>Ctrl K</kbd>
              {search && (
                <div className="search-results">
                  <span className="section-label">WORKSPACE RESULTS</span>
                  {searchResults.length ? (
                    searchResults.map((r) => (
                      <button key={r.id} onClick={r.action}>
                        <span>
                          <strong>{r.title}</strong>
                          <small>{r.type}</small>
                        </span>
                        <ArrowUpRight size={15} />
                      </button>
                    ))
                  ) : (
                    <p>No results for “{search}”</p>
                  )}
                </div>
              )}
            </div>
            <span className="topbar-divider" />
            <div className="notifications">
              <button
                className="icon-button"
                aria-label="Show deadlines"
                aria-expanded={alerts}
                onClick={() => setAlerts(!alerts)}
              >
                <Bell size={19} />
                {urgent.length > 0 && <i />}
              </button>
              {alerts && (
                <div className="notification-panel">
                  <div className="section-title">
                    <h3>On your radar</h3>
                    <button
                      className="icon-button"
                      aria-label="Close deadlines"
                      onClick={() => setAlerts(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {upcoming.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setDetailId(c.id);
                        setAlerts(false);
                      }}
                    >
                      <strong>{c.title}</strong>
                      <Deadline date={c.deadline} />
                    </button>
                  ))}
                  {!upcoming.length && (
                    <p>You’re clear. No upcoming deadlines.</p>
                  )}
                </div>
              )}
            </div>
            <button
              className="profile-button"
              aria-label="Team settings"
              onClick={() => go("Team & settings")}
            >
              <Avatar name={ws.workspace?.name || "Team Ants"} small />
            </button>
          </div>
        </header>
        <div className="navigation-bar">
          <nav aria-label="Main navigation">
            {NAV.map(({ name, icon: Icon }) => (
              <button
                key={name}
                className={`nav-item ${page === name ? "selected" : ""}`}
                aria-current={page === name ? "page" : undefined}
                onClick={() => go(name)}
              >
                <Icon size={17} />
                <span>
                  {name === "Overview"
                    ? "Launchpad"
                    : name === "Hackathons"
                      ? "Hackathons"
                      : name === "Resources"
                        ? "Library"
                        : name}
                </span>
                {name === "Tasks" && openTasks.length > 0 && (
                  <span className="nav-count">{openTasks.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="nav-utilities">
            <button
              aria-label="Team workspace"
              className={`nav-item ${page === "Team & settings" ? "selected" : ""}`}
              onClick={() => go("Team & settings")}
              aria-current={page === "Team & settings" ? "page" : undefined}
            >
              <Users size={17} />
              <span>Team</span>
            </button>
            <button
              className="icon-button"
              aria-label="Quick guide"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={18} />
            </button>
          </div>
        </div>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {page === "Overview"
                  ? new Date()
                      .toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                      .toUpperCase()
                  : "THE TEAM ANTS WORKSPACE"}
              </span>
              <h1>{TITLES[page].title}</h1>
              <p>{TITLES[page].description}</p>
            </div>
            {action}
          </div>
          {ws.error && (
            <div className="error-banner" role="alert">
              <span>{ws.error}</span>
              <button onClick={() => void ws.reload()}>Retry</button>
              {cloud && <button onClick={ws.local}>Use local workspace</button>}
            </div>
          )}
          {!cloud && (
            <div className="local-notice">
              <span>
                <span className="status-dot" />
                Local workspace{" "}
                <span className="notice-detail">
                  · Saved in this browser. Starter events are examples; verify
                  their dates.
                </span>
              </span>
              <button onClick={() => go("Team & settings")}>
                Connect your team
                <ArrowUpRight size={13} />
              </button>
            </div>
          )}
          {cloud && !ws.workspace && !loading && page !== "Team & settings" && (
            <div className="local-notice">
              <span>
                Create or join a private workspace to start collaborating.
              </span>
              <button onClick={() => go("Team & settings")}>
                Set up your team
                <ArrowRight size={14} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading-state">
              <span className="spinner" />
              <h3>Opening your workspace…</h3>
            </div>
          ) : (
            <>
              {page === "Overview" && (
                <Launchpad
                  competitions={competitions}
                  tasks={tasks}
                  members={members}
                  busy={busy}
                  open={setDetailId}
                  editTask={(t) => setEditor({ type: "task", data: t })}
                  toggle={(t) => void toggle(t)}
                  navigate={go}
                  add={add}
                />
              )}
              {page === "Hackathons" && (
                <>
                  <div className="toolbar">
                    <div className="tabs">
                      {[
                        "All",
                        "Discovering",
                        "Preparing",
                        "Submitted",
                        "Won",
                      ].map((s) => (
                        <button
                          className={stage === s ? "active" : ""}
                          key={s}
                          onClick={() => setStage(s)}
                        >
                          {s === "All" ? "All hackathons" : s}
                          <span>
                            {s === "All"
                              ? competitions.length
                              : competitions.filter((c) => c.stage === s)
                                  .length}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="actions">
                      <button
                        className="icon-button"
                        title="Export hackathons as CSV"
                        onClick={() =>
                          downloadFile(
                            csvFor(filtered),
                            "ants-hackathons.csv",
                            "text/csv",
                          )
                        }
                      >
                        <ArrowDownToLine size={17} />
                      </button>
                      <div className="view-toggle">
                        <button
                          aria-label="Pipeline view"
                          aria-pressed={view === "board"}
                          className={view === "board" ? "active" : ""}
                          onClick={() => setView("board")}
                        >
                          <LayoutDashboard size={17} />
                        </button>
                        <button
                          aria-label="Card view"
                          aria-pressed={view === "cards"}
                          onClick={() => setView("cards")}
                          className={view === "cards" ? "active" : ""}
                        >
                          <LayoutGrid size={16} />
                        </button>
                        <button
                          aria-label="List view"
                          aria-pressed={view === "list"}
                          onClick={() => setView("list")}
                          className={view === "list" ? "active" : ""}
                        >
                          <List size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="filter-row">
                    <span>
                      {filtered.length} hackathons{" "}
                      <span className="muted">in your workspace</span>
                    </span>
                    <div className="actions">
                      <select
                        aria-label="Filter stage"
                        value={stage}
                        onChange={(e) => setStage(e.target.value)}
                      >
                        <option value="All">All stages</option>
                        {STAGES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Filter priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                      >
                        <option value="All">All priorities</option>
                        {["High", "Medium", "Low"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {filtered.length ? (
                    view === "board" ? (
                      <Pipeline
                        items={filtered}
                        tasks={tasks}
                        open={setDetailId}
                        add={() => add()}
                      />
                    ) : view === "cards" ? (
                      <div className="cards-grid">
                        {filtered.map((c, i) => (
                          <HackathonCard
                            key={c.id}
                            item={c}
                            index={i}
                            tasks={tasks}
                            open={() => setDetailId(c.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="panel hack-list">
                        {filtered.map((c) => (
                          <button
                            className="hack-list-row"
                            key={c.id}
                            onClick={() => setDetailId(c.id)}
                          >
                            <span className="event-symbol">
                              <Trophy size={19} />
                            </span>
                            <span>
                              <strong>{c.title}</strong>
                              <small>{c.organizer}</small>
                            </span>
                            <Badge tone={c.stage}>{c.stage}</Badge>
                            <span>{fmtDate(c.deadline)}</span>
                            <Avatar name={c.owner} small />
                            <ArrowUpRight size={18} />
                          </button>
                        ))}
                      </div>
                    )
                  ) : (
                    <Empty
                      title="No hackathons in this view."
                      text="Try another filter or save a new opportunity."
                      action={<AddButton onClick={() => add()} />}
                    />
                  )}
                </>
              )}
              {page === "Tasks" && (
                <>
                  <div className="task-summary">
                    <span className="stat-icon green">
                      <Check size={22} />
                    </span>
                    <div>
                      <strong>
                        {completed} down. {openTasks.length} to go.
                      </strong>
                      <span>Every small step counts.</span>
                    </div>
                    <div className="progress">
                      <span style={{ width: `${rate}%` }} />
                    </div>
                    <b>{rate}%</b>
                  </div>
                  <div className="toolbar">
                    <div className="tabs">
                      {["To do", "Done", "All tasks"].map((s) => (
                        <button
                          key={s}
                          className={taskFilter === s ? "active" : ""}
                          onClick={() => setTaskFilter(s)}
                        >
                          {s}
                          <span>
                            {s === "To do"
                              ? openTasks.length
                              : s === "Done"
                                ? completed
                                : tasks.length}
                          </span>
                        </button>
                      ))}
                    </div>
                    <select
                      aria-label="Filter assignee"
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                    >
                      <option>Everyone</option>
                      {[
                        ...new Set([
                          ...members.map((m) => m.display_name),
                          ...tasks.map((t) => t.assignee),
                        ]),
                      ]
                        .filter(Boolean)
                        .map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                    </select>
                  </div>
                  <section className="panel all-tasks">
                    {filteredTasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        competition={nameFor(t.competition_id)}
                        toggle={() => void toggle(t)}
                        edit={() => setEditor({ type: "task", data: t })}
                        busy={busy}
                      />
                    ))}
                    {!filteredTasks.length && (
                      <Empty
                        title="A clear list. A clear mind."
                        text="No tasks match this view. Add a task to plan the next step."
                        action={
                          <AddButton onClick={() => add("task")}>
                            Add task
                          </AddButton>
                        }
                      />
                    )}
                  </section>
                </>
              )}
              {page === "Calendar" && (
                <Calendar
                  data={data}
                  open={(c) => setDetailId(c.id)}
                  edit={(t) => setEditor({ type: "task", data: t })}
                />
              )}
              {page === "Resources" && (
                <>
                  <div className="toolbar">
                    <div className="tabs">
                      {[
                        "All",
                        "Document",
                        "Pitch deck",
                        "Repository",
                        "Application",
                      ].map((k) => (
                        <button
                          key={k}
                          className={resourceKind === k ? "active" : ""}
                          onClick={() => setResourceKind(k)}
                        >
                          {k === "All" ? "All resources" : k}
                        </button>
                      ))}
                    </div>
                    <span className="muted">
                      {filteredResources.length} saved links
                    </span>
                  </div>
                  <div className="cards-grid resource-grid">
                    {filteredResources.map((r) => (
                      <article className="resource-card" key={r.id}>
                        <div className="resource-top">
                          <span className="resource-icon">
                            {r.kind === "Repository" ? (
                              <Code2 size={22} />
                            ) : r.kind === "Pitch deck" ? (
                              <BookOpen size={22} />
                            ) : (
                              <Link2 size={22} />
                            )}
                          </span>
                          <Badge>{r.kind}</Badge>
                        </div>
                        <h3>{r.title}</h3>
                        <p>
                          {r.description || "A useful link for the whole team."}
                        </p>
                        <small>{nameFor(r.competition_id)}</small>
                        <div className="resource-footer">
                          {safeUrl(r.url) ? (
                            <a
                              href={safeUrl(r.url)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open resource
                              <ArrowUpRight size={16} />
                            </a>
                          ) : (
                            <span>Link needed</span>
                          )}
                          <button
                            onClick={() =>
                              setEditor({ type: "resource", data: r })
                            }
                          >
                            Edit
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!filteredResources.length && (
                    <Empty
                      title="Give your best ideas a home."
                      text="Save useful links, pitch decks, and repositories for the whole team."
                      action={
                        <AddButton onClick={() => add("resource")}>
                          Add resource
                        </AddButton>
                      }
                    />
                  )}
                </>
              )}
              {page === "Team & settings" && (
                <Team
                  members={members}
                  tasks={tasks}
                  data={data}
                  workspace={ws.workspace}
                  session={ws.session}
                  cloud={cloud}
                  reload={ws.reload}
                  local={ws.local}
                  connect={ws.connect}
                  replace={ws.replaceLocal}
                  notify={setToast}
                />
              )}
            </>
          )}
          <footer>
            <span>
              <Logo />
              Less chaos. More building.
            </span>
            <span>
              TEAM ANTS <i /> {cloud ? "PRIVATE WORKSPACE" : "LOCAL WORKSPACE"}
              {cloud && (
                <button
                  className="icon-button"
                  aria-label="Refresh workspace"
                  onClick={() => void ws.reload()}
                >
                  <RefreshCw size={13} />
                </button>
              )}
            </span>
          </footer>
        </main>
      </div>
      {detail && !editor && !deleting && (
        <Modal title={detail.title} close={() => setDetailId(null)} wide>
          <div className="detail-body">
            <div className="detail-intro">
              <span>{detail.organizer || "Organizer to be confirmed"}</span>
              <Badge tone={detail.stage}>{detail.stage}</Badge>
              <Badge tone={detail.priority}>{detail.priority} priority</Badge>
            </div>
            <div className="detail-facts">
              {[
                {
                  icon: CalendarDays,
                  label: "Application deadline",
                  value: fmtDate(detail.deadline),
                },
                {
                  icon: Flag,
                  label: "Event date",
                  value: fmtDate(detail.event_date),
                },
                {
                  icon: Users,
                  label: "Hackathon lead",
                  value: detail.owner || "Unassigned",
                },
                {
                  icon: Trophy,
                  label: "Prize / funding",
                  value: detail.prize || "To be announced",
                },
              ].map((f) => (
                <div key={f.label}>
                  <f.icon size={17} />
                  <span>
                    <small>{f.label}</small>
                    <strong>{f.value}</strong>
                  </span>
                </div>
              ))}
            </div>
            <label className="field stage-field">
              <span>Move this hackathon forward</span>
              <select
                disabled={busy}
                value={detail.stage}
                onChange={async (e) => {
                  if (
                    await ws.save("competition", {
                      ...detail,
                      stage: e.target.value as Competition["stage"],
                    })
                  )
                    setToast("Stage updated");
                }}
              >
                {STAGES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <div className="detail-section">
              <h3>Submission requirements</h3>
              <p>
                {detail.requirements ||
                  "Add the requirements so everyone knows what to prepare."}
              </p>
            </div>
            <div className="detail-section">
              <h3>Notes & ideas</h3>
              <p>
                {detail.notes ||
                  "A space for ideas, decisions, and things to follow up on."}
              </p>
            </div>
            <div className="detail-section">
              <SectionTitle
                title="The game plan"
                action={
                  <TextLink onClick={() => add("task", detail.id)}>
                    Add task
                  </TextLink>
                }
              />
              {tasks
                .filter((t) => t.competition_id === detail.id)
                .map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    competition=""
                    toggle={() => void toggle(t)}
                    edit={() => setEditor({ type: "task", data: t })}
                    busy={busy}
                  />
                ))}
              {!tasks.some((t) => t.competition_id === detail.id) && (
                <p>
                  No tasks yet. Break the application into a few simple steps.
                </p>
              )}
            </div>
            <div className="detail-section">
              <SectionTitle
                title="Useful links"
                action={
                  <TextLink onClick={() => add("resource", detail.id)}>
                    Add link
                  </TextLink>
                }
              />
              {resources
                .filter((r) => r.competition_id === detail.id)
                .map((r) => (
                  <a
                    className="detail-resource"
                    key={r.id}
                    href={safeUrl(r.url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Link2 size={15} />
                    {r.title}
                    <ExternalLink size={14} />
                  </a>
                ))}
            </div>
          </div>
          <div className="modal-footer">
            {safeUrl(detail.application_url) && (
              <a
                className="button secondary"
                href={safeUrl(detail.application_url)}
                target="_blank"
                rel="noreferrer"
              >
                Official website
                <ExternalLink size={15} />
              </a>
            )}
            <span className="spacer" />
            <button
              className="button primary"
              onClick={() => setEditor({ type: "competition", data: detail })}
            >
              Edit hackathon
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {editor && !deleting && (
        <Editor
          state={editor}
          close={() => setEditor(null)}
          save={save}
          remove={(type, id) => setDeleting({ type, id })}
          competitions={competitions}
          members={members}
          busy={busy}
          serverError={ws.error}
        />
      )}
      {deleting && (
        <Modal
          title="Delete this item?"
          close={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <div className="form-content">
            <p>
              This removes the item permanently.
              {deleting.type === "competition"
                ? " Linked tasks and resources will stay in your team workspace."
                : ""}
            </p>
          </div>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Keep it
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                if (await ws.remove(deleting.type, deleting.id)) {
                  setDeleting(null);
                  setEditor(null);
                  setDetailId(null);
                  setToast("Item deleted");
                }
              }}
            >
              {busy ? "Deleting…" : "Delete item"}
            </button>
          </div>
        </Modal>
      )}
      {help && (
        <Modal
          title="Less organizing. More building."
          close={() => setHelp(false)}
        >
          <div className="guide">
            <div>
              <Trophy />
              <span>
                <strong>1. Save the opportunity</strong>
                <p>
                  Add a hackathon, its deadline, eligibility requirements, and
                  official link.
                </p>
              </span>
            </div>
            <div>
              <Target />
              <span>
                <strong>2. Make the game plan</strong>
                <p>
                  Open a hackathon and add tasks. Give each task an owner and a
                  due date.
                </p>
              </span>
            </div>
            <div>
              <Sparkles />
              <span>
                <strong>3. Keep the momentum</strong>
                <p>
                  Check off tasks, move the application stage, and keep useful
                  links together.
                </p>
              </span>
            </div>
            <div>
              <Cloud />
              <span>
                <strong>4. Bring the team along</strong>
                <p>
                  Use Team & settings to connect a private workspace or download
                  a backup.
                </p>
              </span>
            </div>
            <p className="panel-note">
              Search across your workspace with Ctrl / ⌘ K. Sample events are
              unverified examples, not a live hackathon directory.
            </p>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
