import { TrendingUp } from "lucide-react";

// Returns days until the next upcoming assignment for this course
function daysUntilNext(course) {
  const upcoming = (course.assignments ?? [])
    .filter((a) => a.dueAt)
    .map((a) => new Date(a.dueAt))
    .sort((a, b) => a - b);

  if (!upcoming.length) return null;
  const diffMs = upcoming[0] - new Date();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

// Bar fills inversely with days — due tomorrow = nearly full, due in 14+ days = nearly empty
function urgencyFill(days) {
  if (days === null) return 0;
  if (days === 0) return 1;
  if (days >= 14) return 0.05;
  return 1 - days / 14;
}

function barColor(days) {
  if (days === null) return "bg-bg-hover";
  if (days <= 1)  return "bg-red-400";
  if (days <= 3)  return "bg-yellow-400";
  if (days <= 7)  return "bg-accent-blue";
  return "bg-accent-blue";
}

function dotColor(days) {
  if (days === null) return "bg-text-secondary";
  if (days <= 1)  return "bg-red-400";
  if (days <= 3)  return "bg-yellow-400";
  return "bg-accent-green";
}

function statusLabel(days, course) {
  if (days === null) return "All caught up";
  if (days === 0)  return "Due today";
  if (days === 1)  return "Due tomorrow";
  if (days <= 7)   return `Due in ${days}d`;
  return `${course.assignments.length} upcoming`;
}

function statusColor(days) {
  if (days === null) return "text-accent-green";
  if (days <= 1)   return "text-red-400";
  if (days <= 3)   return "text-yellow-400";
  return "text-text-secondary";
}

export default function ActiveCourses({ courses, loading }) {
  if (loading) {
    return (
      <div className="flex w-full flex-col pb-px">
        <div className="flex h-9 items-center gap-2 border-b border-border-default pb-px">
          <TrendingUp className="size-3.5 text-text-muted" />
          <span className="font-sans text-[11px] font-medium leading-[16.5px] text-text-muted">
            Active Courses
          </span>
        </div>
        <div className="flex flex-col gap-4 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-1.5 animate-pulse">
              <div className="h-3 w-32 rounded bg-bg-elevated" />
              <div className="h-1 w-full rounded-full bg-bg-elevated" />
              <div className="h-3 w-24 rounded bg-bg-elevated" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!courses.length) {
    return (
      <div className="flex w-full flex-col pb-px">
        <div className="flex h-9 items-center gap-2 border-b border-border-default pb-px">
          <TrendingUp className="size-3.5 text-text-muted" />
          <span className="font-sans text-[11px] font-medium leading-[16.5px] text-text-muted">
            Active Courses
          </span>
        </div>
        <p className="pt-4 font-sans text-[12px] text-text-secondary">
          No active courses found.
        </p>
      </div>
    );
  }

  // Sort: most urgent (fewest days) first
  const sorted = [...courses].sort((a, b) => {
    const da = daysUntilNext(a) ?? 999;
    const db = daysUntilNext(b) ?? 999;
    return da - db;
  });

  return (
    <div className="flex w-full flex-col pb-px">
      <div className="flex h-9 items-center gap-2 border-b border-border-default pb-px">
        <TrendingUp className="size-3.5 text-text-muted" />
        <span className="font-sans text-[11px] font-medium leading-[16.5px] text-text-muted">
          Active Courses
        </span>
        <span className="ml-auto font-mono text-[10px] text-text-faint">
          {courses.length} enrolled
        </span>
      </div>

      <div className="flex flex-col gap-4 pt-4">
        {sorted.map((course) => {
          const days = daysUntilNext(course);
          const fill = urgencyFill(days);

          return (
            <div key={course.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`size-1.5 rounded-full ${dotColor(days)}`} />
                  <span className="font-mono text-[11px] leading-[16.5px] text-text-primary">
                    {course.courseCode}
                  </span>
                </div>
                <span className={`font-sans text-[10px] font-medium leading-[15px] ${statusColor(days)}`}>
                  {statusLabel(days, course)}
                </span>
              </div>

              {/* Urgency bar — fills as deadline approaches */}
              <div className="flex h-1 w-full overflow-hidden rounded-full bg-bg-elevated">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor(days)}`}
                  style={{ width: `${Math.max(fill * 100, fill > 0 ? 3 : 0)}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-sans text-[10px] leading-[15px] text-text-secondary">
                  {course.shortName}
                </span>
                {days !== null && (
                  <span className="font-mono text-[10px] leading-[15px] text-text-faint">
                    next due {days === 0 ? "today" : `in ${days}d`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}