import { generatePracticeExam } from "../services/practice-question-generation.js";

export async function generate(req, res) {
  try {
    const { folder_id, settings = {}, examples_text } = req.body;
    if (!folder_id) return res.status(400).json({ error: "Missing folder_id" });

    const result = await generatePracticeExam(folder_id, settings, examples_text);
    res.json({ success: true, ...result });
  } catch (err) {
    const msg = err?.message || "Unknown error";
    console.error("Practice exam generation error:", msg);
    res.status(400).json({ success: false, error: msg });
  }
}
