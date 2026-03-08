import { getSupabase } from "../utils/supabase.js";

const USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

/**
 * Fetch real progress data from practice_exams and practice_exam_attempts.
 * Returns stats, scoresOverTime, examPerformance, studyActivity, recentAttempts.
 */
export async function getProgressData() {
  const supabase = getSupabase();

  const { data: exams, error: examsErr } = await supabase
    .from("practice_exams")
    .select("id, folder_id, title, created_at")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: false });

  if (examsErr) throw new Error(examsErr.message);
  const examList = exams || [];

  if (examList.length === 0) {
    return {
      stats: { totalAttempts: 0, avgScore: null, bestScore: null, examsCreated: 0 },
      scoresOverTime: [],
      examPerformance: [],
      studyActivity: [],
      recentAttempts: [],
    };
  }

  const examIds = examList.map((e) => e.id);
  const { data: attempts, error: attemptsErr } = await supabase
    .from("practice_exam_attempts")
    .select("exam_id, score, total, completed_at")
    .in("exam_id", examIds)
    .eq("user_id", USER_ID)
    .order("completed_at", { ascending: false });

  if (attemptsErr) throw new Error(attemptsErr.message);
  const attemptList = attempts || [];

  const { data: folders } = await supabase
    .from("folders")
    .select("id, name")
    .in("id", [...new Set(examList.map((e) => e.folder_id))]);

  const folderMap = new Map((folders || []).map((f) => [f.id, f]));

  const totalAttempts = attemptList.length;
  const scores = attemptList.map((a) => (a.total > 0 ? Math.round((a.score / a.total) * 100) : 0));
  const avgScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;
  const bestScore = scores.length ? Math.max(...scores) : null;

  const examMap = new Map(examList.map((e) => [e.id, e]));
  const baseDate = new Date();
  const dateToKey = (d) => d.toISOString().slice(0, 10);

  const scoresOverTime = [];
  const studyActivityMap = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateStr = dateToKey(d);
    const dayAttempts = attemptList.filter((a) => {
      const t = new Date(a.completed_at);
      return dateToKey(t) === dateStr;
    });
    const dayScores = dayAttempts
      .map((a) => (a.total > 0 ? Math.round((a.score / a.total) * 100) : 0))
      .filter((v) => v > 0);
    scoresOverTime.push({
      date: dateStr,
      attempts: dayAttempts.length,
      avgScore: dayScores.length ? Math.round(dayScores.reduce((s, v) => s + v, 0) / dayScores.length) : 0,
    });
    studyActivityMap[dateStr] = dayAttempts.length;
  }

  const studyActivity = scoresOverTime.map(({ date }) => ({
    date,
    count: studyActivityMap[date] || 0,
  }));

  const examScores = {};
  for (const a of attemptList) {
    const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
    if (!examScores[a.exam_id]) examScores[a.exam_id] = [];
    examScores[a.exam_id].push(pct);
  }

  const examPerformance = examList
    .filter((e) => (examScores[e.id] || []).length > 0)
    .map((e) => {
      const sc = examScores[e.id] || [];
      const avg = Math.round(sc.reduce((s, v) => s + v, 0) / sc.length);
      const folder = folderMap.get(e.folder_id);
      return {
        title: e.title,
        folder: folder?.name || "Unknown",
        avgScore: avg,
        attempts: sc.length,
      };
    })
    .slice(0, 10);

  const recentAttempts = attemptList.slice(0, 10).map((a) => {
    const exam = examMap.get(a.exam_id);
    const folder = exam ? folderMap.get(exam.folder_id) : null;
    const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
    return {
      exam_id: a.exam_id,
      exam_title: exam?.title || "Practice Exam",
      folder_name: folder?.name || "Unknown",
      folder_id: exam?.folder_id || null,
      pct,
      completed_at: a.completed_at,
    };
  });

  return {
    stats: {
      totalAttempts,
      avgScore,
      bestScore,
      examsCreated: examList.length,
    },
    scoresOverTime,
    examPerformance,
    studyActivity,
    recentAttempts,
  };
}
