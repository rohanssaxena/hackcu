import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Zap } from "lucide-react";
import { supabase, USER_ID } from "../lib/supabase";
import { DrillWithObjectiveProgress } from "../components/DrillWithObjectiveProgress";

export default function Drill() {
  const { folderId, setId } = useParams();
  const navigate = useNavigate();
  const [progress, setProgress] = useState({ answered: 0, total: 0 });
  const [title, setTitle] = useState("Drill");
  const userId = USER_ID;

  useEffect(() => {
    if (!setId) return;
    supabase
      .from("study_sets")
      .select("title")
      .eq("id", setId)
      .single()
      .then(({ data }) => {
        if (data?.title) setTitle(data.title);
      });
  }, [setId]);

  const handleBack = () => {
    navigate(`/course/${folderId}`);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header — same pattern as Learn */}
      <div className="flex items-center justify-between gap-4 border-b border-border-default px-6 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-sans text-[12px] text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Zap className="size-4 shrink-0 text-amber-500" />
            <span className="truncate font-sans text-[14px] font-semibold text-text-primary">
              {title}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-[#333]">
            <div
              className="h-full rounded-full bg-amber-500 transition-[width]"
              style={{
                width: progress.total
                  ? `${Math.round((progress.answered / progress.total) * 100)}%`
                  : "0%",
              }}
            />
          </div>
          <span className="font-mono text-[11px] text-text-faint">
            {progress.total
              ? `${Math.round((progress.answered / progress.total) * 100)}%`
              : "0%"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4">
        <DrillWithObjectiveProgress
          drillId={setId}
          userId={userId}
          onComplete={(answers) => {
            console.log('Drill completed!', answers);
            handleBack();
          }}
        />
      </div>
    </div>
  );
}
