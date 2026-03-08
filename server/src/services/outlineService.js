import { getSupabase } from "../utils/supabase.js";
import { getAnthropic } from "../utils/anthropic.js";
import { extractFolderText } from "./extract.js";
import { generateOutline } from "./generate.js";

async function persistOutline(supabase, folderId, outline) {
  const { data: outlineRow, error: outlineErr } = await supabase
    .from("outlines")
    .insert({ folder_id: folderId, title: outline.title })
    .select("id")
    .single();

  if (outlineErr) throw new Error(`Failed to save outline: ${outlineErr.message}`);
  const outlineId = outlineRow.id;

  for (let si = 0; si < (outline.sections?.length || 0); si++) {
    const section = outline.sections[si];
    const hasSubsections = section.subsections?.length > 0;

    const { data: secRow, error: secErr } = await supabase
      .from("outline_sections")
      .insert({
        outline_id: outlineId,
        title: section.title,
        content: !hasSubsections,
        objectives: section.content ? section.objectives || [] : null,
        practice_guidance: section.content ? section.practice_guidance || [] : null,
        order_index: si,
      })
      .select("id")
      .single();

    if (secErr) throw new Error(`Failed to save section: ${secErr.message}`);

    if (!hasSubsections) continue;

    for (let ssi = 0; ssi < section.subsections.length; ssi++) {
      const sub = section.subsections[ssi];
      const hasTopics = sub.topics?.length > 0;

      const { data: subRow, error: subErr } = await supabase
        .from("outline_subsections")
        .insert({
          section_id: secRow.id,
          title: sub.title,
          content: !hasTopics,
          objectives: sub.content ? sub.objectives || [] : null,
          practice_guidance: sub.content ? sub.practice_guidance || [] : null,
          order_index: ssi,
        })
        .select("id")
        .single();

      if (subErr) throw new Error(`Failed to save subsection: ${subErr.message}`);

      if (!hasTopics) continue;

      const topicRows = sub.topics.map((topic, ti) => ({
        subsection_id: subRow.id,
        title: topic.title,
        content: true,
        objectives: topic.objectives || [],
        practice_guidance: topic.practice_guidance || [],
        order_index: ti,
      }));

      const { error: topicErr } = await supabase
        .from("outline_topics")
        .insert(topicRows);

      if (topicErr) throw new Error(`Failed to save topics: ${topicErr.message}`);
    }
  }

  return outlineId;
}

/**
 * Full outline generation pipeline:
 *   Supabase (files) → extract text → Anthropic → store result → Supabase
 */
export async function runOutlinePipeline(folderId) {
  const supabase = getSupabase();
  const anthropic = getAnthropic();

  // 1. Validate folder
  const { data: folder, error: folderErr } = await supabase
    .from("folders")
    .select("id, name, outline_generated")
    .eq("id", folderId)
    .single();

  if (folderErr || !folder) throw new Error("Folder not found");
  if (folder.outline_generated) throw new Error("Outline already generated for this folder");

  // 2. Fetch file metadata from Supabase
  const { data: files, error: filesErr } = await supabase
    .from("course_files")
    .select("id, filename, file_type, file_size_bytes, storage_path")
    .eq("folder_id", folderId);

  if (filesErr) throw new Error(`Failed to fetch files: ${filesErr.message}`);
  if (!files?.length) throw new Error("No files in folder");

  // 3. Download + extract text from Supabase Storage
  const extracted = await extractFolderText(supabase, files);
  if (!extracted.length) throw new Error("Could not extract text from any files");

  // 4. Send to Anthropic
  const outline = await generateOutline(anthropic, folder.name, extracted);

  // 5. Persist into normalized tables
  await persistOutline(supabase, folderId, outline);

  // 6. Mark folder as processed
  await supabase
    .from("folders")
    .update({ outline_generated: true })
    .eq("id", folderId);

  return outline;
}
