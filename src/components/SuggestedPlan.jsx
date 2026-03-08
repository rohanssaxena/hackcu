import { useState, useEffect } from "react";
import {
  MoreHorizontal,
  Flag,
  Clock,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { supabase, USER_ID } from "../lib/supabase";

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
    <div className="group/card -mx-2 cursor-pointer rounded-md px-2 py-3 transition-colors hover:bg-[#2e2e30]">
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

      <div className="mt-1.5 flex flex-col">
        <p className="font-sans text-[13px] font-medium leading-[18px] text-text-primary">
          {item.title}
        </p>
        <p className="font-sans text-[13px] leading-[18px] text-text-secondary">
          {item.description}
        </p>
      </div>

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
  const [planItems, setPlanItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Fetch upcoming exams to build plan items
      const { data: exams } = await supabase
        .from("exams")
        .select("id, title, exam_date, exam_type, notes, courses(title), scope_topic_ids")
        .eq("user_id", USER_ID)
        .gte("exam_date", new Date().toISOString())
        .order("exam_date", { ascending: true })
        .limit(4);

      // Fetch weak topics (low mastery) for recommendations
      const { data: weakTopics } = await supabase
        .from("mastery_beliefs")
        .select("p_know, topics(name, course_id, courses(title))")
        .eq("user_id", USER_ID)
        .lt("p_know", 0.6)
        .order("p_know", { ascending: true })
        .limit(4);

      const items = [];

      if (exams?.length) {
        const exam = exams[0];
        const dueStr = `Due ${new Date(exam.exam_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

        items.push({
          id: "EXAM-1",
          dueDate: dueStr,
          course: exam.courses?.title || "",
          title: `Prepare for ${exam.title}`,
          description: exam.notes || `Upcoming ${exam.exam_type} exam.`,
          sources: [],
        });
      }

      if (weakTopics) {
        weakTopics.forEach((wt, i) => {
          const topic = wt.topics;
          if (!topic) return;
          items.push({
            id: `TOPIC-${i + 1}`,
            dueDate: "This week",
            course: topic.courses?.title || "",
            title: `Review: ${topic.name}`,
            description: `Your mastery is at ${Math.round(wt.p_know * 100)}%. Focus on this topic to improve before upcoming assessments.`,
            sources: [],
          });
        });
      }

      setPlanItems(items);
      setLoading(false);
    }
    load();
  }, []);

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
        {loading ? (
          <div className="py-4 text-center font-sans text-[11px] text-text-faint">
            Loading…
          </div>
        ) : planItems.length === 0 ? (
          <div className="py-4 text-center font-sans text-[11px] text-text-faint">
            No suggestions right now
          </div>
        ) : (
          planItems.map((item) => <PlanItem key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
