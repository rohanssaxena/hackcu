import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { supabase, USER_ID } from "../lib/supabase";

export default function ActiveCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: courseRows } = await supabase
        .from("courses")
        .select("id, title, subject, status, last_accessed_at")
        .eq("user_id", USER_ID)
        .eq("status", "ready")
        .order("last_accessed_at", { ascending: false, nullsFirst: false });

      if (!courseRows) {
        setLoading(false);
        return;
      }

      const enriched = await Promise.all(
        courseRows.map(async (c) => {
          const { data: beliefs } = await supabase
            .from("mastery_beliefs")
            .select("p_know")
            .eq("user_id", USER_ID)
            .in(
              "topic_id",
              (
                await supabase
                  .from("topics")
                  .select("id")
                  .eq("course_id", c.id)
              ).data?.map((t) => t.id) || [],
            );

          const avgMastery = beliefs?.length
            ? Math.round(
                (beliefs.reduce((s, b) => s + b.p_know, 0) / beliefs.length) *
                  100,
              )
            : 0;

          return {
            id: c.id,
            code: c.title,
            name: c.subject,
            progress: avgMastery,
            status: avgMastery >= 70 ? "Up to date" : "In progress",
          };
        }),
      );

      setCourses(enriched);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="flex w-full flex-col pb-px">
      <div className="flex h-9 items-center gap-2 border-b border-border-default pb-px">
        <TrendingUp className="size-3.5 text-text-muted" />
        <span className="font-sans text-[11px] font-medium leading-[16.5px] text-text-muted">
          Active Courses
        </span>
      </div>

      <div className="flex flex-col gap-4 pt-4">
        {loading ? (
          <div className="py-2 text-center font-sans text-[11px] text-text-faint">
            Loading…
          </div>
        ) : (
          courses.map((course) => (
            <div key={course.id} className="flex flex-col gap-1.5">
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

              <div className="flex h-1 w-full overflow-hidden rounded-full bg-bg-elevated">
                <div
                  className="h-full rounded-full bg-accent-blue"
                  style={{ width: `${course.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-sans text-[10px] leading-[15px] text-text-secondary">
                  {course.name}
                </span>
                <span className="font-mono text-[10px] leading-[15px] text-text-secondary">
                  {course.progress}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
