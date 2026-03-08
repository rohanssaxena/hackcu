import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getSupabase } from "../utils/supabase.js";
import { getAnthropic } from "../utils/anthropic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(__dirname, "../../../prompts");

const systemPrompt = readFileSync(resolve(PROMPTS_DIR, "learning-content-gen.md"), "utf-8");
const outputSchema = JSON.parse(
  readFileSync(resolve(PROMPTS_DIR, "learning-content-schema.json"), "utf-8"),
);

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 15_000;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateForNode(anthropic, node) {
  const objectivesList = (node.objectives || [])
    .map((o) => `  - ${o.objective} (weight: ${o.weight})`)
    .join("\n");

  const userMessage =
    `Generate phased learning content for the following topic.\n\n` +
    `**Topic:** ${node.title}\n\n` +
    `**Objectives:**\n${objectivesList}\n\n` +
    `**Learning guidance:** ${node.learning_guidance || "N/A"}\n\n` +
    `**Practice guidance:** ${node.practice_guidance || "N/A"}\n\n` +
    `Make sure the \`topic\` field in your output matches "${node.title}" exactly.`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 16384,
        messages: [{ role: "user", content: userMessage }],
        system: systemPrompt,
        output_config: {
          format: {
            type: "json_schema",
            schema: outputSchema,
          },
        },
      });

      const text = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      return JSON.parse(text);
    } catch (err) {
      const isRateLimit = err.status === 429 || err.error?.type === "rate_limit_error";
      if (!isRateLimit || attempt === MAX_RETRIES) throw err;

      const retryAfter = err.headers?.["retry-after"];
      const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : BASE_DELAY_MS * (attempt + 1);
      console.log(`Rate limited on "${node.title}", retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(delayMs / 1000)}s`);
      await sleep(delayMs);
    }
  }
}

async function persistContentForNode(supabase, contentNodeId, result) {
  for (let pi = 0; pi < (result.phases?.length || 0); pi++) {
    const phase = result.phases[pi];

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

  // Skip nodes that already have phases (idempotent re-runs)
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
  const anthropic = getAnthropic();

  onProgress({ type: "status", step: "collect", message: "Collecting content nodes…" });

  const { all, pending } = await collectContentNodes(supabase, folderId);
  const alreadyDone = all.length - pending.length;

  onProgress({
    type: "start",
    total: all.length,
    nodes: all.map((n) => n.title),
    alreadyDone,
  });

  if (!pending.length) {
    onProgress({ type: "status", step: "skip", message: "All content already generated." });
  }

  for (let i = 0; i < pending.length; i++) {
    const node = pending[i];

    onProgress({
      type: "node_start",
      title: node.title,
      index: alreadyDone + i,
      total: all.length,
    });

    const result = await generateForNode(anthropic, node);
    await persistContentForNode(supabase, node.id, result);

    onProgress({
      type: "node_complete",
      title: node.title,
      completed: alreadyDone + i + 1,
      total: all.length,
    });
  }

  await supabase
    .from("folders")
    .update({ lc_generated: true })
    .eq("id", folderId);

  onProgress({ type: "complete", total: nodes.length });
}
