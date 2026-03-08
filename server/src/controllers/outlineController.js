import { runOutlinePipeline } from "../services/outlineService.js";

export async function generateOutline(req, res) {
  try {
    const { folder_id } = req.body;
    if (!folder_id) return res.status(400).json({ error: "Missing folder_id" });

    const outline = await runOutlinePipeline(folder_id);
    res.json({ success: true, outline });
  } catch (err) {
    console.error("Outline generation error:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
}
