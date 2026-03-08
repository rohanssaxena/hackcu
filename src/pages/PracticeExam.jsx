import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { supabase, USER_ID } from "../lib/supabase";

function PracticeOption({ option, selected, revealed, onSelect, optionIndex }) {
  const isCorrect = option.correct;
  const isThis = selected === optionIndex;

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
      onClick={() => !revealed && onSelect(optionIndex)}
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
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            p: ({ children }) => (
              <span className="font-sans text-[13px] text-text-primary">
                {children}
              </span>
            ),
          }}
        >
          {option.text}
        </ReactMarkdown>
      </div>
    </button>
  );
}

export default function PracticeExam() {
  const { folderId, examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (!examId) return;
    async function load() {
      const { data: examRow, error: examErr } = await supabase
        .from("practice_exams")
        .select("id, title, folder_id")
        .eq("id", examId)
        .single();

      if (examErr || !examRow) {
        setLoading(false);
        return;
      }
      setExam(examRow);

      const { data: qRows, error: qErr } = await supabase
        .from("practice_questions")
        .select("id, question, topic, options, order")
        .eq("exam_id", examId)
        .order("order");

      if (qErr || !qRows?.length) {
        setLoading(false);
        return;
      }
      setQuestions(qRows);
      setLoading(false);
    }
    load();
  }, [examId]);

  const currentQuestion = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isFirst = currentIndex === 0;

  const handleSubmit = () => {
    if (selectedOption === null) return;
    const correct = currentQuestion?.options?.[selectedOption]?.correct ?? false;
    setAnswers((prev) => [...prev, { index: currentIndex, correct }]);
    setRevealed(true);
  };

  const handleNext = () => {
    if (isLast && revealed) {
      setShowSummary(true);
      return;
    }
    setSelectedOption(null);
    setRevealed(false);
    setCurrentIndex((i) => i + 1);
  };

  const handleBack = () => {
    if (isLast && revealed) {
      setSelectedOption(null);
      setRevealed(false);
      setCurrentIndex((i) => i - 1);
      return;
    }
    if (!isFirst) {
      setSelectedOption(null);
      setRevealed(false);
      setCurrentIndex((i) => i - 1);
    }
  };

  const correctCount = answers.filter((a) => a.correct).length;

  useEffect(() => {
    if (showSummary && examId && questions.length > 0) {
      supabase
        .from("practice_exam_attempts")
        .insert({
          exam_id: examId,
          user_id: USER_ID,
          score: correctCount,
          total: questions.length,
        })
        .then(() => {});
    }
  }, [showSummary, examId, questions.length, correctCount]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="font-sans text-[13px] text-text-faint">
          Loading exam…
        </span>
      </div>
    );
  }

  if (!exam || !questions.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <span className="font-sans text-[13px] text-text-faint">
          Exam not found
        </span>
        <button
          onClick={() => navigate(`/course/${folderId}`)}
          className="cursor-pointer rounded bg-accent-blue px-4 py-2 font-sans text-[12px] font-medium text-white hover:brightness-110"
        >
          Back to course
        </button>
      </div>
    );
  }

  if (showSummary) {
    const score = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8">
        <div className="flex flex-col items-center gap-2">
          <span className="font-sans text-[14px] font-medium text-text-primary">
            Practice Exam Complete
          </span>
          <span className="font-mono text-3xl font-semibold text-accent-blue">
            {correctCount} / {questions.length}
          </span>
          <span className="font-sans text-[13px] text-text-secondary">
            {score}%
          </span>
        </div>
        <button
          onClick={() => navigate(`/course/${folderId}`)}
          className="flex cursor-pointer items-center gap-1.5 rounded bg-accent-blue px-4 py-2 font-sans text-[12px] font-medium text-white transition-colors hover:brightness-110"
        >
          <ArrowLeft className="size-3.5" />
          Back to course
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-8 pt-6 pb-8">
      <button
        onClick={() => (revealed ? handleBack() : navigate(`/course/${folderId}`))}
        className="mb-4 flex w-fit cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-text-secondary transition-colors hover:bg-[#232323] hover:text-text-primary"
      >
        <ArrowLeft className="size-3.5" />
        <span className="font-sans text-[12px]">Back</span>
      </button>

      <div className="mb-4 flex items-center justify-between">
        <span className="font-sans text-[11px] font-medium text-text-faint">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <div className="flex h-1.5 w-48 overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full rounded-full bg-accent-blue"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-accent-blue/10 px-2 py-0.5 font-mono text-[10px] font-medium text-accent-blue/80">
                Q{currentIndex + 1}
              </span>
              {currentQuestion?.topic && (
                <span className="font-sans text-[10px] text-text-faint">
                  {currentQuestion.topic}
                </span>
              )}
            </div>
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ children }) => (
                  <span className="font-sans text-[14px] font-medium text-text-primary">
                    {children}
                  </span>
                ),
              }}
            >
              {currentQuestion?.question || ""}
            </ReactMarkdown>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {(currentQuestion?.options || []).map((opt, i) => (
              <PracticeOption
                key={i}
                option={opt}
                optionIndex={i}
                selected={selectedOption}
                revealed={revealed}
                onSelect={setSelectedOption}
              />
            ))}
          </div>
          {revealed && (
            <div className="mt-4 flex items-center gap-1.5 pt-2 border-t border-[#1e1e1e]">
              {currentQuestion?.options?.[selectedOption ?? -1]?.correct ? (
                <>
                  <CheckCircle2 className="size-3.5 text-green-400" />
                  <span className="font-sans text-[12px] font-medium text-green-400">
                    Correct!
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="size-3.5 text-red-400" />
                  <span className="font-sans text-[12px] font-medium text-red-400">
                    Incorrect
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={isFirst && !revealed}
            className={`flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 font-sans text-[12px] transition-colors ${
              isFirst && !revealed
                ? "cursor-not-allowed text-text-faint"
                : "text-text-secondary hover:bg-[#232323] hover:text-text-primary"
            }`}
          >
            <ArrowLeft className="size-3.5" />
            Previous
          </button>
          {!revealed ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              className="flex cursor-pointer items-center gap-1.5 rounded bg-accent-blue px-4 py-1.5 font-sans text-[12px] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex cursor-pointer items-center gap-1.5 rounded bg-accent-blue px-4 py-1.5 font-sans text-[12px] font-medium text-white transition-colors hover:brightness-110"
            >
              {isLast ? "See results" : "Next"}
              <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
