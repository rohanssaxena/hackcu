import { useState } from "react";
import { ChevronRight, ChevronDown, Code, List } from "lucide-react";

function TreeNode({ title, numbering, objectives, practiceGuidance, isTerminal, children, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = children && children.length > 0;
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full cursor-pointer items-start gap-1.5 rounded px-1.5 py-1 text-left transition-colors hover:bg-[#1e1e1e]"
      >
        {hasChildren ? (
          <Chevron className="mt-0.5 size-3 shrink-0 text-text-faint transition-transform" />
        ) : (
          <span className="mt-0.5 inline-block size-3 shrink-0" />
        )}
        <div className="flex flex-1 items-baseline gap-2">
          <span className="font-mono text-[10px] text-text-faint">{numbering}</span>
          <span
            className={`font-sans text-[12px] ${
              depth === 0
                ? "font-semibold text-text-primary"
                : depth === 1
                  ? "font-medium text-text-primary"
                  : "text-text-secondary"
            }`}
          >
            {title}
          </span>
          {isTerminal && objectives?.length > 0 && (
            <span className="ml-auto shrink-0 rounded bg-[#232323] px-1.5 py-0.5 font-mono text-[9px] text-text-faint">
              {objectives.length} objective{objectives.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="ml-[18px] border-l border-[#232323] pl-1">
          {isTerminal && (objectives?.length > 0 || practiceGuidance?.length > 0) && (
            <div className="flex flex-col gap-1.5 py-1.5 pl-2">
              {objectives?.length > 0 && (
                <ul className="flex flex-col gap-0.5">
                  {objectives.map((o, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-[5px] size-1 shrink-0 rounded-full bg-accent-blue" />
                      <span className="font-sans text-[11px] leading-[16px] text-text-secondary">{o}</span>
                    </li>
                  ))}
                </ul>
              )}
              {practiceGuidance?.length > 0 && (
                <div>
                  <span className="font-sans text-[9px] font-medium uppercase tracking-wider text-text-faint">
                    Practice
                  </span>
                  <ul className="mt-0.5 flex flex-col gap-0.5">
                    {practiceGuidance.map((p, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-[5px] size-1 shrink-0 rounded-full bg-[#444]" />
                        <span className="font-sans text-[11px] leading-[16px] text-text-faint">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {hasChildren && children}
        </div>
      )}
    </div>
  );
}

function FormattedView({ outline }) {
  return (
    <div className="flex flex-col gap-0.5">
      {outline.sections?.map((section, i) => (
        <TreeNode
          key={i}
          title={section.title}
          numbering={`${i + 1}`}
          objectives={section.objectives}
          practiceGuidance={section.practice_guidance}
          isTerminal={!!section.content}
          depth={0}
        >
          {section.subsections?.map((sub, j) => (
            <TreeNode
              key={j}
              title={sub.title}
              numbering={`${i + 1}.${j + 1}`}
              objectives={sub.objectives}
              practiceGuidance={sub.practice_guidance}
              isTerminal={!!sub.content}
              depth={1}
            >
              {sub.topics?.map((topic, k) => (
                <TreeNode
                  key={k}
                  title={topic.title}
                  numbering={`${i + 1}.${j + 1}.${k + 1}`}
                  objectives={topic.objectives}
                  practiceGuidance={topic.practice_guidance}
                  isTerminal={!!topic.content}
                  depth={2}
                />
              ))}
            </TreeNode>
          ))}
        </TreeNode>
      ))}
    </div>
  );
}

function JsonView({ outline }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border-default bg-[#111] p-4 font-mono text-[11px] leading-[18px] text-text-secondary">
      {JSON.stringify(outline, null, 2)}
    </pre>
  );
}

export default function OutlineView({ outline }) {
  const [viewMode, setViewMode] = useState("formatted");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-[14px] font-semibold text-text-primary">
          {outline.title}
        </h2>
        <div className="flex overflow-hidden rounded border border-border-default">
          <button
            onClick={() => setViewMode("formatted")}
            className={`flex cursor-pointer items-center gap-1 px-2.5 py-1 font-sans text-[11px] transition-colors ${
              viewMode === "formatted"
                ? "bg-[#232323] text-text-primary"
                : "text-text-faint hover:text-text-secondary"
            }`}
          >
            <List className="size-3" />
            Tree
          </button>
          <button
            onClick={() => setViewMode("json")}
            className={`flex cursor-pointer items-center gap-1 border-l border-border-default px-2.5 py-1 font-sans text-[11px] transition-colors ${
              viewMode === "json"
                ? "bg-[#232323] text-text-primary"
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
