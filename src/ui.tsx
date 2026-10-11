import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  X,
  ArrowUpRight,
  CalendarDays,
  Trophy,
  ArrowRight,
  Check,
  Plus,
  Sparkles,
} from "lucide-react";
import { initials, daysTill, fmtDate } from "./data";
import type { Competition, Task } from "./data";
export function Logo() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path
          d="M11 7 7 3M21 7l4-4M10 14 4 10m18 0-6 4M10 19l-7 2m19-2 7 2M11 24l-5 5m15-5 5 5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <ellipse cx="16" cy="10" rx="5" ry="4" fill="currentColor" />
        <ellipse cx="16" cy="18" rx="4" ry="4" fill="currentColor" />
        <ellipse cx="16" cy="26" rx="5" ry="5" fill="currentColor" />
      </svg>
    </span>
  );
}
export function Avatar({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  return (
    <span
      title={name || "Unassigned"}
      className={`avatar tone-${(name.charCodeAt(0) || 0) % 4} ${small ? "small" : ""}`}
    >
      {initials(name || "Team")}
    </span>
  );
}
export function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge ${tone.toLowerCase().replace(/\s/g, "-")}`}>
      <i />
      {children}
    </span>
  );
}
export function Empty({
  title = "A little space for your next big idea.",
  text = "Add something new to get started.",
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span>
        <Sparkles size={25} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Deadline({ date }: { date: string | null }) {
  const d = daysTill(date);
  return (
    <span className={d !== null && d <= 7 ? "urgent" : ""}>
      {d === null
        ? "Date to be confirmed"
        : d < 0
          ? `${Math.abs(d)}d past deadline`
          : d === 0
            ? "Due today"
            : `${d} days left`}
    </span>
  );
}
export function SectionTitle({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
}
export function HackathonCard({
  item,
  tasks,
  open,
  index = 0,
}: {
  item: Competition;
  tasks: Task[];
  open: () => void;
  index?: number;
}) {
  const linked = tasks.filter((t) => t.competition_id === item.id);
  const done = linked.filter((t) => t.completed).length;
  return (
    <article className={`hack-card card-accent-${index % 3}`}>
      <div className="card-heading">
        <span className="event-symbol">
          {index % 3 === 0 ? (
            <Trophy size={23} />
          ) : index % 3 === 1 ? (
            <span className="code-symbol">&lt;/&gt;</span>
          ) : (
            <Sparkles size={23} />
          )}
        </span>
        <Badge tone={item.stage}>{item.stage}</Badge>
      </div>
      <span className="card-category">{item.category || "Hackathon"}</span>
      <button className="card-title" onClick={open}>
        {item.title}
      </button>
      <p className="organizer">
        {item.organizer || "Organizer to be confirmed"}
      </p>
      <div className="card-meta">
        <span>
          <CalendarDays size={14} />
          {fmtDate(item.deadline)}
        </span>
        <Deadline date={item.deadline} />
      </div>
      <div className="card-progress-label">
        <span>Preparation</span>
        <span>
          {done}/{linked.length} tasks
        </span>
      </div>
      <div className="progress">
        <span
          style={{
            width: `${linked.length ? (done / linked.length) * 100 : 0}%`,
          }}
        />
      </div>
      <div className="card-bottom">
        <div>
          <Avatar name={item.owner} small />
          <span>{item.owner || "Unassigned"}</span>
        </div>
        <button
          className="icon-button"
          onClick={open}
          aria-label={`Open ${item.title}`}
        >
          <ArrowUpRight size={18} />
        </button>
      </div>
    </article>
  );
}
export function TaskRow({
  task,
  competition,
  toggle,
  edit,
  busy,
}: {
  task: Task;
  competition: string;
  toggle: () => void;
  edit: () => void;
  busy: boolean;
}) {
  return (
    <div className={`task-row ${task.completed ? "completed" : ""}`}>
      <button
        disabled={busy}
        className={`checkbox ${task.completed ? "checked" : ""}`}
        onClick={toggle}
        aria-label={`${task.completed ? "Reopen" : "Complete"} ${task.title}`}
        aria-pressed={task.completed}
      >
        {task.completed && <Check size={13} />}
      </button>
      <button className="task-copy" onClick={edit}>
        <strong>{task.title}</strong>
        <span>{competition}</span>
      </button>
      <Badge tone={task.priority}>{task.priority}</Badge>
      <span className="task-due">{fmtDate(task.due_date)}</span>
      <Avatar name={task.assignee} small />
    </div>
  );
}
export function AddButton({
  onClick,
  children = "Add hackathon",
}: {
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button className="button primary" onClick={onClick}>
      <Plus size={17} />
      {children}
    </button>
  );
}
export function TextLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowRight size={15} />
    </button>
  );
}
export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement;
    dialog.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">TEAM ANTS WORKSPACE</span>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
