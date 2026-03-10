import { runDrillPipeline } from "../services/drill-generation.js";

export async function generateDrill(req, res) {
  try {
    const { folder_id, user_id, objective_ids, title, question_count, context } = req.body;

    if (!folder_id || !user_id || !Array.isArray(objective_ids)) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: folder_id, user_id, objective_ids (array)",
      });
    }

    if (objective_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "objective_ids must contain at least one objective ID",
      });
    }

    const { setId, questionCount } = await runDrillPipeline({
      folderId: folder_id,
      userId: user_id,
      objectiveIds: objective_ids,
      title: title || "Drill",
      questionCount: question_count,
      context: context ?? null,
    });

    res.json({
      success: true,
      set_id: setId,
      question_count: questionCount,
    });
  } catch (err) {
    console.error("Drill generation error:", err.message);
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
}
