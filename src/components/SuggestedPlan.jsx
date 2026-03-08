import { useEffect, useState } from "react";
import { MoreHorizontal, ArrowUpRight, BookOpen, PenLine, Brain, Clock, Zap, RefreshCw } from "lucide-react";

// Map action type to icon
const TYPE_ICONS = {
  study:   BookOpen,
  review:  Brain,
  write:   PenLine,
  practice: Zap,
  default: Clock,
};

// Map urgency to color
const URGENCY_COLORS = {
  high:   "text-red-400",
  medium: "text-yellow-400",
  low:    "text-text-secondary",
};

const URGENCY_DOT = {
  high:   "bg-red-400",
  medium: "bg-yellow-400",
  low:    "bg-accent-blue",
};

function PlanCard({ item, index }) {
  const Icon = TYPE_ICONS[item.type] || TYPE_ICONS.default;
  const urgencyColor = URGENCY_COLORS[item.urgency] || URGENCY_COLORS.low;
  const dotColor = URGENCY_DOT[item.urgency] || URGENCY_DOT.low;

  return (
    <div className="group/card -mx-2 cursor-pointer rounded-md px-2 py-3 transition-colors hover:bg-[#2e2e30]">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-1.5 min-w-0">
          <span className="font-mono text-[10px] text-text-secondary shrink-0">#{index + 1}</span>
          <span className="text-[10px] text-text-separator shrink-0">&bull;</span>
          <span className={`size-1.5 rounded-full shrink-0 ${dotColor}`} />
          <span className={`font-sans text-[10px] shrink-0 ${urgencyColor}`}>
            {item.urgency === "high" ? "Urgent" : item.urgency === "medium" ? "Soon" : "Upcoming"}
          </span>
          <span className="text-[10px] text-text-separator shrink-0">&bull;</span>
          <span className="font-mono text-[10px] text-text-secondary truncate">{item.course}</span>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-text-secondary transition-colors group-hover/card:text-text-primary ml-2" />
      </div>

      {/* Action title */}
      <div className="mt-1.5 flex items-start gap-2">
        <Icon className="size-3.5 shrink-0 mt-0.5 text-text-muted" />
        <div className="flex flex-col min-w-0">
          <p className="font-sans text-[13px] font-medium leading-[18px] text-text-primary">
            {item.action}
          </p>
          <p className="font-sans text-[12px] leading-[17px] text-text-secondary mt-0.5">
            {item.reason}
          </p>
        </div>
      </div>

      {/* Time estimate */}
      {item.timeEstimate && (
        <div className="mt-1.5 flex items-center gap-1">
          <Clock className="size-3 text-text-faint" />
          <span className="font-mono text-[10px] text-text-faint">{item.timeEstimate}</span>
        </div>
      )}
    </div>
  );
}

async function generatePlan(courses) {
  // Build a concise context string for Claude
  const today = new Date();
  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "no date";

  const courseContext = courses.map((c) => {
    const upcoming = c.assignments
      .filter((a) => a.dueAt)
      .slice(0, 5)
      .map((a) => `  - "${a.name}" due ${fmt(a.dueAt)}${a.pointsPossible ? ` (${a.pointsPossible} pts)` : ""}`)
      .join("\n");
    return `${c.courseCode} — ${c.shortName}:\n${upcoming || "  - No upcoming assignments"}`;
  }).join("\n\n");

  const prompt = `Today is ${fmt(today)}. Here are a student's current courses and upcoming assignments:

${courseContext}

Generate a prioritized study plan with exactly 5 action items for TODAY and the next few days. Each item should be a specific, actionable task (not just "study for exam" — instead "do 2 practice problems on sorting algorithms" or "outline your essay introduction").

Respond ONLY with a JSON array, no markdown, no explanation. Each object must have:
- "action": string — specific task to do (under 12 words)
- "reason": string — why this is important right now (under 20 words)
- "course": string — course code only e.g. "CSCI 3202"
- "type": one of "study" | "review" | "write" | "practice"
- "urgency": one of "high" | "medium" | "low"
- "timeEstimate": string e.g. "45 min" or "1-2 hrs"`;

  const res = await fetch("/anthropic-api/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "[]";

  // Strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export default function SuggestedPlan({ courses }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (courses.length > 0 && !generated) {
      setLoading(true);
      setGenerated(true);
      generatePlan(courses)
        .then(setItems)
        .catch((err) => {
          console.error("Plan generation failed:", err);
          setItems([]);
        })
        .finally(() => setLoading(false));
    }
  }, [courses]);

  function handleRegenerate() {
    if (courses.length === 0) return;
    setLoading(true);
    generatePlan(courses)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  return (
    <div className="flex w-[332px] shrink-0 flex-col gap-2 rounded border border-[#393939] px-4 py-2">
      {/* Header */}
      <div className="flex h-9 items-center justify-between border-b border-border-default pb-px">
        <div className="flex items-center gap-2">
          <span className="font-sans text-[11px] font-medium leading-[16.5px] text-text-muted">
            Suggested Plan
          </span>
          {loading && (
            <span className="font-sans text-[10px] text-text-faint animate-pulse">
              AI thinking...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!loading && items.length > 0 && (
            <button
              onClick={handleRegenerate}
              title="Regenerate plan"
              className="cursor-pointer transition-colors hover:text-text-primary"
            >
              <RefreshCw className="size-3 text-text-secondary" />
            </button>
          )}
          <button className="cursor-pointer transition-colors hover:text-text-primary">
            <MoreHorizontal className="size-3.5 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col">
        {loading && (
          <div className="flex flex-col gap-4 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-1.5 animate-pulse">
                <div className="h-2.5 w-20 rounded bg-bg-elevated" />
                <div className="h-3.5 w-full rounded bg-bg-elevated" />
                <div className="h-3 w-3/4 rounded bg-bg-elevated" />
              </div>
            ))}
          </div>
        )}

        {!loading && items.length > 0 &&
          items.map((item, i) => (
            <PlanCard key={i} item={item} index={i} />
          ))
        }

        {!loading && items.length === 0 && courses.length > 0 && (
          <div className="flex flex-col items-center gap-2 py-6">
            <p className="font-sans text-[12px] text-text-secondary text-center">
              Failed to generate plan.
            </p>
            <button
              onClick={handleRegenerate}
              className="flex items-center gap-1.5 font-sans text-[12px] text-accent-blue hover:underline cursor-pointer"
            >
              <RefreshCw className="size-3" /> Try again
            </button>
          </div>
        )}

        {!loading && courses.length === 0 && (
          <p className="py-4 font-sans text-[12px] text-text-secondary text-center">
            Loading your courses...
          </p>
        )}
      </div>
    </div>
  );
}