const BASE = "/canvas-api";

// Token is set by Login.jsx and stored in localStorage
// Falls back to .env for local dev without going through login
function getToken() {
  return (
    localStorage.getItem("micro_canvas_token") ||
    import.meta.env.VITE_CANVAS_TOKEN ||
    ""
  );
}

async function canvasFetch(path) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Canvas API error ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function getCourses() {
  return canvasFetch(
    "/courses?enrollment_state=active&enrollment_type=student&include[]=term&include[]=course_progress&per_page=50"
  );
}

export async function getAssignments(courseId) {
  return canvasFetch(
    `/courses/${courseId}/assignments?bucket=upcoming&per_page=100&order_by=due_at&include[]=submission`
  );
}

export async function getGrades(courseId) {
  return canvasFetch(
    `/courses/${courseId}/enrollments?type[]=StudentEnrollment&include[]=current_points`
  );
}

export async function getFiles(courseId) {
  return canvasFetch(
    `/courses/${courseId}/files?per_page=100&sort=updated_at&order=desc`
  );
}

export async function getSyllabus(courseId) {
  return canvasFetch(`/courses/${courseId}?include[]=syllabus_body`);
}

export async function getModules(courseId) {
  return canvasFetch(
    `/courses/${courseId}/modules?include[]=items&per_page=50`
  );
}

export async function getAnnouncements(courseId) {
  return canvasFetch(
    `/announcements?context_codes[]=course_${courseId}&per_page=20`
  );
}

// ── Auth helpers ───────────────────────────────────────────────────────────

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem("micro_canvas_token");
  localStorage.removeItem("micro_canvas_domain");
  localStorage.removeItem("micro_user_name");
  localStorage.removeItem("micro_user_email");
}

// ── Date filtering ─────────────────────────────────────────────────────────

function isCurrentTerm(course) {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const startStr = course.start_at || course.term?.start_at;
  const endStr   = course.end_at   || course.term?.end_at;

  if (!startStr && !endStr) return true;

  const start = startStr ? new Date(startStr) : null;
  const end   = endStr   ? new Date(endStr)   : null;

  if (start && start > now) return false;
  if (end && end < now) return false;
  if (start && start < sixMonthsAgo) return false;

  return true;
}

const IGNORED_KEYWORDS = [
  "academic integrity",
  "community equity",
  "intra-university",
  "iut guide",
  "transfer guide",
];

function isNotJunk(course) {
  const lower = course.name.toLowerCase();
  return !IGNORED_KEYWORDS.some((kw) => lower.includes(kw));
}

export function shortName(name) {
  if (name.includes(":")) return name.split(":")[1].trim();
  return name;
}

export function shortCode(code) {
  if (!code) return "—";
  return code.split("-")[0].trim();
}

// ── Full snapshot ──────────────────────────────────────────────────────────

export async function getFullSnapshot() {
  const allCourses = await getCourses();

  const activeCourses = allCourses
    .filter(isCurrentTerm)
    .filter(isNotJunk);

  const enriched = await Promise.all(
    activeCourses.map(async (course) => {
      const [assignments, enrollments] = await Promise.all([
        getAssignments(course.id).catch(() => []),
        getGrades(course.id).catch(() => []),
      ]);

      const enrollment = enrollments[0] ?? {};
      const grades = enrollment.grades ?? {};

      const now = new Date();
      const upcomingAssignments = assignments
        .filter((a) => !a.due_at || new Date(a.due_at) > now)
        .map((a) => ({
          id: a.id,
          name: a.name,
          dueAt: a.due_at ?? null,
          pointsPossible: a.points_possible,
          score: a.submission?.score ?? null,
          submitted: !!a.submission?.submitted_at,
        }));

      return {
        id: course.id,
        name: course.name,
        shortName: shortName(course.name),
        courseCode: shortCode(course.course_code),
        currentGrade: grades.current_grade ?? null,
        currentScore: grades.current_score ?? null,
        startAt: course.start_at || course.term?.start_at || null,
        endAt: course.end_at || course.term?.end_at || null,
        assignments: upcomingAssignments,
      };
    })
  );

  return enriched;
}