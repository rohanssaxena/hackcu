import { useState, useCallback } from "react";
import {
  X,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Folder,
  FolderOpen,
  Loader2,
  Target,
} from "lucide-react";
import { requestDrillGeneration } from "../lib/outlineService";

const STAGES = ["Select content", "Generating", "Done"];

/** Collect all content node IDs under a node. */
function collectContentNodeIds(node) {
  if (node.type === "content") return [node.id];
  const kids = node.children ?? node.nodes ?? [];
  return kids.flatMap((c) => collectContentNodeIds(c));
}

/** Collect all objective IDs under a node (from content nodes). */
function collectObjectiveIds(node) {
  if (node.type === "content" && node.objectives?.length) {
    return (node.objectives || []).filter((o) => o.id).map((o) => o.id);
  }
  const kids = node.children ?? node.nodes ?? [];
  return kids.flatMap((c) => collectObjectiveIds(c));
}

function DrillSelector({ outline, selectedContentIds, selectedObjectiveIds, onToggleContent, onToggleObjective }) {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node, depth = 0, numbering = "") => {
    const kids = node.children ?? node.nodes ?? [];
    const isGroup = node.type === "group";
    const contentIds = collectContentNodeIds(node);
    const objectiveIds = collectObjectiveIds(node);
    const allContentSelected =
      contentIds.length > 0 && contentIds.every((id) => selectedContentIds.includes(id));
    const allObjectivesSelected =
      objectiveIds.length > 0 && objectiveIds.every((id) => selectedObjectiveIds.includes(id));

    const handleGroupClick = () => {
      if (allContentSelected) contentIds.forEach((id) => onToggleContent(id, false));
      else contentIds.forEach((id) => onToggleContent(id, true));
      if (allObjectivesSelected) objectiveIds.forEach((id) => onToggleObjective(id, false));
      else objectiveIds.forEach((id) => onToggleObjective(id, true));
    };

    const handleContentClick = () => {
      onToggleContent(node.id, !selectedContentIds.includes(node.id));
    };

    return (
      <div key={node.id} className="flex flex-col">
        <div
          className={`group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-[5px] text-left transition-colors hover:bg-[#1a1a1e] ${
            depth === 0 ? "mt-0.5" : ""
          }`}
        >
          {isGroup && kids.length > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="shrink-0 text-text-faint hover:text-text-secondary"
            >
              {expanded[node.id] !== false ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </button>
          ) : (
            <span className="inline-block size-3.5 shrink-0" />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isGroup) handleGroupClick();
              else handleContentClick();
            }}
            className="flex flex-1 items-center gap-2 text-left"
          >
            <span
              className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                isGroup
                  ? allContentSelected && allObjectivesSelected
                    ? "border-accent-blue bg-accent-blue"
                    : "border-border-default bg-transparent"
                  : selectedContentIds.includes(node.id)
                    ? "border-accent-blue bg-accent-blue"
                    : "border-border-default bg-transparent"
              }`}
            >
              {(isGroup
                ? allContentSelected && allObjectivesSelected
                : selectedContentIds.includes(node.id)) && (
                <span className="size-1.5 rounded-full bg-white" />
              )}
            </span>
            {isGroup ? (
              expanded[node.id] !== false && kids.length > 0 ? (
                <FolderOpen className="size-3.5 shrink-0 text-amber-400/80" />
              ) : (
                <Folder className="size-3.5 shrink-0 text-amber-400/60" />
              )
            ) : (
              <BookOpen className="size-3.5 shrink-0 text-accent-blue/70" />
            )}
            {numbering && (
              <span className="font-mono text-[10px] text-text-faint">{numbering}</span>
            )}
            <span
              className={`truncate font-sans text-[12.5px] leading-[18px] ${
                isGroup
                  ? depth === 0
                    ? "font-semibold text-text-primary"
                    : "font-medium text-text-primary/90"
                  : "text-accent-blue/90"
              }`}
            >
              {node.title || (isGroup ? "Group" : "Content")}
            </span>
          </button>
        </div>
        {node.type === "content" && node.objectives?.length > 0 && (
          <div className="ml-6 border-l border-[#232323] pl-2">
            {(node.objectives || []).map((o) => {
              const selected = selectedObjectiveIds.includes(o.id);
              return (
                <div
                  key={o.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-[#1a1a1e]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleObjective(o.id, !selected);
                  }}
                >
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      selected ? "border-accent-blue bg-accent-blue" : "border-border-default bg-transparent"
                    }`}
                  >
                    {selected && <span className="size-1.5 rounded-full bg-white" />}
                  </span>
                  <Target className="size-3 shrink-0 text-text-faint" />
                  <span className="font-sans text-[11px] leading-[16px] text-text-secondary">
                    {typeof o === "object" ? o.objective : o}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {isGroup && expanded[node.id] !== false && kids.length > 0 && (
          <div
            className={`ml-[11px] border-l pl-[11px] ${
              depth === 0 ? "border-amber-400/15" : "border-[#222]"
            }`}
          >
            {kids.map((c, i) =>
              renderNode(c, depth + 1, numbering ? `${numbering}.${i + 1}` : String(i + 1)),
            )}
          </div>
        )}
      </div>
    );
  };

  const roots = outline?.nodes || [];
  return (
    <div className="max-h-[280px] overflow-y-auto rounded border border-[#1e1e1e] bg-[#111] p-2">
      {roots.length === 0 ? (
        <p className="py-4 text-center font-sans text-[12px] text-text-faint">
          No outline. Generate outline first.
        </p>
      ) : (
        roots.map((n, i) => renderNode(n, 0, String(i + 1)))
      )}
    </div>
  );
}

export default function DrillGenerationModal({
  folderId,
  userId,
  outline,
  onClose,
  onComplete,
  onStartDrill,
}) {
  const [stage, setStage] = useState(0);
  const [selectedContentIds, setSelectedContentIds] = useState([]);
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleToggleContent = useCallback((id, selected) => {
    setSelectedContentIds((prev) =>
      selected ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id),
    );
  }, []);

  const handleToggleObjective = useCallback((id, selected) => {
    setSelectedObjectiveIds((prev) =>
      selected ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id),
    );
  }, []);

  const collectObjectiveIdsFromSelection = useCallback(() => {
    if (selectedObjectiveIds.length > 0) return selectedObjectiveIds;
    const fromContent = (nodes, contentIds) => {
      if (!nodes || !Array.isArray(nodes)) return [];
      let ids = [];
      for (const node of nodes) {
        if (node.type === "content" && contentIds.includes(node.id) && node.objectives?.length) {
          for (const o of node.objectives) if (o.id) ids.push(o.id);
        }
        const children = node.children ?? node.nodes ?? [];
        if (children.length) ids.push(...fromContent(children, contentIds));
      }
      return ids;
    };
    return fromContent(outline?.nodes || [], selectedContentIds);
  }, [outline?.nodes, selectedContentIds, selectedObjectiveIds]);

  const buildContext = useCallback(() => {
    const out = [];
    const walk = (nodes) => {
      for (const node of nodes || []) {
        if (node.type === "content") {
          const contentSelected = selectedContentIds.includes(node.id);
          const objIds = (node.objectives || []).filter((o) => o.id).map((o) => o.id);
          const anyObjSelected = objIds.some((id) => selectedObjectiveIds.includes(id));
          if (contentSelected || anyObjSelected) {
            out.push({
              title: node.title,
              objectives: (node.objectives || []).map((o) => (typeof o === "object" ? o.objective : o)),
              practice_guidance: node.practice_guidance || "",
            });
          }
        }
        const children = node.children ?? node.nodes ?? [];
        if (children.length) walk(children);
      }
    };
    walk(outline?.nodes);
    return out.length ? out : undefined;
  }, [outline?.nodes, selectedContentIds, selectedObjectiveIds]);

  const handleGenerate = async () => {
    if (!userId) {
      setError("You must be signed in to generate a drill.");
      return;
    }
    const objectiveIds = collectObjectiveIdsFromSelection();
    if (!objectiveIds.length) {
      setError("Select at least one objective or content node with objectives.");
      return;
    }
    setError(null);
    setStage(1);
    setGenerating(true);
    try {
      const data = await requestDrillGeneration({
        folderId,
        userId,
        objectiveIds,
        title: "Drill",
        context: buildContext(),
      });
      setResult(data);
      setStage(2);
    } catch (e) {
      setError(e.message || "Drill generation failed");
      setStage(0);
    } finally {
      setGenerating(false);
    }
  };

  const handleStart = () => {
    if (result?.set_id) {
      onStartDrill?.(result.set_id);
    }
    onComplete?.();
    onClose();
  };

  const handleDoLater = () => {
    onComplete?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={stage === 0 ? onClose : undefined}
    >
      <div
        className="flex max-h-[90vh] w-[520px] flex-col overflow-hidden rounded-xl border border-border-default bg-bg-primary shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
          <h2 className="font-sans text-[17px] font-semibold text-text-primary">
            Generate drill
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-text-faint transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
          {stage === 0 && (
            <>
              <p className="mb-3 font-sans text-[12px] text-text-secondary">
                Select content nodes and objectives to include. Linear view with objectives.
              </p>
              <DrillSelector
                outline={outline}
                selectedContentIds={selectedContentIds}
                selectedObjectiveIds={selectedObjectiveIds}
                onToggleContent={handleToggleContent}
                onToggleObjective={handleToggleObjective}
              />
              {error && (
                <p className="mt-3 font-sans text-[12px] text-red-400">{error}</p>
              )}
            </>
          )}
          {stage === 1 && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <Loader2 className="size-10 animate-spin text-accent-blue" />
              <p className="font-sans text-[14px] font-medium text-text-primary">
                Generating drill questions…
              </p>
            </div>
          )}
          {stage === 2 && result && (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <p className="font-sans text-[14px] text-text-primary">
                <span className="font-semibold">{result.question_count}</span> question
                {result.question_count !== 1 ? "s" : ""} generated.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-default px-5 py-4">
          {stage === 0 && (
            <>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-lg px-3 py-1.5 font-sans text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="cursor-pointer rounded-lg bg-white px-4 py-1.5 font-sans text-[12px] font-medium text-black transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                Generate
              </button>
            </>
          )}
          {stage === 2 && result && (
            <>
              <button
                onClick={handleDoLater}
                className="cursor-pointer rounded-lg px-3 py-1.5 font-sans text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
              >
                Do later
              </button>
              <button
                onClick={handleStart}
                className="cursor-pointer rounded-lg bg-white px-4 py-1.5 font-sans text-[12px] font-medium text-black transition-colors hover:bg-gray-200"
              >
                Start
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
