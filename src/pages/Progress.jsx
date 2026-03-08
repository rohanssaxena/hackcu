import { useState, useEffect } from "react";
import { Loader2, Brain, TrendingUp, Layers, BookOpen } from "lucide-react";
import { useCourse } from "../context/CourseContext";

// ── Helpers ────────────────────────────────────────────────────────────────
function storageKey(courseId) { return `micro_review_${courseId}`; }

function loadReviewData(courseId) {
  try { return JSON.parse(localStorage.getItem(storageKey(courseId)) || "null"); }
  catch { return null; }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ── Sparkline ──────────────────────────────────────────────────────────────
function Sparkline({ scores }) {
  if (!scores.length) return null;
  const W = 300, H = 60, PAD = 8;
  const vals = scores.map(s => (s.score / s.total) * 100);
  const min  = Math.min(...vals, 0);
  const max  = Math.max(...vals, 100);
  const range = max - min || 1;

  const pts = vals.map((v, i) => {
    const x = PAD + (i / Math.max(vals.length - 1, 1)) * (W - PAD * 2);
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });

  const latest = vals[vals.length - 1];
  const color  = latest >= 80 ? "#05df72" : latest >= 60 ? "#facc15" : "#f87171";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 60 }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {pts.map((pt, i) => {
        const [x, y] = pt.split(",").map(Number);
        return (
          <circle key={i} cx={x} cy={y} r="3" fill={color} opacity="0.9" />
        );
      })}
    </svg>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "text-text-primary" }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border-default bg-bg-elevated p-5">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${color}`} />
        <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
      </div>
      <span className={`font-sans text-[32px] font-bold leading-none ${color}`}>{value}</span>
      {sub && <span className="font-sans text-[11px] text-text-faint">{sub}</span>}
    </div>
  );
}

// ── Mastery bar ────────────────────────────────────────────────────────────
function MasteryBar({ known, unknown, total }) {
  const knownPct   = total ? Math.round((known   / total) * 100) : 0;
  const unknownPct = total ? Math.round((unknown / total) * 100) : 0;
  const unreviewed = 100 - knownPct - unknownPct;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-bg-elevated">
        <div className="h-full bg-accent-green transition-all" style={{ width: `${knownPct}%` }} />
        <div className="h-full bg-red-400    transition-all" style={{ width: `${unknownPct}%` }} />
        <div className="h-full bg-[#333]     transition-all" style={{ width: `${unreviewed}%` }} />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent-green" />
          <span className="font-sans text-[11px] text-text-secondary">{knownPct}% mastered ({known})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-400" />
          <span className="font-sans text-[11px] text-text-secondary">{unknownPct}% learning ({unknown})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#444]" />
          <span className="font-sans text-[11px] text-text-secondary">{unreviewed}% unreviewed</span>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Progress() {
  const { activeCourse, shortCode, supabase } = useCourse();

  const [quizScores,        setQuizScores]        = useState([]);
  const [flashcardResults,  setFlashcardResults]  = useState([]);
  const [loading,           setLoading]           = useState(true);

  const courseId = activeCourse?.id;

  useEffect(() => {
    if (!courseId) { setLoading(false); return; }
    const userId = localStorage.getItem("micro_user_email") || "anonymous";

    async function fetchData() {
      setLoading(true);
      try {
        const [qRes, fRes] = await Promise.all([
          supabase
            .from("quiz_results")
            .select("*")
            .eq("user_id", userId)
            .eq("course_id", String(courseId))
            .order("created_at", { ascending: true }),
          supabase
            .from("flashcard_results")
            .select("*")
            .eq("user_id", userId)
            .eq("course_id", String(courseId))
            .order("created_at", { ascending: false }),
        ]);
        setQuizScores(qRes.data || []);
        setFlashcardResults(fRes.data || []);
      } catch {
        setQuizScores([]);
        setFlashcardResults([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [courseId, supabase]);

  if (!activeCourse) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-sans text-[14px] text-text-secondary">Select a course to view progress.</p>
      </div>
    );
  }

  const reviewData = loadReviewData(courseId);
  const totalTerms = reviewData?.terms?.length ?? 0;

  // Build a lookup from term string -> definition using stored study set
  const defLookup = new Map();
  (reviewData?.terms || []).forEach(t => defLookup.set(t.term, t.definition));

  // Flashcard stats — use most recent result per term, enrich with definition
  const termMap = new Map(); // term string -> { known, definition }
  flashcardResults.forEach(r => {
    if (!termMap.has(r.term)) {
      termMap.set(r.term, { known: r.known, definition: defLookup.get(r.term) || "" });
    }
  });
  const knownCount    = [...termMap.values()].filter(v => v.known).length;
  const unknownCount  = [...termMap.values()].filter(v => !v.known).length;
  const reviewedCount = termMap.size;

  // Quiz stats
  const latestQuiz  = quizScores[quizScores.length - 1];
  const avgScore    = quizScores.length
    ? Math.round(quizScores.reduce((s, q) => s + (q.score / q.total) * 100, 0) / quizScores.length)
    : null;

  const courseName = activeCourse.name.includes(":")
    ? activeCourse.name.split(":")[1].trim()
    : activeCourse.name;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-8 pt-10 pb-10">
      {/* Header */}
      <div className="mb-7">
        <h1 className="font-sans text-4xl font-semibold text-text-primary">Progress</h1>
        <p className="mt-1 font-sans text-[13px] text-text-secondary">
          {shortCode(activeCourse)} — {courseName}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-text-secondary" />
          <span className="font-sans text-[13px] text-text-secondary">Loading progress…</span>
        </div>
      ) : (
        <div className="flex flex-col gap-8 max-w-3xl">

          {/* ── Stat overview ── */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={Brain}
              label="Avg Quiz Score"
              value={avgScore !== null ? `${avgScore}%` : "—"}
              sub={quizScores.length ? `${quizScores.length} attempt${quizScores.length !== 1 ? "s" : ""}` : "No quizzes yet"}
              color={avgScore >= 80 ? "text-accent-green" : avgScore >= 60 ? "text-yellow-400" : avgScore !== null ? "text-red-400" : "text-text-faint"}
            />
            <StatCard
              icon={Layers}
              label="Terms Mastered"
              value={totalTerms ? `${Math.round((knownCount / totalTerms) * 100)}%` : "—"}
              sub={totalTerms ? `${knownCount} of ${totalTerms} terms` : "No flashcards yet"}
              color="text-accent-blue"
            />
            <StatCard
              icon={TrendingUp}
              label="Latest Quiz"
              value={latestQuiz ? `${Math.round((latestQuiz.score / latestQuiz.total) * 100)}%` : "—"}
              sub={latestQuiz ? `${latestQuiz.score}/${latestQuiz.total} · ${formatDate(latestQuiz.created_at)}` : "No quizzes yet"}
              color={latestQuiz ? (latestQuiz.score / latestQuiz.total >= 0.8 ? "text-accent-green" : "text-yellow-400") : "text-text-faint"}
            />
          </div>

          {/* ── Flashcard mastery breakdown ── */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border-default bg-bg-elevated p-5">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-accent-blue" />
              <span className="font-sans text-[13px] font-semibold text-text-primary">Flashcard Mastery</span>
              {totalTerms > 0 && (
                <span className="font-mono text-[10px] text-text-faint ml-auto">{reviewedCount} of {totalTerms} reviewed</span>
              )}
            </div>

            {totalTerms === 0 ? (
              <p className="font-sans text-[12px] text-text-secondary">Generate flashcards in the Review tab to track mastery.</p>
            ) : (
              <MasteryBar known={knownCount} unknown={unknownCount} total={totalTerms} />
            )}
          </div>

          {/* ── Quiz scores over time ── */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border-default bg-bg-elevated p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-accent-green" />
              <span className="font-sans text-[13px] font-semibold text-text-primary">Quiz Scores Over Time</span>
              {quizScores.length > 0 && (
                <span className="font-mono text-[10px] text-text-faint ml-auto">{quizScores.length} attempt{quizScores.length !== 1 ? "s" : ""}</span>
              )}
            </div>

            {!quizScores.length ? (
              <p className="font-sans text-[12px] text-text-secondary">Complete a quiz in the Review tab to see your trend.</p>
            ) : (
              <>
                <Sparkline scores={quizScores} />
                {/* Score history list */}
                <div className="flex flex-col gap-1 mt-1">
                  {[...quizScores].reverse().slice(0, 8).map((q, i) => {
                    const pct   = Math.round((q.score / q.total) * 100);
                    const color = pct >= 80 ? "text-accent-green" : pct >= 60 ? "text-yellow-400" : "text-red-400";
                    return (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-border-default last:border-0">
                        <span className="font-sans text-[12px] text-text-secondary">
                          {formatDate(q.created_at)} at {formatTime(q.created_at)}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[11px] text-text-faint">{q.score}/{q.total}</span>
                          <span className={`font-sans text-[13px] font-semibold ${color}`}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ── Terms breakdown ── */}
          {reviewedCount > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-border-default bg-bg-elevated p-5">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-purple-400" />
                <span className="font-sans text-[13px] font-semibold text-text-primary">Terms Breakdown</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Still learning */}
                <div className="flex flex-col gap-2">
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-red-400">Still Learning ({unknownCount})</span>
                  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                    {[...termMap.entries()].filter(([, v]) => !v.known).map(([term, { definition }]) => (
                      <div key={term} className="flex flex-col gap-0.5 py-1.5 border-b border-border-default last:border-0">
                        <span className="font-sans text-[12px] font-medium text-text-primary">{term}</span>
                        {definition && <span className="font-sans text-[11px] text-text-faint leading-relaxed">{definition}</span>}
                      </div>
                    ))}
                    {unknownCount === 0 && <span className="font-sans text-[11px] text-text-faint italic">None — great work!</span>}
                  </div>
                </div>
                {/* Mastered */}
                <div className="flex flex-col gap-2">
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-accent-green">Mastered ({knownCount})</span>
                  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                    {[...termMap.entries()].filter(([, v]) => v.known).map(([term, { definition }]) => (
                      <div key={term} className="flex flex-col gap-0.5 py-1.5 border-b border-border-default last:border-0">
                        <span className="font-sans text-[12px] font-medium text-text-primary">{term}</span>
                        {definition && <span className="font-sans text-[11px] text-text-faint leading-relaxed">{definition}</span>}
                      </div>
                    ))}
                    {knownCount === 0 && <span className="font-sans text-[11px] text-text-faint italic">Keep studying!</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}