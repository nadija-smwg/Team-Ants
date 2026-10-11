import { ArrowUpRight, Plus } from "lucide-react";
import type { Competition, Task } from "./data";
import { fmtDate } from "./data";
import { Avatar, Badge } from "./ui";

const columns = [
  { title: "Discover", stages: ["Discovering"], tone: "lavender" },
  { title: "Prepare", stages: ["Preparing"], tone: "lime" },
  {
    title: "Compete",
    stages: ["Submitted", "Shortlisted", "Finalist"],
    tone: "blue",
  },
  { title: "Results", stages: ["Won", "Not selected"], tone: "peach" },
];

export default function Pipeline({
  items,
  tasks,
  open,
  add,
}: {
  items: Competition[];
  tasks: Task[];
  open: (id: string) => void;
  add: () => void;
}) {
  return (
    <div className="pipeline-board">
      {columns.map((column) => {
        const entries = items.filter((c) => column.stages.includes(c.stage));
        return (
          <section
            className={`pipeline-column ${column.tone}`}
            key={column.title}
          >
            <div className="pipeline-column-title">
              <i />
              <h2>{column.title}</h2>
              <span>{entries.length}</span>
            </div>
            {entries.map((item) => {
              const linked = tasks.filter((t) => t.competition_id === item.id);
              return (
                <button
                  className="pipeline-ticket"
                  key={item.id}
                  onClick={() => open(item.id)}
                >
                  <span className="ticket-top">
                    <span>{item.category || "Hackathon"}</span>
                    <ArrowUpRight size={16} />
                  </span>
                  <h3>{item.title}</h3>
                  <Badge tone={item.stage}>{item.stage}</Badge>
                  <p>{fmtDate(item.deadline)}</p>
                  <div className="ticket-bottom">
                    <span>
                      {linked.filter((t) => t.completed).length}/{linked.length}{" "}
                      tasks
                    </span>
                    <Avatar name={item.owner} small />
                  </div>
                </button>
              );
            })}
            {!entries.length && (
              <p className="pipeline-empty">
                {column.title === "Results"
                  ? "The story is still being written."
                  : "Room for your next opportunity."}
              </p>
            )}
            {column.title === "Discover" && (
              <button className="pipeline-add" onClick={add}>
                <Plus size={16} />
                Save an opportunity
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
