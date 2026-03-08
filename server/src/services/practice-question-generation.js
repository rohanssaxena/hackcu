import { getSupabase } from "../utils/supabase.js";
import { callLLM, loadPrompt, loadSchema } from "../utils/llm.js";

const USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const MAX_QUESTIONS = 10;
const systemPrompt = loadPrompt("practice-question-generation.md");
const outputSchema = loadSchema("practice-question-schema.json");

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function generatePracticeExam(folderId, settings = {}, examplesText = null) {
  const supabase = getSupabase();
  const { length = "medium", difficulty = "medium" } = settings;

  const { data: folder, error: folderErr } = await supabase
    .from("folders")
    .select("id, name")
    .eq("id", folderId)
    .single();

  if (folderErr || !folder) throw new Error("Folder not found");

  const { data: contentNodes, error: nodesErr } = await supabase
    .from("content_nodes")
    .select("id, title, learning_guidance, practice_guidance")
    .eq("folder_id", folderId)
    .order("order");

  if (nodesErr) throw new Error(`Failed to fetch content nodes: ${nodesErr.message}`);
  if (!contentNodes?.length) throw new Error("No content nodes found for this folder");

  const nodeIds = contentNodes.map((n) => n.id);
  const { data: objectives, error: objErr } = await supabase
    .from("objectives")
    .select("id, content_node, objective, weight")
    .in("content_node", nodeIds);

  if (objErr) throw new Error(`Failed to fetch objectives: ${objErr.message}`);
  if (!objectives?.length) throw new Error("No objectives found for this folder");

  const nodeMap = new Map(contentNodes.map((n) => [n.id, n]));
  const objectivesWithTitles = objectives.map((o) => ({
    ...o,
    nodeTitle: nodeMap.get(o.content_node)?.title || "Unknown",
    practiceGuidance: nodeMap.get(o.content_node)?.practice_guidance || "",
    learningGuidance: nodeMap.get(o.content_node)?.learning_guidance || "",
  }));

  const objectivesList = objectivesWithTitles
    .map((o) => `${o.nodeTitle}: "${o.objective}"`)
    .join("\n");

  let examplesContent = "";
  if (examplesText?.trim()) {
    examplesContent = "\n\nExample style:\n" + examplesText.trim().slice(0, 300);
  }

  const userPrompt =
    `Generate ${MAX_QUESTIONS} multiple-choice questions for "${folder.name}".\n\n` +
    `Objectives to draw from:\n${objectivesList}\n\n` +
    `Length: ${length}. Difficulty: ${difficulty}.` +
    (examplesContent ? examplesContent : "") +
    `\n\nReturn exactly ${MAX_QUESTIONS} questions. Each: one correct option. Be concise.`;

  const result = await callLLM({
    model: "claude-3-5-haiku-20241022",
    system: systemPrompt,
    user: userPrompt,
    schema: outputSchema,
    maxTokens: 8000,
    stream: false,
  });

  const rawQuestions = result?.questions || [];
  const allQuestions = rawQuestions.slice(0, MAX_QUESTIONS).map((q) => ({
    objective_id: null,
    question: q.question,
    topic: q.topic || null,
    options: q.options || [],
  }));
  if (allQuestions.length === 0) throw new Error("LLM returned no questions");

  const shuffled = shuffle(allQuestions);

  const { data: examRow, error: examErr } = await supabase
    .from("practice_exams")
    .insert({
      folder_id: folderId,
      user_id: USER_ID,
      title: "Practice Exam",
      settings: { length, difficulty, question_count: shuffled.length },
    })
    .select("id")
    .single();

  if (examErr) throw new Error(`Failed to create practice exam: ${examErr.message}`);

  const questionsToInsert = shuffled.map((q, i) => ({
    exam_id: examRow.id,
    objective_id: q.objective_id,
    question: q.question,
    topic: q.topic || null,
    options: q.options || [],
    order: i,
  }));

  const { error: insertErr } = await supabase.from("practice_questions").insert(questionsToInsert);
  if (insertErr) throw new Error(`Failed to save questions: ${insertErr.message}`);

  return { exam_id: examRow.id, question_count: shuffled.length };
}
