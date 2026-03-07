import {
  MoreHorizontal,
  Flag,
  Clock,
  ArrowUpRight,
  FileText,
} from "lucide-react";

const PLAN_ITEMS = [
  {
    id: "ITEM-1",
    dueDate: "Due Mar 15",
    course: "CSCI 2270",
    title:
      "Make sure you understand CSCI concepts and do a detailed drill down",
    description:
      "Your midterm exam covers tree data structures extensively. This topic appeared in 3 recent practice problems you struggled with.",
    sources: ["BST Notes - Ch. 4"],
  },
  {
    id: "ITEM-2",
    dueDate: "Due Mar 15",
    course: "CSCI 2270",
    title:
      "Make sure you understand CSCI concepts and do a detailed drill down",
    description:
      "Your midterm exam covers tree data structures extensively. This topic appeared in 3 recent practice problems you struggled with.",
    sources: [],
  },
  {
    id: "ITEM-3",
    dueDate: "Due Mar 15",
    course: "CSCI 2270",
    title:
      "Make sure you understand CSCI concepts and do a detailed drill down",
    description:
      "Your midterm exam covers tree data structures extensively. This topic appeared in 3 recent practice problems you struggled with.",
    sources: ["BST Notes - Ch. 4", "BST Notes - Ch. 4"],
  },
  {
    id: "ITEM-4",
    dueDate: "Due Mar 15",
    course: "CSCI 2270",
    title:
      "Make sure you understand CSCI concepts and do a detailed drill down",
    description:
      "Your midterm exam covers tree data structures extensively. This topic appeared in 3 recent practice problems you struggled with.",
    sources: ["BST Notes - Ch. 4"],
  },
];

function SourceChip({ label }) {
  return (
    <div className="flex items-center gap-1.5 rounded bg-bg-chip px-2 py-0.5">
      <FileText className="size-3 text-text-primary" />
      <span className="whitespace-nowrap font-sans text-[11px] leading-[16.5px] text-text-primary">
        {label}
      </span>
    </div>
  );
}

function PlanItem({ item }) {
  return (
    <div className="group/card cursor-pointer rounded-md px-2 py-3 -mx-2 transition-colors hover:bg-[#2e2e30]">
      {/* Meta row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-1.5">
          <span className="font-mono text-[10px] leading-[15px] text-text-secondary">
            {item.id}
          </span>
          <span className="text-[10px] text-text-separator">&bull;</span>
          <Flag className="size-3 text-text-secondary" />
          <span className="text-[10px] text-text-separator">&bull;</span>
          <div className="flex items-center gap-1">
            <Clock className="size-3 text-text-secondary" />
            <span className="font-mono text-[10px] leading-[15px] text-text-secondary">
              {item.dueDate}
            </span>
          </div>
          <span className="text-[10px] text-text-separator">&bull;</span>
          <span className="font-mono text-[10px] leading-[15px] text-text-secondary">
            {item.course}
          </span>
        </div>
        <div className="flex items-center justify-center rounded p-0.5">
          <ArrowUpRight className="size-4 text-text-secondary transition-colors group-hover/card:text-text-primary" />
        </div>
      </div>

      {/* Title + description */}
      <div className="mt-1.5 flex flex-col">
        <p className="font-sans text-[13px] font-medium leading-[18px] text-text-primary">
          {item.title}
        </p>
        <p className="font-sans text-[13px] leading-[18px] text-text-secondary">
          {item.description}
        </p>
      </div>

      {/* Sources */}
      {item.sources.length > 0 && (
        <div className="mt-1.5 flex items-center gap-2">
          {item.sources.map((src, i) => (
            <SourceChip key={i} label={src} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SuggestedPlan() {
  return (
    <div className="flex w-[332px] shrink-0 flex-col gap-4 rounded border border-[#393939] px-4 py-2">
      <div className="flex h-9 items-center justify-between border-b border-border-default pb-px">
        <span className="font-sans text-[11px] font-medium leading-[16.5px] text-text-muted">
          Suggested Plan
        </span>
        <button className="cursor-pointer transition-colors hover:text-text-primary">
          <MoreHorizontal className="size-3.5 text-text-secondary" />
        </button>
      </div>

      <div className="flex flex-col">
        {PLAN_ITEMS.map((item) => (
          <PlanItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
