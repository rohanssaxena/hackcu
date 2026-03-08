import { supabase } from "./supabase";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

/**
 * Fetch files that will be indexed for a given folder.
 */
export async function getFilesForFolder(folderId) {
  const { data, error } = await supabase
    .from("course_files")
    .select("id, filename, file_type, file_size_bytes, uploaded_at")
    .eq("folder_id", folderId)
    .order("filename");

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Fetch the outline for a folder by querying normalized tables
 * and reconstructing the tree structure.
 */
export async function getOutline(folderId) {
  const { data: outline, error: outlineErr } = await supabase
    .from("outlines")
    .select("id, title")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (outlineErr) throw new Error(outlineErr.message);
  if (!outline) return null;

  const { data: sections } = await supabase
    .from("outline_sections")
    .select("id, title, content, objectives, practice_guidance, order_index")
    .eq("outline_id", outline.id)
    .order("order_index");

  for (const section of sections || []) {
    if (section.content) continue;

    const { data: subsections } = await supabase
      .from("outline_subsections")
      .select("id, title, content, objectives, practice_guidance, order_index")
      .eq("section_id", section.id)
      .order("order_index");

    section.subsections = subsections || [];

    for (const sub of section.subsections) {
      if (sub.content) continue;

      const { data: topics } = await supabase
        .from("outline_topics")
        .select("id, title, content, objectives, practice_guidance, order_index")
        .eq("subsection_id", sub.id)
        .order("order_index");

      sub.topics = topics || [];
    }
  }

  return { ...outline, sections: sections || [] };
}

/**
 * Call the server-side outline generation pipeline.
 */
export async function requestOutlineGeneration(folderId) {
  const res = await fetch(`${SERVER_URL}/api/agents/outline/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder_id: folderId }),
  });

  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.error || "Outline generation failed");
  }
  return body.outline;
}

/**
 * Stream content generation progress via SSE.
 * @param {string} folderId
 * @param {(event: object) => void} onEvent - callback for each SSE event
 * @returns {Promise<void>} resolves when stream ends
 */
export async function requestContentGeneration(folderId, onEvent) {
  const res = await fetch(`${SERVER_URL}/api/agents/content/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder_id: folderId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Content generation failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event = JSON.parse(line.slice(6));
          onEvent(event);
          if (event.type === "error") {
            throw new Error(event.error);
          }
        } catch (e) {
          if (e.message && e.message !== "Unexpected end of JSON input") throw e;
        }
      }
    }
  }
}
