import { supabase } from "./supabase";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";

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
 * Fetch the outline for a folder by querying groups, content_nodes,
 * and objectives, then reconstructing the recursive tree client-side.
 */
export async function getOutline(folderId) {
  const [groupsRes, nodesRes] = await Promise.all([
    supabase
      .from("groups")
      .select("id, parent, title, order, progress")
      .eq("folder_id", folderId)
      .order("order"),
    supabase
      .from("content_nodes")
      .select("id, parent, title, order, concept_tags, learning_guidance, practice_guidance")
      .eq("folder_id", folderId)
      .order("order"),
  ]);

  if (groupsRes.error) throw new Error(groupsRes.error.message);
  if (nodesRes.error) throw new Error(nodesRes.error.message);

  const groups = groupsRes.data || [];
  const contentNodes = nodesRes.data || [];

  if (!groups.length && !contentNodes.length) return null;

  const contentIds = contentNodes.map((n) => n.id);
  let objectives = [];
  if (contentIds.length) {
    const { data, error } = await supabase
      .from("objectives")
      .select("id, content_node, objective, weight")
      .in("content_node", contentIds);
    if (error) throw new Error(error.message);
    objectives = data || [];
  }

  const objMap = new Map();
  for (const obj of objectives) {
    if (!objMap.has(obj.content_node)) objMap.set(obj.content_node, []);
    objMap.get(obj.content_node).push({
      id: obj.id,
      objective: obj.objective,
      weight: obj.weight,
    });
  }

  const groupMap = new Map();
  for (const g of groups) {
    groupMap.set(g.id, { ...g, type: "group", children: [] });
  }

  const contentNodeItems = contentNodes.map((n) => ({
    ...n,
    type: "content",
    objectives: objMap.get(n.id) || [],
  }));

  for (const g of groups) {
    const node = groupMap.get(g.id);
    if (g.parent && groupMap.has(g.parent)) {
      groupMap.get(g.parent).children.push(node);
    }
  }

  for (const cn of contentNodeItems) {
    if (cn.parent && groupMap.has(cn.parent)) {
      groupMap.get(cn.parent).children.push(cn);
    }
  }

  // Sort children by order
  for (const g of groupMap.values()) {
    g.children.sort((a, b) => a.order - b.order);
  }

  const roots = [];
  for (const g of groups) {
    if (!g.parent) roots.push(groupMap.get(g.id));
  }
  for (const cn of contentNodeItems) {
    if (!cn.parent) roots.push(cn);
  }
  roots.sort((a, b) => a.order - b.order);

  return { title: null, nodes: roots };
}

/**
 * Get total estimated time (minutes) for a content node from its phases.
 */
export async function getEstimatedTimeForContentNode(contentNodeId) {
  const { data: phases, error } = await supabase
    .from("phases")
    .select("estimated_time_minutes")
    .eq("content_node", contentNodeId);

  if (error) return 0;
  return (phases || []).reduce((s, p) => s + (p.estimated_time_minutes || 0), 0);
}

/**
 * Fetch a single content node with all its phases, checkpoints, and options.
 */
export async function getContentNodeWithPhases(contentNodeId) {
  const { data: node, error: nodeErr } = await supabase
    .from("content_nodes")
    .select("id, title")
    .eq("id", contentNodeId)
    .single();

  if (nodeErr) throw new Error(nodeErr.message);

  const { data: phases, error: phaseErr } = await supabase
    .from("phases")
    .select("id, title, content, estimated_time_minutes, order")
    .eq("content_node", contentNodeId)
    .order("order");

  if (phaseErr) throw new Error(phaseErr.message);

  const phaseIds = phases.map((p) => p.id);
  let checkpoints = [];
  if (phaseIds.length) {
    const { data, error } = await supabase
      .from("checkpoints")
      .select("id, phase, question, difficulty")
      .in("phase", phaseIds);
    if (error) throw new Error(error.message);
    checkpoints = data || [];
  }

  const checkpointIds = checkpoints.map((c) => c.id);
  let options = [];
  if (checkpointIds.length) {
    const { data, error } = await supabase
      .from("options")
      .select("id, checkpoint, text, correct, explanation")
      .in("checkpoint", checkpointIds);
    if (error) throw new Error(error.message);
    options = data || [];
  }

  const optMap = new Map();
  for (const o of options) {
    if (!optMap.has(o.checkpoint)) optMap.set(o.checkpoint, []);
    optMap.get(o.checkpoint).push(o);
  }

  const cpMap = new Map();
  for (const c of checkpoints) {
    if (!cpMap.has(c.phase)) cpMap.set(c.phase, []);
    cpMap.get(c.phase).push({ ...c, options: optMap.get(c.id) || [] });
  }

  return {
    ...node,
    phases: phases.map((p) => ({
      ...p,
      checkpoints: cpMap.get(p.id) || [],
    })),
  };
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
 * @param {(event: object) => void} onEvent
 * @returns {Promise<void>}
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

/**
 * Request drill set generation from the server.
 * @param {object} opts
 * @param {string} opts.folderId - Folder UUID
 * @param {string} opts.userId - User UUID
 * @param {string[]} opts.objectiveIds - Ordered list of objective UUIDs
 * @param {string} [opts.title] - Set title (default "Drill")
 * @param {number} [opts.questionCount] - Desired number of questions (optional)
 * @returns {Promise<{ set_id: string, question_count: number }>}
 */
export async function requestDrillGeneration({
  folderId,
  userId,
  objectiveIds,
  title,
  questionCount,
  context,
}) {
  const res = await fetch(`${SERVER_URL}/api/agents/drill/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder_id: folderId,
      user_id: userId,
      objective_ids: objectiveIds,
      title: title || "Drill",
      question_count: questionCount,
      context: context ?? undefined,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.error || "Drill generation failed");
  }
  return { set_id: body.set_id, question_count: body.question_count };
}
