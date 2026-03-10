import { useState, useEffect } from "react";
import { ChevronRight, Check, X } from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * Drill viewer: questions for the given set (set_questions where set_id = setId),
 * options per question (set_question_options where question_id = question.id).
 * Renders in the content panel; use hideTitle when the panel header already shows the set title.
 * onProgressChange(answered, total) is called so the parent can show progress.
 */
export default function DrillViewer({ setId, onClose, onProgressChange, hideTitle = false }) {
  const [questions, setQuestions] = useState([]);
  const [optionsByQuestion, setOptionsByQuestion] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [title, setTitle] = useState("Drill");

  useEffect(() => {
    if (!setId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data: setRow, error: setErr } = await supabase
          .from("study_sets")
          .select("id, title")
          .eq("id", setId)
          .single();
        if (setErr) throw setErr;
        if (setRow && !cancelled) setTitle(setRow.title || "Drill");

        // Questions: all rows in set_questions with this drill's set_id
        const { data: qRows, error: qErr } = await supabase
          .from("set_questions")
          .select("id, question, difficulty, order")
          .eq("set_id", setId)
          .order("order");
        if (qErr) throw qErr;
        if (cancelled) return;
        setQuestions(qRows || []);

        const qIds = (qRows || []).map((q) => q.id);
        if (qIds.length === 0) {
          setLoading(false);
          return;
        }
        // Options: all rows in set_question_options whose question_id is one of these questions
        const { data: optRows, error: optErr } = await supabase
          .from("set_question_options")
          .select("id, question_id, text, correct, explanation")
          .in("question_id", qIds);
        if (optErr) throw optErr;
        const byQ = {};
        for (const o of optRows || []) {
          if (!byQ[o.question_id]) byQ[o.question_id] = [];
          byQ[o.question_id].push(o);
        }
        if (!cancelled) setOptionsByQuestion(byQ);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load drill");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setId]);

  const currentQuestion = questions[index];
  const options = currentQuestion ? optionsByQuestion[currentQuestion.id] || [] : [];
  const total = questions.length;
  const isLast = index >= total - 1;
  const answered = index + (revealed ? 1 : 0);

  useEffect(() => {
    if (total > 0 && onProgressChange) {
      onProgressChange({ answered, total });
    }
  }, [answered, total, onProgressChange]);

  const handleSelect = (opt) => {
    if (revealed) return;
    setSelectedOptionId(opt.id);
  };

  const handleCheck = () => {
    if (selectedOptionId == null) return;
    setRevealed(true);
  };

  const handleNext = () => {
    if (!revealed) return;
    setSelectedOptionId(null);
    setRevealed(false);
    if (isLast) {
      onClose?.();
    } else {
      setIndex((i) => i + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
        <p className="font-sans text-[13px] text-text-secondary">Loading drill…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
        <p className="font-sans text-[13px] text-red-400">{error}</p>
        <button
          onClick={onClose}
          className="rounded-lg border border-border-default bg-bg-elevated px-3 py-1.5 font-sans text-[12px] text-text-primary hover:bg-bg-hover"
        >
          Close
        </button>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
        <p className="font-sans text-[13px] text-text-secondary">No questions in this set.</p>
        <button
          onClick={onClose}
          className="rounded-lg border border-border-default bg-bg-elevated px-3 py-1.5 font-sans text-[12px] text-text-primary hover:bg-bg-hover"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mb-4 flex items-center justify-between border-b border-border-default pb-3">
        {!hideTitle && (
          <h2 className="font-sans text-[15px] font-semibold text-text-primary">{title}</h2>
        )}
        <span className={`font-mono text-[11px] text-text-faint ${hideTitle ? "ml-auto" : ""}`}>
          {index + 1} / {total}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-6">
        <p className="font-sans text-[14px] leading-[22px] text-text-primary">
          {currentQuestion?.question}
        </p>

        <div className="flex flex-col gap-2">
          {options.map((opt) => {
            const selected = selectedOptionId === opt.id;
            const showCorrect = revealed && opt.correct;
            const showWrong = revealed && selected && !opt.correct;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt)}
                disabled={revealed}
                className={`flex w-full cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                  showCorrect
                    ? "border-accent-green bg-accent-green/10"
                    : showWrong
                      ? "border-red-500/50 bg-red-500/10"
                      : selected
                        ? "border-accent-blue bg-accent-blue/10"
                        : "border-border-default bg-bg-elevated hover:border-border-subtle hover:bg-bg-hover"
                } ${revealed ? "cursor-default" : ""}`}
              >
                <span className="mt-0.5 shrink-0">
                  {showCorrect && <Check className="size-4 text-accent-green" />}
                  {showWrong && <X className="size-4 text-red-400" />}
                  {!revealed && (
                    <span className="flex size-4 items-center justify-center rounded-full border-2 border-border-default" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-[13px] leading-[18px] text-text-primary">
                    {opt.text}
                  </p>
                  {revealed && opt.explanation && (
                    <p className="mt-2 font-sans text-[11px] leading-[16px] text-text-secondary">
                      {opt.explanation}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex justify-end border-t border-border-default pt-4">
        {!revealed ? (
          <button
            type="button"
            onClick={handleCheck}
            disabled={selectedOptionId == null}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-4 py-1.5 font-sans text-[12px] font-medium text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="size-4" />
            Check
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-4 py-1.5 font-sans text-[12px] font-medium text-black transition-colors hover:bg-gray-200"
          >
            {isLast ? "Finish" : "Next"}
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
