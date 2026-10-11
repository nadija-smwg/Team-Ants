import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Plus,
  Radio,
  Target,
  Zap,
} from "lucide-react";
import type { Competition, Task, Member } from "./data";
import { daysTill, fmtDate } from "./data";
import { Avatar, Badge, Empty, TaskRow } from "./ui";

type Props = {
  competitions: Competition[];
  tasks: Task[];
  members: Member[];
  busy: boolean;
  open: (id: string) => void;
  editTask: (task: Task) => void;
  toggle: (task: Task) => void;
  navigate: (
    page: "Hackathons" | "Tasks" | "Calendar" | "Team & settings",
  ) => void;
  add: (type: "competition" | "task", id?: string) => void;
};

export default function Launchpad({
  competitions,
  tasks,
  members,
  busy,
  open,
  editTask,
  toggle,
  navigate,
  add,
}: Props) {
  const active = competitions.filter(
    (c) => !["Won", "Not selected"].includes(c.stage),
  );
  const deadlines = active
    .filter((c) => c.deadline && (daysTill(c.deadline) ?? -1) >= 0)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!));
  const pending = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
  const focus =
    deadlines.find((c) => ["Discovering", "Preparing"].includes(c.stage)) ||
    deadlines[0] ||
    active[0];
  const focusTasks = tasks.filter((t) => t.competition_id === focus?.id);
  const done = focusTasks.filter((t) => t.completed).length;
  const totalDone = tasks.filter((t) => t.completed).length;
  const submitted = competitions.filter((c) =>
    ["Submitted", "Shortlisted", "Finalist", "Won"].includes(c.stage),
  ).length;

  return (
    <div className="launchpad">
      <div className="pulse-strip">
        <button onClick={() => navigate("Hackathons")}>
          <Radio size={17} />
          <strong>{active.length.toString().padStart(2, "0")}</strong>
          <span>on the radar</span>
          <ArrowUpRight size={15} />
        </button>
        <button onClick={() => navigate("Tasks")}>
          <Zap size={17} />
          <strong>{pending.length.toString().padStart(2, "0")}</strong>
          <span>tasks to tackle</span>
          <ArrowUpRight size={15} />
        </button>
        <button onClick={() => navigate("Hackathons")}>
          <Check size={17} />
          <strong>{submitted.toString().padStart(2, "0")}</strong>
          <span>applications sent</span>
          <ArrowUpRight size={15} />
        </button>
        <button onClick={() => navigate("Team & settings")}>
          <div className="avatar-stack">
            {members.slice(0, 3).map((m) => (
              <Avatar key={m.user_id} name={m.display_name} small />
            ))}
          </div>
          <span>{members.length} builders, one team</span>
          <ArrowUpRight size={15} />
        </button>
      </div>

      <div className="mission-grid">
        <section className="mission-card">
          <div className="mission-top">
            <span className="mono-label">
              <span className="live-dot" />{" "}
              {focus?.deadline ? "NEXT UP / YOUR FOCUS" : "YOUR NEXT MOVE"}
            </span>
            <Target size={20} />
          </div>
          {focus ? (
            <>
              <div className="mission-content">
                <div className="mission-copy">
                  <Badge tone={focus.stage}>{focus.stage}</Badge>
                  <h2>{focus.title}</h2>
                  <p>
                    {focus.organizer || focus.category || "Your next hackathon"}
                  </p>
                </div>
                <div className="signal-art" aria-hidden="true">
                  <div className="signal-ring ring-a" />
                  <div className="signal-ring ring-b" />
                  <div className="signal-ring ring-c" />
                  <div className="signal-core">
                    <ArrowUpRight strokeWidth={1.4} />
                  </div>
                  <span className="signal-cross cross-a">+</span>
                  <span className="signal-cross cross-b">+</span>
                  <span className="signal-code">ANTS / BUILD MODE</span>
                </div>
              </div>
              <div className="mission-facts">
                <div>
                  <span>APPLICATION CLOSES</span>
                  <strong>{fmtDate(focus.deadline)}</strong>
                </div>
                <div>
                  <span>TIME TO BUILD</span>
                  <strong>
                    {focus.deadline
                      ? daysTill(focus.deadline)! < 0
                        ? "Deadline passed"
                        : `${daysTill(focus.deadline)} days`
                      : "Date pending"}
                  </strong>
                </div>
                <div>
                  <span>TEAM LEAD</span>
                  <strong>{focus.owner || "Unassigned"}</strong>
                </div>
              </div>
              <div className="mission-bottom">
                <button
                  className="button primary"
                  onClick={() => open(focus.id)}
                >
                  Open game plan <ArrowUpRight size={18} />
                </button>
                <span>
                  {done}/{focusTasks.length} preparation tasks done
                </span>
              </div>
            </>
          ) : (
            <Empty
              title="Big things start with one idea."
              text="Save your first hackathon. We’ll keep the plan, people, and deadlines together."
              action={
                <button
                  className="button primary"
                  onClick={() => add("competition")}
                >
                  <Plus size={17} />
                  Save a hackathon
                </button>
              }
            />
          )}
        </section>

        <section className="sprint-card">
          <div className="section-title">
            <div>
              <span className="mono-label">LESS SCROLLING. MORE SHIPPING.</span>
              <h2>
                The next moves
                <span className="count-chip">{pending.length}</span>
              </h2>
            </div>
            <button
              className="icon-button"
              aria-label="Add a task"
              onClick={() => add("task")}
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="sprint-tasks">
            {pending.slice(0, 3).map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                competition={
                  competitions.find((c) => c.id === t.competition_id)?.title ||
                  "Team workspace"
                }
                toggle={() => toggle(t)}
                edit={() => editTask(t)}
                busy={busy}
              />
            ))}
            {!pending.length && (
              <Empty
                title="You’re all caught up."
                text="Clear head. Room for the next idea."
              />
            )}
          </div>
          <div className="sprint-bottom">
            <div className="sprint-progress">
              <span>
                <strong>{totalDone}</strong> of {tasks.length} tasks complete
              </span>
              <div className="progress">
                <span
                  style={{
                    width: `${tasks.length ? (totalDone / tasks.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <button className="text-link" onClick={() => navigate("Tasks")}>
              All tasks <ArrowRight size={17} />
            </button>
          </div>
        </section>
      </div>

      <section className="runway">
        <div className="section-title">
          <div>
            <span className="mono-label">DON’T MISS YOUR WINDOW</span>
            <h2>On the horizon</h2>
          </div>
          <button className="text-link" onClick={() => navigate("Calendar")}>
            <CalendarDays size={16} /> Calendar <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="runway-list">
          {deadlines.slice(0, 4).map((c, index) => (
            <button
              className="runway-item"
              key={c.id}
              onClick={() => open(c.id)}
            >
              <div className="runway-track">
                <span className={index === 0 ? "first" : ""} />
                <i />
              </div>
              <span className="runway-date">
                {fmtDate(c.deadline)}{" "}
                <small>
                  {daysTill(c.deadline) === 0
                    ? "TODAY"
                    : `IN ${daysTill(c.deadline)} DAYS`}
                </small>
              </span>
              <strong>{c.title}</strong>
              <span className="runway-type">
                Application deadline <ArrowUpRight size={16} />
              </span>
            </button>
          ))}
          {!deadlines.length && (
            <Empty
              title="Your calendar has breathing room."
              text="Add a deadline to a hackathon to see it here."
            />
          )}
        </div>
      </section>

      <section className="radar-section">
        <div className="section-title">
          <div>
            <span className="mono-label">FROM MAYBE TO MADE IT</span>
            <h2>The opportunity pipeline</h2>
          </div>
          <button className="text-link" onClick={() => navigate("Hackathons")}>
            Open pipeline <ArrowRight size={17} />
          </button>
        </div>
        <div className="pipeline-summary">
          {[
            {
              title: "Discover",
              stage: ["Discovering"],
              text: "Worth a closer look",
              color: "lavender",
            },
            {
              title: "Prepare",
              stage: ["Preparing"],
              text: "Ideas becoming applications",
              color: "lime",
            },
            {
              title: "Compete",
              stage: ["Submitted", "Shortlisted", "Finalist"],
              text: "Out there making moves",
              color: "blue",
            },
            {
              title: "Celebrate",
              stage: ["Won"],
              text: "A place for the wins",
              color: "peach",
            },
          ].map((group) => (
            <button
              key={group.title}
              className={`pipeline-summary-item ${group.color}`}
              onClick={() => navigate("Hackathons")}
            >
              <span>
                <i />
                {group.title}
                <ArrowUpRight size={16} />
              </span>
              <strong>
                {competitions
                  .filter((c) => group.stage.includes(c.stage))
                  .length.toString()
                  .padStart(2, "0")}
              </strong>
              <small>{group.text}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
