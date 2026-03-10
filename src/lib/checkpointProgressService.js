import { supabase } from "./supabase";

const STORAGE_KEY = "checkpoint_progress";

function getStoredIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function setStoredIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

/**
 * Record that the user completed a checkpoint (answered the question).
 */
export function recordCheckpointComplete(checkpointId) {
  const ids = getStoredIds();
  ids.add(checkpointId);
  setStoredIds(ids);
}

/**
 * Get completed checkpoint IDs for the current user.
 */
export function getCompletedCheckpointIds() {
  return getStoredIds();
}

/**
 * Get progress map for all content nodes in a folder.
 * Returns { contentNodeId: { total, completed, percent } }
 */
export async function getProgressForFolder(folderId) {
  const { data: nodes } = await supabase
    .from("content_nodes")
    .select("id")
    .eq("folder_id", folderId);

  if (!nodes?.length) return {};

  const nodeIds = nodes.map((n) => n.id);

  const { data: phases } = await supabase
    .from("phases")
    .select("id, content_node")
    .in("content_node", nodeIds);

  if (!phases?.length) {
    return Object.fromEntries(nodeIds.map((id) => [id, { total: 0, completed: 0, percent: 0 }]));
  }

  const phaseIds = phases.map((p) => p.id);
  const phaseToNode = new Map(phases.map((p) => [p.id, p.content_node]));

  const { data: checkpoints } = await supabase
    .from("checkpoints")
    .select("id, phase")
    .in("phase", phaseIds);

  const completed = getCompletedCheckpointIds();
  const nodeTotals = new Map();
  const nodeCompleted = new Map();

  for (const cp of checkpoints || []) {
    const nodeId = phaseToNode.get(cp.phase);
    if (!nodeId) continue;
    nodeTotals.set(nodeId, (nodeTotals.get(nodeId) || 0) + 1);
    if (completed.has(cp.id)) {
      nodeCompleted.set(nodeId, (nodeCompleted.get(nodeId) || 0) + 1);
    }
  }

  const result = {};
  for (const id of nodeIds) {
    const total = nodeTotals.get(id) || 0;
    const completedCount = nodeCompleted.get(id) || 0;
    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    result[id] = { total, completed: completedCount, percent };
  }
  return result;
}
