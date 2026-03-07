import { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { getCourses } from "../services/canvasAPI";

// ── Supabase client ────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export { supabase };

// ── Context ────────────────────────────────────────────────────────────────
const CourseContext = createContext(null);

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourse must be used inside CourseProvider");
  return ctx;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const JUNK = ["academic integrity", "community equity", "intra-university", "iut guide", "transfer guide"];

function isCurrentTerm(c) {
  const now = new Date();
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 6);
  const start = c.start_at || c.term?.start_at;
  const end   = c.end_at   || c.term?.end_at;
  if (!start && !end) return true;
  const s = start ? new Date(start) : null;
  const e = end   ? new Date(end)   : null;
  if (s && s > now)    return false;
  if (e && e < now)    return false;
  if (s && s < cutoff) return false;
  return true;
}

function shortCode(c) {
  return (c.course_code || "").split("-")[0].trim() || c.name.slice(0, 12);
}

// Get Supabase user id from Canvas email stored in localStorage
function getUserId() {
  return localStorage.getItem("micro_user_email") || "anonymous";
}

const SETTINGS_TABLE = "user_course_settings";

async function loadActiveCourseId() {
  try {
    const { data } = await supabase
      .from(SETTINGS_TABLE)
      .select("active_canvas_course_id")
      .eq("user_id", getUserId())
      .maybeSingle();
    return data?.active_canvas_course_id ?? null;
  } catch { return null; }
}

async function saveActiveCourseId(courseId) {
  try {
    await supabase.from(SETTINGS_TABLE).upsert({
      user_id: getUserId(),
      active_canvas_course_id: courseId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  } catch { /* non-fatal */ }
}

// ── Provider ───────────────────────────────────────────────────────────────
export function CourseProvider({ children }) {
  const [courses,       setCourses]       = useState([]);
  const [activeCourse,  setActiveCourse]  = useState(null);
  const [loading,       setLoading]       = useState(true);

  // Load courses + restore last selection
  useEffect(() => {
    async function init() {
      try {
        const all = await getCourses();
        const filtered = all
          .filter(isCurrentTerm)
          .filter(c => !JUNK.some(k => c.name.toLowerCase().includes(k)));
        setCourses(filtered);

        const savedId = await loadActiveCourseId();
        const match = filtered.find(c => c.id === savedId) ?? filtered[0] ?? null;
        setActiveCourse(match);
      } catch {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function selectCourse(course) {
    setActiveCourse(course);
    await saveActiveCourseId(course.id);
  }

  return (
    <CourseContext.Provider value={{ courses, activeCourse, selectCourse, loading, shortCode, supabase }}>
      {children}
    </CourseContext.Provider>
  );
}