export type Stage =
  | "Discovering"
  | "Preparing"
  | "Submitted"
  | "Shortlisted"
  | "Finalist"
  | "Won"
  | "Not selected";
export type Priority = "High" | "Medium" | "Low";
export type Competition = {
  id: string;
  workspace_id?: string;
  title: string;
  organizer: string;
  category: string;
  deadline: string | null;
  event_date: string | null;
  stage: Stage;
  priority: Priority;
  prize: string;
  application_url: string;
  owner: string;
  notes: string;
  requirements: string;
  created_at?: string;
  updated_at?: string;
};
export type Task = {
  id: string;
  workspace_id?: string;
  title: string;
  competition_id: string | null;
  assignee: string;
  due_date: string | null;
  priority: Priority;
  completed: boolean;
  description: string;
  created_at?: string;
};
export type Resource = {
  id: string;
  workspace_id?: string;
  title: string;
  url: string;
  kind: string;
  competition_id: string | null;
  description: string;
  created_at?: string;
};
export type Member = { user_id: string; display_name: string; role: string };
export type Workspace = { id: string; name: string };
export const uid = () => crypto.randomUUID();
export const sampleCompetitions: Competition[] = [
  {
    id: "demo-iesl",
    title: "IESL National Startup Challenge",
    organizer: "IESL × Dialog",
    category: "Startup / Innovation",
    deadline: "2026-11-16",
    event_date: null,
    stage: "Preparing",
    priority: "High",
    prize: "LKR 1,000,000",
    application_url:
      "https://iesl.lk/index.php?Itemid=540&id=251&lang=en&option=com_content&view=article",
    owner: "Nadija",
    notes:
      "Best for an existing MVP. Confirm the application requirements and business model.",
    requirements: "Pitch deck, MVP walkthrough, business model, team details",
  },
  {
    id: "demo-new2an",
    title: "NEW2AN Global Undergraduate Hackathon",
    organizer: "NEW2AN 2026",
    category: "AI / Responsible AI",
    deadline: "2026-10-31",
    event_date: "2026-12-08",
    stage: "Preparing",
    priority: "High",
    prize: "To be announced",
    application_url: "https://new2an.com/hackathon.html",
    owner: "Kaveen",
    notes:
      "Registration link was pending when last checked. Disclose CodeSplash development history.",
    requirements:
      "Undergraduate team (3–5), prototype, responsible AI evidence",
  },
  {
    id: "demo-launchpad",
    title: "The LaunchPad 2K26",
    organizer: "University of Kelaniya",
    category: "Startup / Innovation",
    deadline: null,
    event_date: null,
    stage: "Discovering",
    priority: "High",
    prize: "LKR 200,000 pool",
    application_url: "https://www.thelaunchpad.lk/register",
    owner: "Aloka",
    notes: "Deadline unconfirmed. Confirm registration availability.",
    requirements: "Team of 2–5, MVP and application details",
  },
  {
    id: "demo-aiconomy",
    title: "AIconomy International AI Challenge",
    organizer: "AIconomy Summit",
    category: "Enterprise AI",
    deadline: "2026-10-21",
    event_date: "2027-02-12",
    stage: "Discovering",
    priority: "Medium",
    prize: "See organizer",
    application_url: "https://www.aiconomysummit.com/ai-challenge",
    owner: "Nadija",
    notes: "Requires 5 members; recruit two additional teammates if applying.",
    requirements: "Five-member university team",
  },
  {
    id: "demo-cloud",
    title: "CloudHack 2026",
    organizer: "CloudHack Sri Lanka",
    category: "Cloud / AI",
    deadline: null,
    event_date: null,
    stage: "Discovering",
    priority: "Low",
    prize: "See organizer",
    application_url: "https://www.cloudhacksrilanka.com/",
    owner: "Kaveen",
    notes:
      "Date and reuse requirements need confirmation; challenge theme may require new work.",
    requirements: "Team of 3–4; event-specific challenge",
  },
  {
    id: "demo-spirit",
    title: "Spirit X 2.0",
    organizer: "MoraSpirit",
    category: "Inter-university",
    deadline: null,
    event_date: null,
    stage: "Discovering",
    priority: "Low",
    prize: "See organizer",
    application_url: "https://spiritx.moraspirit.com/",
    owner: "Aloka",
    notes:
      "Registration expected November 2026; verify focus and existing-MVP eligibility.",
    requirements: "Undergraduate team of 2–4; track-specific challenges",
  },
];
export const sampleTasks: Task[] = [
  {
    id: "task-1",
    title: "Finalize the ClearanceX pitch deck",
    competition_id: "demo-iesl",
    assignee: "Nadija",
    due_date: "2026-10-13",
    priority: "High",
    completed: false,
    description: "Problem, solution, XAI demo, business opportunity",
  },
  {
    id: "task-2",
    title: "Record a 3-minute product demo",
    competition_id: "demo-new2an",
    assignee: "Kaveen",
    due_date: "2026-10-16",
    priority: "High",
    completed: false,
    description: "Explain document ingestion → discrepancy → XAI",
  },
  {
    id: "task-3",
    title: "Verify competition requirements",
    competition_id: "demo-launchpad",
    assignee: "Aloka",
    due_date: "2026-10-12",
    priority: "Medium",
    completed: false,
    description: "Eligibility, dates, reuse rules, file requirements",
  },
  {
    id: "task-4",
    title: "Prepare the technical architecture diagram",
    competition_id: "demo-iesl",
    assignee: "Kaveen",
    due_date: "2026-10-18",
    priority: "Medium",
    completed: false,
    description: "React, FastAPI, OCR, Knowledge Graph, XAI pipeline",
  },
  {
    id: "task-5",
    title: "Collect impact and accuracy metrics",
    competition_id: "demo-new2an",
    assignee: "Aloka",
    due_date: "2026-10-20",
    priority: "High",
    completed: false,
    description: "Processing time, document accuracy, cost comparison",
  },
];
export const sampleResources: Resource[] = [
  {
    id: "r-1",
    title: "ClearanceX repository",
    url: "https://github.com/",
    kind: "Repository",
    competition_id: null,
    description: "Replace with the actual project repository",
  },
  {
    id: "r-2",
    title: "IESL application information",
    url: "https://iesl.lk/index.php?Itemid=540&id=251&lang=en&option=com_content&view=article",
    kind: "Application",
    competition_id: "demo-iesl",
    description: "Eligibility and submission details",
  },
  {
    id: "r-3",
    title: "NEW2AN hackathon page",
    url: "https://new2an.com/hackathon.html",
    kind: "Application",
    competition_id: "demo-new2an",
    description: "Deadlines and track requirements",
  },
];
export const fmtDate = (
  value?: string | null,
  style: "short" | "long" = "short",
) => {
  if (!value) return "TBA";
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(
    "en-US",
    style === "short"
      ? { month: "short", day: "numeric", year: "numeric" }
      : { weekday: "short", month: "short", day: "numeric" },
  );
};
export const daysTill = (value?: string | null) => {
  if (!value) return null;
  const now = new Date();
  const [y, m, d] = value.split("-").map(Number);
  return Math.round(
    (Date.UTC(y, m - 1, d) -
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      86400000,
  );
};
export const initials = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((v) => v[0] || "")
    .join("")
    .toUpperCase() || "A";
