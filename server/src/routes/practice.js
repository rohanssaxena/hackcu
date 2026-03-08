import { Router } from "express";
import { generate } from "../controllers/practiceController.js";
import { getSupabase } from "../utils/supabase.js";

const router = Router();

router.get("/", (_req, res) => res.json({ ok: true, route: "practice" }));

const USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

router.get("/list", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: exams, error: examsErr } = await supabase
      .from("practice_exams")
      .select("id, folder_id, title, settings, created_at")
      .eq("user_id", USER_ID)
      .order("created_at", { ascending: false });
    if (examsErr) throw examsErr;
    if (!exams?.length) return res.json({ exams: [], attempts: [] });
    const { data: attempts, error: attemptsErr } = await supabase
      .from("practice_exam_attempts")
      .select("exam_id, score, total, completed_at")
      .in("exam_id", exams.map((e) => e.id))
      .order("completed_at", { ascending: false });
    if (attemptsErr) throw attemptsErr;
    return res.json({ exams: exams || [], attempts: attempts || [] });
  } catch (err) {
    console.error("Practice exams API error:", err);
    return res.status(500).json({ error: err?.message || "Failed to fetch practice exams" });
  }
});

router.get("/generate", (_req, res) => res.json({ ok: true, route: "practice" }));

router.post("/generate", async (req, res, next) => {
  try {
    await generate(req, res);
  } catch (err) {
    console.error("Practice route error:", err);
    res.status(500).json({ success: false, error: err.message || "Practice exam generation failed" });
  }
});

export const practiceRouter = router;
