import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  ChevronDown,
  Code,
  List,
  FolderOpen,
  Folder,
  BookOpen,
  Target,
  Lightbulb,
  Dumbbell,
  Tag,
  Play,
} from "lucide-react";

function countContentNodes(node) {
  if (node.type === "content") return 1;
  const kids = node.nodes || node.children || [];
  return kids.reduce((sum, child) => sum + countContentNodes(child), 0);
}

function WeightPips({ weight, max = 10 }) {
  const filled = Math.min(weight, max);
  return (
    <div className="flex items-center gap-[2px]" title={`Weight: ${weight}/${max}`}>
      {Array.from({ length: 5 }, (_, i) => {
        const threshold = (i + 1) * 2;
        return (
          <div
            key={i}
            className={`size-[5px] rounded-full ${
              filled >= threshold
                ? "bg-accent-blue"
                : filled >= threshold - 1
                  ? "bg-accent-blue/50"
                  : "bg-[#2a2a2a]"
            }`}
          />
        );
      })}
    </div>
  );
}

function ContentNodeDetail({ node }) {
  const [showGuidance, setShowGuidance] = useState(false);
  const navigate = useNavigate();
  const { courseName } = useParams();
  const hasGuidance = node.learning_guidance || node.practice_guidance;
  const tags = node.concept_tags || [];

  return (
    <div className="flex flex-col gap-2 py-2 pl-2 pr-1">
      {/* Objectives */}
      {node.objectives?.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Target className="size-3 text-accent-blue/70" />
            <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Objectives
            </span>
          </div>
          <ul className="flex flex-col gap-[3px] pl-[18px]">
            {node.objectives.map((o, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="flex-1 font-sans text-[11px] leading-[15px] text-text-secondary">
                  {o.objective || o}
                </span>
                {o.weight != null && <WeightPips weight={o.weight} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Concept tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pl-[18px]">
          <Tag className="size-2.5 text-text-faint" />
          {tags.map((tag, i) => (
            <span
              key={i}
              className="rounded-full bg-[#1e1e2e] px-2 py-[1px] font-sans text-[9px] text-purple-400/80"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Guidance toggle */}
      {hasGuidance && (
        <div className="pl-[18px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowGuidance((v) => !v);
            }}
            className="flex cursor-pointer items-center gap-1 font-sans text-[10px] text-text-faint transition-colors hover:text-text-secondary"
          >
            <ChevronRight
              className={`size-2.5 transition-transform ${showGuidance ? "rotate-90" : ""}`}
            />
            Guidance
          </button>
          {showGuidance && (
            <div className="mt-1.5 flex flex-col gap-2 rounded-md border border-[#1e1e1e] bg-[#111] px-3 py-2">
              {node.learning_guidance && (
                <div className="flex gap-2">
                  <Lightbulb className="mt-[1px] size-3 shrink-0 text-yellow-500/60" />
                  <p className="font-sans text-[11px] leading-[15px] text-text-faint">
                    {node.learning_guidance}
                  </p>
                </div>
              )}
              {node.practice_guidance && (
                <div className="flex gap-2">
                  <Dumbbell className="mt-[1px] size-3 shrink-0 text-green-500/60" />
                  <p className="font-sans text-[11px] leading-[15px] text-text-faint">
                    {node.practice_guidance}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Learn button */}
      {node.id && courseName && (
        <div className="pl-[18px] pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/course/${courseName}/learn/${node.id}`);
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-md bg-accent-blue/10 px-3 py-1.5 font-sans text-[11px] font-medium text-accent-blue transition-colors hover:bg-accent-blue/20"
          >
            <Play className="size-3" />
            Learn
          </button>
        </div>
      )}
    </div>
  );
}

function TreeNode({ node, numbering, depth = 0, isLast = false }) {
  const isGroup = node.type === "group";
  const kids = node.nodes || node.children || [];
  const hasChildren = isGroup && kids.length > 0;
  const [open, setOpen] = useState(depth < 2);
  const contentCount = useMemo(() => (isGroup ? countContentNodes(node) : 0), [node, isGroup]);

  return (
    <div className="relative">
      {/* Row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-[5px] text-left transition-colors hover:bg-[#1a1a1e] ${
          depth === 0 ? "mt-0.5" : ""
        }`}
      >
        {/* Chevron */}
        {hasChildren || node.type === "content" ? (
          (open ? ChevronDown : ChevronRight) &&
          (open ? (
            <ChevronDown className="size-3.5 shrink-0 text-text-faint" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-text-faint" />
          ))
        ) : (
          <span className="inline-block size-3.5 shrink-0" />
        )}

        {/* Icon */}
        {isGroup ? (
          open ? (
            <FolderOpen className="size-3.5 shrink-0 text-amber-400/80" />
          ) : (
            <Folder className="size-3.5 shrink-0 text-amber-400/60" />
          )
        ) : (
          <BookOpen className="size-3.5 shrink-0 text-accent-blue/70" />
        )}

        {/* Numbering + title */}
        <div className="flex flex-1 items-baseline gap-2 overflow-hidden">
          <span className="shrink-0 font-mono text-[10px] text-text-faint/60">
            {numbering}
          </span>
          <span
            className={`truncate font-sans text-[12.5px] leading-[18px] ${
              isGroup
                ? depth === 0
                  ? "font-semibold text-text-primary"
                  : "font-medium text-text-primary/90"
                : "text-accent-blue/90"
            }`}
          >
            {node.title}
          </span>
        </div>

        {/* Badges */}
        <div className="flex shrink-0 items-center gap-1.5">
          {isGroup && contentCount > 0 && (
            <span className="rounded bg-[#1e1e1e] px-1.5 py-[1px] font-mono text-[9px] text-text-faint/70">
              {contentCount} topic{contentCount !== 1 ? "s" : ""}
            </span>
          )}
          {node.type === "content" && node.objectives?.length > 0 && (
            <span className="rounded bg-accent-blue/10 px-1.5 py-[1px] font-mono text-[9px] text-accent-blue/70">
              {node.objectives.length} obj
            </span>
          )}
        </div>
      </button>

      {/* Children / Content detail */}
      {open && (
        <div
          className={`ml-[11px] border-l pl-[11px] ${
            depth === 0 ? "border-amber-400/15" : "border-[#222]"
          }`}
        >
          {node.type === "content" && <ContentNodeDetail node={node} />}
          {hasChildren &&
            kids.map((child, i) => (
              <TreeNode
                key={child.id || i}
                node={child}
                numbering={`${numbering}.${i + 1}`}
                depth={depth + 1}
                isLast={i === kids.length - 1}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function FormattedView({ outline }) {
  const roots = outline.nodes || [];

  const totalGroups = useMemo(() => {
    function count(nodes) {
      return nodes.reduce(
        (s, n) => s + (n.type === "group" ? 1 + count(n.nodes || n.children || []) : 0),
        0,
      );
    }
    return count(roots);
  }, [roots]);

  const totalContent = useMemo(() => {
    return roots.reduce((s, n) => s + countContentNodes(n), 0);
  }, [roots]);

  return (
    <div className="flex flex-col gap-3">
      {/* Stats bar */}
      <div className="flex items-center gap-4 rounded-md border border-[#1e1e1e] bg-[#111] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Folder className="size-3 text-amber-400/60" />
          <span className="font-sans text-[11px] text-text-secondary">
            <span className="font-medium text-text-primary">{totalGroups}</span> group{totalGroups !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="h-3 w-px bg-[#222]" />
        <div className="flex items-center gap-1.5">
          <BookOpen className="size-3 text-accent-blue/60" />
          <span className="font-sans text-[11px] text-text-secondary">
            <span className="font-medium text-text-primary">{totalContent}</span> content topic{totalContent !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Tree */}
      <div className="flex flex-col">
        {roots.map((node, i) => (
          <TreeNode key={node.id || i} node={node} numbering={`${i + 1}`} depth={0} />
        ))}
      </div>
    </div>
  );
}

function JsonView({ outline }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-[#1e1e1e] bg-[#0d0d0d] p-4 font-mono text-[11px] leading-[18px] text-text-secondary">
      {JSON.stringify(outline, null, 2)}
    </pre>
  );
}

export default function OutlineView({ outline }) {
  const [viewMode, setViewMode] = useState("formatted");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        {outline.title && (
          <h2 className="font-sans text-[14px] font-semibold text-text-primary">
            {outline.title}
          </h2>
        )}
        <div className="ml-auto flex overflow-hidden rounded-md border border-[#1e1e1e]">
          <button
            onClick={() => setViewMode("formatted")}
            className={`flex cursor-pointer items-center gap-1 px-2.5 py-1 font-sans text-[11px] transition-colors ${
              viewMode === "formatted"
                ? "bg-[#1e1e1e] text-text-primary"
                : "text-text-faint hover:text-text-secondary"
            }`}
          >
            <List className="size-3" />
            Tree
          </button>
          <button
            onClick={() => setViewMode("json")}
            className={`flex cursor-pointer items-center gap-1 border-l border-[#1e1e1e] px-2.5 py-1 font-sans text-[11px] transition-colors ${
              viewMode === "json"
                ? "bg-[#1e1e1e] text-text-primary"
                : "text-text-faint hover:text-text-secondary"
            }`}
          >
            <Code className="size-3" />
            JSON
          </button>
        </div>
      </div>

      {viewMode === "formatted" ? (
        <FormattedView outline={outline} />
      ) : (
        <JsonView outline={outline} />
      )}
    </div>
  );
}
