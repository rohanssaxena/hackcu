import { CalendarClock } from "lucide-react";

function formatDue(dueAt) {
  if (!dueAt) return "No due date";
  const due = new Date(dueAt);
  const now = new Date();
  const diffHours = (due - now) / 36e5;

  if (diffHours < 24) return "Due today";
  if (diffHours < 48) return "Due tomorrow";
  if (diffHours < 168) {
    const days = Math.ceil(diffHours / 24);
    return `Due in ${days} days`;
  }
  return `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function getDueColor(dueAt) {
  if (!dueAt) return "text-text-secondary";
  const h = (new Date(dueAt) - new Date()) / 36e5;
  if (h < 24) return "text-red-400";
  if (h < 72) return "text-yellow-400";
  return "text-text-secondary";
}

export default function UpcomingAssignments({ courses, loading }) {
  // Flatten all assignments across courses, sort by due date
  const items = courses
    .flatMap((c) =>
      (c.assignments ?? []).map((a) => ({
        ...a,
        courseCode: c.courseCode,
        courseName: c.shortName,
        courseId: c.id,
      }))
    )
    .filter((a) => !a.submitted && a.dueAt)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    .slice(0, 8);

  return (
    <div className="flex w-full flex-col pb-px">
      <div className="flex h-9 items-center gap-2 border-b border-border-default pb-px">
        <CalendarClock className="size-3.5 text-text-muted" />
        <span className="font-sans text-[11px] font-medium leading-[16.5px] text-text-muted">
          Upcoming Assignments
        </span>
        {!loading && items.length > 0 && (
          <span className="ml-auto font-mono text-[10px] text-text-faint">
            {items.length} due
          </span>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-3 pt-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-3 w-16 rounded bg-bg-elevated" />
              <div className="h-3 flex-1 rounded bg-bg-elevated" />
              <div className="h-3 w-14 rounded bg-bg-elevated" />
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="pt-3 font-sans text-[12px] text-text-secondary">
          🎉 Nothing due — you're all caught up!
        </p>
      )}

      {!loading && items.length > 0 && (
        <div className="flex flex-col pt-1">
          {items.map((item) => (
            <a
              key={item.id}
              href={`https://canvas.colorado.edu/courses/${item.courseId}/assignments/${item.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded px-1 py-1.5 transition-colors hover:bg-[#2a2a2e] cursor-pointer group"
            >
              {/* Course badge */}
              <span className="font-mono text-[10px] text-text-secondary shrink-0 w-[64px] truncate">
                {item.courseCode}
              </span>

              {/* Assignment name */}
              <span className="font-sans text-[12px] text-text-primary flex-1 truncate group-hover:text-accent-blue transition-colors">
                {item.name}
              </span>

              {/* Due date */}
              <span className={`font-mono text-[10px] shrink-0 ${getDueColor(item.dueAt)}`}>
                {formatDue(item.dueAt)}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}