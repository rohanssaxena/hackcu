import { getSupabase } from "../utils/supabase.js";
import { callLLM, loadPrompt, loadSchema } from "../utils/llm.js";
import { extractFolderText } from "./extract.js";

const systemPrompt = loadPrompt("outline-generation.md");
const outputSchema = loadSchema("outline-generation-schema.json");

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

async function generateOutline(folderName, files) {
  const fileContents = buildFileContents(files);

  return callLLM({
    model: "claude-sonnet-4-5-20250929",
    system: systemPrompt,
    user:
      `Generate a structured academic course outline for "${folderName}" ` +
      `based on the following study materials:\n\n${fileContents}`,
    schema: outputSchema,
  });
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

  const outline = await generateOutline(folder.name, extracted);

  await persistOutline(supabase, folderId, outline);

  await supabase
    .from("folders")
    .update({ outline_generated: true })
    .eq("id", folderId);

  return outline;
}
