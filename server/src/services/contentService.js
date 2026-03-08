import { getSupabase } from "../utils/supabase.js";
import { getAnthropic } from "../utils/anthropic.js";
import { generateContentForNode } from "./contentGenerate.js";

/**
 * Collect all terminal outline nodes with content = true.
 * Returns array of { title, objectives, section_id?, subsection_id?, topic_id? }.
 */
async function collectContentNodes(supabase, folderId) {
  const { data: outline } = await supabase
    .from("outlines")
    .select("id")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!outline) throw new Error("No outline found for this folder");

  const { data: sections } = await supabase
    .from("outline_sections")
    .select("id, title, content, objectives, order_index")
    .eq("outline_id", outline.id)
    .order("order_index");

  const nodes = [];

  for (const sec of sections || []) {
    if (sec.content) {
      nodes.push({
        title: sec.title,
        objectives: sec.objectives || [],
        section_id: sec.id,
        subsection_id: null,
        topic_id: null,
      });
      continue;
    }

    const { data: subs } = await supabase
      .from("outline_subsections")
      .select("id, title, content, objectives, order_index")
      .eq("section_id", sec.id)
      .order("order_index");

    for (const sub of subs || []) {
      if (sub.content) {
        nodes.push({
          title: sub.title,
          objectives: sub.objectives || [],
          section_id: null,
          subsection_id: sub.id,
          topic_id: null,
        });
        continue;
      }

      const { data: topics } = await supabase
        .from("outline_topics")
        .select("id, title, content, objectives, order_index")
        .eq("subsection_id", sub.id)
        .order("order_index");

      for (const topic of topics || []) {
        if (topic.content) {
          nodes.push({
            title: topic.title,
            objectives: topic.objectives || [],
            section_id: null,
            subsection_id: null,
            topic_id: topic.id,
          });
        }
      }
    }
  }

  return nodes;
}

/**
 * Run the content generation pipeline.
 * @param {string} folderId
 * @param {(event: object) => void} onProgress - SSE callback
 */
export async function runContentPipeline(folderId, onProgress) {
  const supabase = getSupabase();
  const anthropic = getAnthropic();

  const nodes = await collectContentNodes(supabase, folderId);
  if (!nodes.length) throw new Error("No content nodes found in outline");

  onProgress({ type: "start", total: nodes.length, nodes: nodes.map((n) => n.title) });

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    onProgress({ type: "node_start", index: i, title: node.title });

    try {
      const content = await generateContentForNode(anthropic, node);

      const row = {
        folder_id: folderId,
        section_id: node.section_id,
        subsection_id: node.subsection_id,
        topic_id: node.topic_id,
        node_title: node.title,
        content,
      };

      const { error } = await supabase.from("raw_content").insert(row);
      if (error) throw new Error(error.message);

      onProgress({ type: "node_done", index: i, title: node.title });
    } catch (err) {
      onProgress({ type: "node_error", index: i, title: node.title, error: err.message });
      throw err;
    }
  }

  onProgress({ type: "complete" });
}
