import { getSupabase } from "../utils/supabase.js";
import { runOutlinePipeline } from "../services/outline-generation.js";
import { runContentPipeline } from "../services/learning-content-generation.js";

const USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const BUCKET = "workspace-files";

const handlers = {
  async list_folders({ parent_id }) {
    const supabase = getSupabase();
    let query = supabase
      .from("folders")
      .select("id, name, parent_id, created_at")
      .eq("user_id", USER_ID)
      .order("name");

    if (parent_id) {
      query = query.eq("parent_id", parent_id);
    } else {
      query = query.is("parent_id", null);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { folders: data };
  },

  async create_folder({ name, parent_id }) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("folders")
      .insert({
        user_id: USER_ID,
        name,
        parent_id: parent_id || null,
        last_accessed_at: new Date().toISOString(),
      })
      .select("id, name, parent_id")
      .single();

    if (error) throw new Error(error.message);
    return { folder: data };
  },

  async rename_folder({ folder_id, new_name }) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("folders")
      .update({ name: new_name, updated_at: new Date().toISOString() })
      .eq("id", folder_id)
      .eq("user_id", USER_ID)
      .select("id, name")
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Folder not found");
    return { folder: data };
  },

  async delete_folder({ folder_id }) {
    const supabase = getSupabase();

    const { data: folder } = await supabase
      .from("folders")
      .select("id, name")
      .eq("id", folder_id)
      .eq("user_id", USER_ID)
      .single();

    if (!folder) throw new Error("Folder not found");

    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", folder_id)
      .eq("user_id", USER_ID);

    if (error) throw new Error(error.message);
    return { deleted: folder.name };
  },

  async list_files({ folder_id }) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("course_files")
      .select("id, filename, file_type, file_size_bytes, uploaded_at")
      .eq("folder_id", folder_id)
      .order("filename");

    if (error) throw new Error(error.message);
    const files = (data || []).map((f) => ({
      id: f.id,
      filename: f.filename,
      file_type: f.file_type || "other",
      size_bytes: f.file_size_bytes,
    }));
    return { files };
  },

  async rename_file({ file_id, new_filename }) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("course_files")
      .update({ filename: new_filename })
      .eq("id", file_id)
      .select("id, filename")
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("File not found");
    return { file: data };
  },

  async delete_file({ file_id }) {
    const supabase = getSupabase();
    const { data: file, error: fetchErr } = await supabase
      .from("course_files")
      .select("id, filename, storage_path")
      .eq("id", file_id)
      .single();

    if (fetchErr || !file) throw new Error("File not found");

    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .remove([file.storage_path]);

    if (storageErr) throw new Error(`Storage: ${storageErr.message}`);

    const { error: deleteErr } = await supabase
      .from("course_files")
      .delete()
      .eq("id", file_id);

    if (deleteErr) throw new Error(deleteErr.message);
    return { deleted: file.filename };
  },

  async get_folder_status({ folder_id }) {
    const supabase = getSupabase();
    const { data: folder, error: folderErr } = await supabase
      .from("folders")
      .select("id, name, outline_generated, lc_generated")
      .eq("id", folder_id)
      .eq("user_id", USER_ID)
      .single();

    if (folderErr || !folder) throw new Error("Folder not found");

    const { count, error: countErr } = await supabase
      .from("course_files")
      .select("id", { count: "exact", head: true })
      .eq("folder_id", folder_id);

    if (countErr) throw new Error(countErr.message);

    return {
      folder_id: folder.id,
      name: folder.name,
      outline_generated: !!folder.outline_generated,
      lc_generated: !!folder.lc_generated,
      file_count: count ?? 0,
    };
  },

  async generate_outline({ folder_id }) {
    const outline = await runOutlinePipeline(folder_id);
    const nodeCount =
      outline && Array.isArray(outline.nodes) ? outline.nodes.length : 0;
    return { success: true, top_level_nodes: nodeCount };
  },

  async generate_learning_content({ folder_id }) {
    let total = 0;
    let generated = 0;
    let skipped = 0;

    await runContentPipeline(folder_id, (event) => {
      if (event.type === "start") total = event.total || 0;
      if (event.type === "status" && event.step === "store") generated++;
      if (event.type === "status" && event.step === "skip") skipped++;
    });

    return { success: true, total, generated, skipped };
  },

  async list_content_nodes({ folder_id }) {
    const supabase = getSupabase();
    const { data: nodes, error } = await supabase
      .from("content_nodes")
      .select("id, title, order")
      .eq("folder_id", folder_id)
      .order("order");

    if (error) throw new Error(error.message);

    const nodeIds = (nodes || []).map((n) => n.id);
    let phaseCounts = {};
    if (nodeIds.length > 0) {
      const { data: phases } = await supabase
        .from("phases")
        .select("content_node")
        .in("content_node", nodeIds);
      for (const p of phases || []) {
        phaseCounts[p.content_node] = (phaseCounts[p.content_node] || 0) + 1;
      }
    }

    const items = (nodes || []).map((n) => ({
      id: n.id,
      title: n.title,
      phase_count: phaseCounts[n.id] || 0,
    }));
    return { content_nodes: items };
  },

  async navigate_to_content_node({ content_node_id }) {
    const supabase = getSupabase();
    const { data: node, error: nodeErr } = await supabase
      .from("content_nodes")
      .select("id, title, folder_id")
      .eq("id", content_node_id)
      .single();

    if (nodeErr || !node) throw new Error("Content node not found");

    const courseTitle = await resolveCourseTitleForFolder(supabase, node.folder_id);
    if (!courseTitle) throw new Error("Could not find course for this content node");

    const path = `/course/${encodeURIComponent(courseTitle)}/learn/${content_node_id}`;
    return {
      success: true,
      message: `Opening: ${node.title}`,
      navigate: { path, label: node.title },
    };
  },

  async navigate_to_phase({ content_node_id, phase_index }) {
    const supabase = getSupabase();
    const { data: node, error: nodeErr } = await supabase
      .from("content_nodes")
      .select("id, title, folder_id")
      .eq("id", content_node_id)
      .single();

    if (nodeErr || !node) throw new Error("Content node not found");

    const courseTitle = await resolveCourseTitleForFolder(supabase, node.folder_id);
    if (!courseTitle) throw new Error("Could not find course for this content node");

    const idx = Math.max(1, Math.floor(phase_index));
    const path = `/course/${encodeURIComponent(courseTitle)}/learn/${content_node_id}`;
    const hash = `#phase-${idx}`;
    return {
      success: true,
      message: `Opening phase ${idx}: ${node.title}`,
      navigate: { path, hash, label: `${node.title} (Phase ${idx})` },
    };
  },
};

async function resolveCourseTitleForFolder(supabase, folderId) {
  let currentId = folderId;
  while (currentId) {
    const { data: course } = await supabase
      .from("courses")
      .select("title")
      .eq("folder_id", currentId)
      .limit(1)
      .maybeSingle();
    if (course?.title) return course.title;

    const { data: folder } = await supabase
      .from("folders")
      .select("parent_id")
      .eq("id", currentId)
      .maybeSingle();
    currentId = folder?.parent_id || null;
  }
  return null;
}

export async function executeTool(name, input) {
  const handler = handlers[name];
  if (!handler) return { error: `Unknown tool: ${name}` };
  try {
    return await handler(input);
  } catch (err) {
    return { error: err.message };
  }
}
