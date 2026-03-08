import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { getContentNodeWithPhases } from "../lib/outlineService";

function QuizOption({ option, selected, revealed, onSelect }) {
  const isCorrect = option.correct;
  const isThis = selected === option.id;

  let border = "border-[#232323]";
  let bg = "bg-[#111]";
  let cursor = "cursor-pointer hover:border-[#333] hover:bg-[#1a1a1e]";

  if (revealed) {
    cursor = "cursor-default";
    if (isThis && isCorrect) {
      border = "border-green-500/40";
      bg = "bg-green-500/5";
    } else if (isThis && !isCorrect) {
      border = "border-red-500/40";
      bg = "bg-red-500/5";
    } else if (isCorrect) {
      border = "border-green-500/20";
      bg = "bg-green-500/[0.02]";
    }
  }

  return (
    <button
      onClick={() => !revealed && onSelect(option.id)}
      className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${border} ${bg} ${cursor}`}
    >
      <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-[#333]">
        {revealed && isThis && isCorrect && (
          <CheckCircle2 className="size-4 text-green-400" />
        )}
        {revealed && isThis && !isCorrect && (
          <XCircle className="size-4 text-red-400" />
        )}
        {revealed && !isThis && isCorrect && (
          <CheckCircle2 className="size-4 text-green-400/50" />
        )}
      </div>
      <div className="flex-1">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}
          components={{ p: ({ children }) => <span className="font-sans text-[13px] text-text-primary">{children}</span> }}
        >
          {option.text}
        </ReactMarkdown>
        {revealed && isThis && (
          <p className={`mt-1.5 font-sans text-[11px] leading-[16px] ${isCorrect ? "text-green-400/70" : "text-red-400/70"}`}>
            {option.explanation}
          </p>
        )}
        {revealed && !isThis && isCorrect && (
          <p className="mt-1.5 font-sans text-[11px] leading-[16px] text-green-400/50">
            {option.explanation}
          </p>
        )}
      </div>
    </button>
  );
}

function QuizCheckpoint({ checkpoint, index }) {
  const [selected, setSelected] = useState(null);
  const revealed = selected !== null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-5">
      <div className="flex items-center gap-2">
        <span className="rounded bg-accent-blue/10 px-2 py-0.5 font-mono text-[10px] font-medium text-accent-blue/80">
          Q{index + 1}
        </span>
        <div className="flex-1">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}
            components={{ p: ({ children }) => <span className="font-sans text-[13px] font-medium text-text-primary">{children}</span> }}
          >
            {checkpoint.question}
          </ReactMarkdown>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {checkpoint.options.map((opt) => (
          <QuizOption
            key={opt.id}
            option={opt}
            selected={selected}
            revealed={revealed}
            onSelect={setSelected}
          />
        ))}
      </div>
      {revealed && (
        <div className="flex items-center gap-1.5 pt-1">
          {selected && checkpoint.options.find((o) => o.id === selected)?.correct ? (
            <>
              <CheckCircle2 className="size-3.5 text-green-400" />
              <span className="font-sans text-[12px] font-medium text-green-400">Correct!</span>
            </>
          ) : (
            <>
              <XCircle className="size-3.5 text-red-400" />
              <span className="font-sans text-[12px] font-medium text-red-400">Incorrect</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PhaseSection({ phase, phaseIndex, total }) {
  return (
    <section id={`phase-${phaseIndex + 1}`} className="flex flex-col gap-6 scroll-mt-4">
      <div className="flex items-center gap-3 border-b border-[#1e1e1e] pb-4">
        <span className="flex size-7 items-center justify-center rounded-full bg-accent-blue/10 font-mono text-[11px] font-semibold text-accent-blue">
          {phaseIndex + 1}
        </span>
        <div className="flex-1">
          <h2 className="font-sans text-[16px] font-semibold text-text-primary">
            {phase.title}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 font-sans text-[11px] text-text-faint">
              <Clock className="size-3" />
              {phase.estimated_time_minutes} min
            </span>
            <span className="font-sans text-[11px] text-text-faint">
              Phase {phaseIndex + 1} of {total}
            </span>
          </div>
        </div>
      </div>

      <div className="learn-prose">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {phase.content}
        </ReactMarkdown>
      </div>

      {phase.checkpoints.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-[#1e1e1e]" />
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-text-faint">
              Checkpoint
            </span>
            <div className="h-px flex-1 bg-[#1e1e1e]" />
          </div>
          {phase.checkpoints.map((cp, i) => (
            <QuizCheckpoint key={cp.id} checkpoint={cp} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Learn() {
  const { folderId, contentNodeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const hash = location.hash?.slice(1);
    if (hash && hash.startsWith("phase-") && data?.phases?.length) {
      const phaseNum = parseInt(hash.replace("phase-", ""), 10);
      if (phaseNum >= 1 && phaseNum <= data.phases.length) {
        const el = document.getElementById(hash);
        if (el) {
          setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        }
      }
    }
  }, [location.hash, data?.phases?.length]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContentNodeWithPhases(contentNodeId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contentNodeId]);

  const totalTime = data?.phases?.reduce((s, p) => s + p.estimated_time_minutes, 0) || 0;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="font-sans text-[13px] text-red-400">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="cursor-pointer font-sans text-[12px] text-accent-blue hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-default px-6 py-3">
        <button
          onClick={() => navigate(-1)}
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 font-sans text-[12px] text-text-secondary transition-colors hover:bg-[#1a1a1e] hover:text-text-primary"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </button>
        <ChevronRight className="size-3 text-text-faint" />
        <h1 className="flex-1 truncate font-sans text-[14px] font-semibold text-text-primary">
          {data.title}
        </h1>
        <span className="flex items-center gap-1.5 rounded-md bg-[#1e1e1e] px-2.5 py-1 font-sans text-[11px] text-text-secondary">
          <Clock className="size-3" />
          ~{totalTime} min
        </span>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-12 px-6 py-8">
          {data.phases.map((phase, i) => (
            <PhaseSection
              key={phase.id}
              phase={phase}
              phaseIndex={i}
              total={data.phases.length}
            />
          ))}

          {data.phases.length > 0 && (
            <div className="flex flex-col items-center gap-3 border-t border-[#1e1e1e] py-8">
              <CheckCircle2 className="size-6 text-accent-green" />
              <p className="font-sans text-[14px] font-medium text-text-primary">
                You've reached the end
              </p>
              <button
                onClick={() => navigate(-1)}
                className="cursor-pointer rounded-md bg-accent-blue/10 px-4 py-1.5 font-sans text-[12px] font-medium text-accent-blue transition-colors hover:bg-accent-blue/20"
              >
                Back to course
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
