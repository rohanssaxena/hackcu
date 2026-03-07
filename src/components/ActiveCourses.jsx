import { TrendingUp } from "lucide-react";

const COURSES = [
  { code: "CSCI 2270", name: "Data Structures", progress: 75, status: "Up to date" },
  { code: "CSCE 2270", name: "Data Structures", progress: 75, status: "Up to date" },
  { code: "CSCE 2270", name: "Data Structures", progress: 75, status: "Up to date" },
  { code: "CSCE 2270", name: "Data Structures", progress: 75, status: "Up to date" },
];

export default function ActiveCourses() {
  return (
    <div className="flex w-full flex-col pb-px">
      {/* Header */}
      <div className="flex h-9 items-center gap-2 border-b border-border-default pb-px">
        <TrendingUp className="size-3.5 text-text-muted" />
        <span className="font-sans text-[11px] font-medium leading-[16.5px] text-text-muted">
          Active Courses
        </span>
      </div>

      {/* Course list */}
      <div className="flex flex-col gap-4 pt-4">
        {COURSES.map((course, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            {/* Course header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-accent-green" />
                <span className="font-mono text-[11px] leading-[16.5px] text-text-primary">
                  {course.code}
                </span>
              </div>
              <span className="font-sans text-[10px] font-medium leading-[15px] text-accent-green">
                {course.status}
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex h-1 w-full overflow-hidden rounded-full bg-bg-elevated">
              <div
                className="h-full rounded-full bg-accent-blue"
                style={{ width: `${course.progress}%` }}
              />
            </div>

            {/* Course meta */}
            <div className="flex items-center justify-between">
              <span className="font-sans text-[10px] leading-[15px] text-text-secondary">
                {course.name}
              </span>
              <span className="font-mono text-[10px] leading-[15px] text-text-secondary">
                {course.progress}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
