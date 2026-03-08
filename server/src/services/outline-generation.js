import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getSupabase } from "../utils/supabase.js";
import { getAnthropic } from "../utils/anthropic.js";
import { extractFolderText } from "./extract.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(__dirname, "../../../prompts");

const systemPrompt = readFileSync(resolve(PROMPTS_DIR, "outline-generation.md"), "utf-8");
const outputSchema = JSON.parse(
  readFileSync(resolve(PROMPTS_DIR, "outline-generation-schema.json"), "utf-8"),
);

const MAX_CONTENT_CHARS = 120_000;

function buildFileContents(files) {
  let combined = "";
  for (const f of files) {
    const header = `\n\n===== ${f.filename} =====\n\n`;
    if (combined.length + header.length + f.text.length > MAX_CONTENT_CHARS) {
      combined += header + f.text.slice(0, MAX_CONTENT_CHARS - combined.length - header.length);
      combined += "\n[... truncated ...]";
      break;
    }
    combined += header + f.text;
  }
  return combined;
}

async function callLLM(anthropic, folderName, files) {
  const fileContents = buildFileContents(files);

  const userMessage =
    `Generate a structured academic course outline for "${folderName}" ` +
    `based on the following study materials:\n\n${fileContents}`;

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
}

async function insertNode(supabase, folderId, parentGroupId, node, orderIndex) {
  if (node.type === "group") {
    const { data: row, error } = await supabase
      .from("groups")
      .insert({
        folder_id: folderId,
        parent: parentGroupId,
        title: node.title,
        order: orderIndex,
        progress: 0,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Failed to save group "${node.title}": ${error.message}`);

    for (let i = 0; i < (node.nodes?.length || 0); i++) {
      await insertNode(supabase, folderId, row.id, node.nodes[i], i);
    }
  } else if (node.type === "content") {
    const { data: row, error } = await supabase
      .from("content_nodes")
      .insert({
        folder_id: folderId,
        parent: parentGroupId,
        title: node.title,
        order: orderIndex,
        concept_tags: node.concept_tags || [],
        learning_guidance: node.learning_guidance || "",
        practice_guidance: node.practice_guidance || "",
      })
      .select("id")
      .single();

    if (error) throw new Error(`Failed to save content node "${node.title}": ${error.message}`);

    const objectives = (node.objectives || []).map((obj) => ({
      content_node: row.id,
      objective: obj.objective,
      weight: obj.weight,
    }));

    if (objectives.length) {
      const { error: objErr } = await supabase.from("objectives").insert(objectives);
      if (objErr) throw new Error(`Failed to save objectives for "${node.title}": ${objErr.message}`);
    }
  }
}

async function persistOutline(supabase, folderId, outline) {
  for (let i = 0; i < (outline.nodes?.length || 0); i++) {
    await insertNode(supabase, folderId, null, outline.nodes[i], i);
  }
}

export async function runOutlinePipeline(folderId) {
  const supabase = getSupabase();
  const anthropic = getAnthropic();

  const { data: folder, error: folderErr } = await supabase
    .from("folders")
    .select("id, name, outline_generated")
    .eq("id", folderId)
    .single();

  if (folderErr || !folder) throw new Error("Folder not found");
  if (folder.outline_generated) throw new Error("Outline already generated for this folder");

  const { data: files, error: filesErr } = await supabase
    .from("course_files")
    .select("id, filename, file_type, file_size_bytes, storage_path")
    .eq("folder_id", folderId);

  if (filesErr) throw new Error(`Failed to fetch files: ${filesErr.message}`);
  if (!files?.length) throw new Error("No files in folder");

  const extracted = await extractFolderText(supabase, files);
  if (!extracted.length) throw new Error("Could not extract text from any files");

  const outline = await callLLM(anthropic, folder.name, extracted);

  await persistOutline(supabase, folderId, outline);

  await supabase
    .from("folders")
    .update({ outline_generated: true })
    .eq("id", folderId);

  return outline;
}
