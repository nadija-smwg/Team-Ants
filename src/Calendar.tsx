import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  CalendarDays,
} from "lucide-react";
import type { DataSet } from "./db";
import type { Competition, Task } from "./data";
import { dateKey, calendarFor, downloadFile } from "./model";
import { Empty } from "./ui";
export default function Calendar({
  data,
  open,
  edit,
}: {
  data: DataSet;
  open: (c: Competition) => void;
  edit: (t: Task) => void;
}) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const start = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const count =
    Math.ceil(
      (start +
        new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) /
        7,
    ) * 7;
  const events = [
    ...data.competitions.flatMap((c) => [
      ...(c.deadline
        ? [
            {
              id: c.id + "-deadline",
              title: c.title,
              date: c.deadline,
              kind: "Deadline",
              open: () => open(c),
            },
          ]
        : []),
      ...(c.event_date
        ? [
            {
              id: c.id + "-event",
              title: c.title,
              date: c.event_date,
              kind: "Event",
              open: () => open(c),
            },
          ]
        : []),
    ]),
    ...data.tasks
      .filter((t) => t.due_date)
      .map((t) => ({
        id: t.id,
        title: t.title,
        date: t.due_date!,
        kind: t.completed ? "Done" : "Task",
        open: () => edit(t),
      })),
  ];
  const monthEvents = events
    .filter((e) => e.date.startsWith(dateKey(month).slice(0, 7)))
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <div className="calendar-toolbar">
        <div>
          <h2>
            {month.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="calendar-legend">
            <span>
              <i />
              Deadline
            </span>
            <span>
              <i />
              Event
            </span>
            <span>
              <i />
              Task
            </span>
          </div>
        </div>
        <div className="actions">
          <button
            className="button secondary"
            onClick={() =>
              downloadFile(
                calendarFor(data),
                "ants-calendar.ics",
                "text/calendar",
              )
            }
          >
            <Download size={16} />
            Export calendar
          </button>
          <button
            className="icon-button"
            aria-label="Previous month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            <ChevronLeft size={19} />
          </button>
          <button
            className="button secondary"
            onClick={() =>
              setMonth(
                new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              )
            }
          >
            Today
          </button>
          <button
            className="icon-button"
            aria-label="Next month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            <ChevronRight size={19} />
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div className="calendar-weekday" key={d}>
            {d}
          </div>
        ))}
        {Array.from({ length: count }, (_, i) => {
          const date = new Date(
            month.getFullYear(),
            month.getMonth(),
            i - start + 1,
          );
          const key = dateKey(date);
          return (
            <div
              key={key}
              className={`calendar-day ${date.getMonth() !== month.getMonth() ? "outside" : ""} ${key === dateKey(new Date()) ? "today" : ""}`}
            >
              <span>{date.getDate()}</span>
              {events
                .filter((e) => e.date === key)
                .map((e) => (
                  <button
                    title={`${e.kind}: ${e.title}`}
                    className={`calendar-event ${e.kind.toLowerCase()}`}
                    key={e.id}
                    onClick={e.open}
                  >
                    {e.title}
                  </button>
                ))}
            </div>
          );
        })}
      </div>
      <section className="panel month-agenda">
        <h2>
          <CalendarDays size={19} />
          This month’s agenda
        </h2>
        {monthEvents.length ? (
          monthEvents.map((e) => (
            <button className="agenda-row" key={e.id} onClick={e.open}>
              <span>
                {new Date(e.date + "T12:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <strong>{e.title}</strong>
              <small>{e.kind}</small>
            </button>
          ))
        ) : (
          <Empty
            title="Room for something great."
            text="Add an event date, application deadline, or task due date to see it here."
          />
        )}
      </section>
    </>
  );
}
