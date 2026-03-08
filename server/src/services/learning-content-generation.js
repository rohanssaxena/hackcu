import { getSupabase } from "../utils/supabase.js";
import { callLLM, loadPrompt, loadSchema } from "../utils/llm.js";

const systemPrompt = loadPrompt("learning-content-gen.md");
const outputSchema = loadSchema("learning-content-schema.json");

async function generateAllContent(nodes) {
  const topicList = nodes
    .map((n, i) => {
      const objs = (n.objectives || [])
        .map((o) => `  - ${o.objective} (weight: ${o.weight})`)
        .join("\n");
      return (
        `### ${i + 1}. ${n.title}\n` +
        (objs ? `**Objectives:**\n${objs}\n` : "") +
        `**Learning guidance:** ${n.learning_guidance || "N/A"}\n` +
        `**Practice guidance:** ${n.practice_guidance || "N/A"}`
      );
    })
    .join("\n\n");

  return callLLM({
    model: "claude-haiku-4-5-20251001",
    system: systemPrompt,
    user:
      `Generate phased learning content for the following ${nodes.length} topics.\n\n` +
      `${topicList}\n\n` +
      `For each topic, produce phases with checkpoints as described in the system prompt. ` +
      `Make sure each entry's \`topic\` matches the input title exactly.`,
    schema: outputSchema,
    maxTokens: 64000,
    stream: true,
  });
}

async function persistContentForNode(supabase, contentNodeId, entry) {
  for (let pi = 0; pi < (entry.phases?.length || 0); pi++) {
    const phase = entry.phases[pi];

    const { data: phaseRow, error: phaseErr } = await supabase
      .from("phases")
      .insert({
        content_node: contentNodeId,
        title: phase.title,
        content: phase.content,
        estimated_time_minutes: phase.estimated_time_minutes,
        order: pi,
      })
      .select("id")
      .single();

    if (phaseErr) throw new Error(`Failed to save phase "${phase.title}": ${phaseErr.message}`);

    for (const check of phase.checks || []) {
      const { data: checkRow, error: checkErr } = await supabase
        .from("checkpoints")
        .insert({
          phase: phaseRow.id,
          question: check.question,
          difficulty: check.difficulty,
        })
        .select("id")
        .single();

      if (checkErr) throw new Error(`Failed to save checkpoint: ${checkErr.message}`);

      const optionRows = (check.options || []).map((opt) => ({
        checkpoint: checkRow.id,
        text: opt.text,
        correct: opt.correct,
        explanation: opt.explanation || "",
      }));

      if (optionRows.length) {
        const { error: optErr } = await supabase.from("options").insert(optionRows);
        if (optErr) throw new Error(`Failed to save options: ${optErr.message}`);
      }
    }
  }
}

async function collectContentNodes(supabase, folderId) {
  const { data: allNodes, error } = await supabase
    .from("content_nodes")
    .select("id, title, concept_tags, learning_guidance, practice_guidance")
    .eq("folder_id", folderId)
    .order("order");

  if (error) throw new Error(`Failed to fetch content nodes: ${error.message}`);
  if (!allNodes?.length) throw new Error("No content nodes found for this folder");

  const allIds = allNodes.map((n) => n.id);
  const { data: existingPhases } = await supabase
    .from("phases")
    .select("content_node")
    .in("content_node", allIds);

  const doneSet = new Set((existingPhases || []).map((p) => p.content_node));
  const nodes = allNodes.filter((n) => !doneSet.has(n.id));

  if (!nodes.length) return { all: allNodes, pending: [] };

  const nodeIds = nodes.map((n) => n.id);
  const { data: objectives, error: objErr } = await supabase
    .from("objectives")
    .select("content_node, objective, weight")
    .in("content_node", nodeIds);

  if (objErr) throw new Error(`Failed to fetch objectives: ${objErr.message}`);

  const objMap = new Map();
  for (const obj of objectives || []) {
    if (!objMap.has(obj.content_node)) objMap.set(obj.content_node, []);
    objMap.get(obj.content_node).push(obj);
  }

  return {
    all: allNodes,
    pending: nodes.map((n) => ({ ...n, objectives: objMap.get(n.id) || [] })),
  };
}

export async function runContentPipeline(folderId, onProgress) {
  const supabase = getSupabase();

  onProgress({ type: "status", step: "collect", message: "Collecting content nodes…" });

  const { all, pending } = await collectContentNodes(supabase, folderId);

  onProgress({
    type: "start",
    total: all.length,
    pendingCount: pending.length,
  });

  if (!pending.length) {
    onProgress({ type: "status", step: "skip", message: "All content already generated." });
  } else {
    onProgress({
      type: "status",
      step: "generate",
      message: `Generating content for ${pending.length} topic${pending.length !== 1 ? "s" : ""}…`,
    });

    const result = await generateAllContent(pending);
    const titleMap = new Map(pending.map((n) => [n.title, n]));

    onProgress({ type: "status", step: "store", message: "Storing phases…" });

    for (const entry of result.topics || []) {
      const node = titleMap.get(entry.topic);
      if (!node) {
        console.warn(`No matching DB node for "${entry.topic}", skipping`);
        continue;
      }
      await persistContentForNode(supabase, node.id, entry);
    }
  }

  await supabase
    .from("folders")
    .update({ lc_generated: true })
    .eq("id", folderId);

  onProgress({ type: "complete", total: all.length });
}
