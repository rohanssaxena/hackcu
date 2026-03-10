import { getSupabase } from "../utils/supabase.js";
import { callLLM, loadPrompt, loadSchema } from "../utils/llm.js";

const systemPrompt = loadPrompt("drill-generation.md");
const outputSchema = loadSchema("drill-generation-schema.json");

/**
 * Fetch objectives by IDs (order preserved). Returns array of { id, objective, weight }.
 */
async function getObjectivesByIds(supabase, objectiveIds) {
  if (!objectiveIds?.length) return [];
  const { data, error } = await supabase
    .from("objectives")
    .select("id, objective, weight")
    .in("id", objectiveIds);

  if (error) throw new Error(`Failed to fetch objectives: ${error.message}`);

  const byId = new Map((data || []).map((o) => [o.id, o]));
  return objectiveIds.map((id) => byId.get(id)).filter(Boolean);
}

/**
 * Build user message for the LLM: optional context (hierarchy + practice_guidance), numbered objectives, optional question count.
 */
function buildUserMessage(objectives, questionCount, context) {
  const contextBlock =
    context != null
      ? `\nCourse context (group hierarchy, content nodes, objectives, practice guidance):\n${typeof context === "string" ? context : JSON.stringify(context, null, 2)}\n\n`
      : "";
  const numbered = objectives
    .map((o, i) => `${i + 1}. ${o.objective}`)
    .join("\n");
  const countLine = questionCount
    ? `\n\nGenerate ${questionCount} drill questions.`
    : "\n\nGenerate at least 1–2 questions per objective.";
  return `${contextBlock}Objectives:\n${numbered}${countLine}`;
}

/**
 * Generate drill questions via Anthropic API (structured JSON output).
 */
async function generateDrillQuestions(objectives, questionCount, context) {
  const userMessage = buildUserMessage(objectives, questionCount, context);
  return callLLM({
    model: "claude-sonnet-4-5-20250929",
    system: systemPrompt,
    user: userMessage,
    schema: outputSchema,
    maxTokens: 8192,
    stream: false,
  });
}

/**
 * Persist a drill set: study_set (type drill) + set_questions + set_question_options + set_question_objectives.
 * objectiveIds: ordered list of objective UUIDs (index 0 = objective index 1 in LLM output).
 */
async function persistDrillSet(supabase, { folderId, userId, title, objectiveIds, questions }) {
  const { data: setRow, error: setErr } = await supabase
    .from("study_sets")
    .insert({
      folder_id: folderId,
      user_id: userId,
      type: "drill",
      title: title || "Drill",
      content: {},
      card_count: questions.length,
    })
    .select("id")
    .single();

  if (setErr) throw new Error(`Failed to create study set: ${setErr.message}`);

  const setId = setRow.id;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const { data: questionRow, error: qErr } = await supabase
      .from("set_questions")
      .insert({
        set_id: setId,
        question: q.question,
        difficulty: q.difficulty ?? 5,
        order: i,
      })
      .select("id")
      .single();

    if (qErr) throw new Error(`Failed to create question: ${qErr.message}`);

    const questionId = questionRow.id;

    for (const opt of q.options || []) {
      const { error: optErr } = await supabase.from("set_question_options").insert({
        question_id: questionId,
        text: opt.text,
        correct: opt.correct ?? false,
        explanation: opt.explanation ?? "",
      });
      if (optErr) throw new Error(`Failed to create option: ${optErr.message}`);
    }

    const indices = Array.isArray(q.objective_indices) ? q.objective_indices : [];
    for (const oneBasedIndex of indices) {
      const idx = oneBasedIndex - 1;
      if (idx >= 0 && idx < objectiveIds.length) {
        const objectiveId = objectiveIds[idx];
        const { error: linkErr } = await supabase.from("set_question_objectives").insert({
          question_id: questionId,
          objective_id: objectiveId,
        });
        if (linkErr) throw new Error(`Failed to link objective: ${linkErr.message}`);
      }
    }
  }

  return { setId, questionCount: questions.length };
}

/**
 * Run the full drill generation pipeline.
 * @param {object} opts
 * @param {string} opts.folderId - Folder UUID
 * @param {string} opts.userId - User UUID
 * @param {string[]} opts.objectiveIds - Ordered list of objective UUIDs
 * @param {string} [opts.title] - Set title (default "Drill")
 * @param {number} [opts.questionCount] - Desired number of questions (optional)
 */
export async function runDrillPipeline({
  folderId,
  userId,
  objectiveIds,
  title,
  questionCount,
  context,
}) {
  const supabase = getSupabase();

  const objectives = await getObjectivesByIds(supabase, objectiveIds);
  if (!objectives.length) throw new Error("No valid objectives found for the given IDs.");

  const result = await generateDrillQuestions(objectives, questionCount, context);
  const questions = result?.questions ?? [];
  if (!questions.length) throw new Error("LLM returned no questions.");

  const { setId, questionCount: savedCount } = await persistDrillSet(supabase, {
    folderId,
    userId,
    title,
    objectiveIds,
    questions,
  });

  return { setId, questionCount: savedCount };
}
