import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2, CheckCircle2, ChevronRight } from "lucide-react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";

const LENGTH_OPTIONS = [
  { value: "short", label: "Short (1–2 sentences per question)" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long (detailed scenarios)" },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

function ConfirmLeaveDialog({ onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="w-[360px] rounded-lg border border-border-default bg-bg-primary shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4">
          <p className="font-sans text-[14px] font-medium text-text-primary">
            Leave practice exam setup?
          </p>
          <p className="mt-1.5 font-sans text-[13px] text-text-secondary">
            Your progress will be lost. Are you sure you want to close?
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border-default px-4 py-3">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded px-3 py-1.5 font-sans text-[12px] font-medium text-text-secondary transition-colors hover:bg-[#232323] hover:text-text-primary"
          >
            No, stay
          </button>
          <button
            onClick={onConfirm}
            className="cursor-pointer rounded bg-red-500/20 px-3 py-1.5 font-sans text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/30"
          >
            Yes, leave
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PracticeExamModal({
  folderId,
  onClose,
  onCreated,
}) {
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const [examplesText, setExamplesText] = useState("");
  const [length, setLength] = useState("medium");
  const [difficulty, setDifficulty] = useState("medium");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  const needsConfirm = stage < 3 || generating;
  const handleClose = () => {
    if (needsConfirm) setShowConfirmLeave(true);
    else onClose();
  };
  const handleConfirmLeave = () => {
    setShowConfirmLeave(false);
    onClose();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const body = {
        folder_id: folderId,
        settings: { length, difficulty },
      };
      if (examplesText.trim()) {
        body.examples_text = examplesText.trim();
      }
      const url = SERVER_URL ? `${SERVER_URL}/api/practice/generate` : "/api/practice/generate";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          text
            ? `Server returned invalid response: ${text.slice(0, 150)}...`
            : "Server returned empty response. The request may have timed out or the server may have crashed. Check the server logs."
        );
      }
      if (!res.ok) {
        const msg = data?.error || data?.message || (typeof data === "string" ? data : null);
        throw new Error(msg || `Request failed (${res.status})`);
      }
      setResult(data);
      setStage(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        onClick={handleClose}
      >
        <div
          className="flex max-h-[85vh] w-[420px] flex-col rounded-lg border border-border-default bg-bg-sidebar shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <span className="font-sans text-[14px] font-medium text-text-primary">
              Practice Exam
            </span>
            <button
              onClick={handleClose}
              className="cursor-pointer rounded p-1 text-text-faint transition-colors hover:bg-[#2a2a2a] hover:text-text-primary"
            >
              <X className="size-4" />
            </button>
          </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Stage 0: Examples */}
          {stage === 0 && (
            <div className="flex flex-col gap-4">
              <p className="font-sans text-[13px] text-text-secondary">
                Optionally provide example questions to match style and difficulty.
              </p>
              <textarea
                value={examplesText}
                onChange={(e) => setExamplesText(e.target.value)}
                placeholder="Paste example MCQ questions here..."
                rows={5}
                className="w-full resize-none rounded border border-border-default bg-[#111] px-3 py-2 font-sans text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-accent-blue"
              />
            </div>
          )}

          {/* Stage 1: Settings */}
          {stage === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <span className="mb-1.5 block font-sans text-[11px] font-medium text-text-muted">
                  Length
                </span>
                <div className="flex flex-col gap-1">
                  {LENGTH_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 font-sans text-[13px] text-text-primary"
                    >
                      <input
                        type="radio"
                        name="length"
                        checked={length === opt.value}
                        onChange={() => setLength(opt.value)}
                        className="rounded-full border-border-default"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-1.5 block font-sans text-[11px] font-medium text-text-muted">
                  Difficulty
                </span>
                <div className="flex flex-col gap-1">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 font-sans text-[13px] text-text-primary"
                    >
                      <input
                        type="radio"
                        name="difficulty"
                        checked={difficulty === opt.value}
                        onChange={() => setDifficulty(opt.value)}
                        className="rounded-full border-border-default"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stage 2: Generating */}
          {stage === 2 && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="size-10 animate-spin text-accent-blue" />
              <p className="font-sans text-[13px] text-text-secondary">
                Generating practice exam…
              </p>
              {error && (
                <p className="font-sans text-[12px] text-red-400">{error}</p>
              )}
            </div>
          )}

          {/* Stage 3: Created */}
          {stage === 3 && result && (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="size-12 text-accent-green" />
              <p className="font-sans text-[14px] font-medium text-text-primary">
                Exam created
              </p>
              <p className="font-sans text-[12px] text-text-secondary">
                {result.question_count} questions generated
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-default px-4 py-3">
          {stage === 0 && (
            <>
              <button
                onClick={() => setStage(1)}
                className="flex cursor-pointer items-center gap-1.5 rounded bg-accent-blue px-4 py-1.5 font-sans text-[12px] font-medium text-white transition-colors hover:brightness-110"
              >
                Continue
                <ChevronRight className="size-3.5" />
              </button>
            </>
          )}
          {(stage === 1 || (stage === 2 && error)) && (
            <>
              <button
                onClick={() => (stage === 2 ? (setError(null), setStage(1)) : setStage(0))}
                className="cursor-pointer font-sans text-[12px] text-text-secondary hover:text-text-primary"
              >
                Back
              </button>
              {stage === 1 && (
              <button
                onClick={() => {
                  setStage(2);
                  handleGenerate();
                }}
                disabled={generating}
                className="flex cursor-pointer items-center gap-1.5 rounded bg-accent-blue px-4 py-1.5 font-sans text-[12px] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
              >
                Generate practice exam
              </button>
              )}
            </>
          )}
          {stage === 3 && result && (
            <>
              <button
                onClick={() => {
                  onClose();
                  onCreated?.();
                }}
                className="cursor-pointer font-sans text-[12px] text-text-secondary hover:text-text-primary"
              >
                Do later
              </button>
              <button
                onClick={() => {
                  onClose();
                  onCreated?.();
                  navigate(`/course/${folderId}/practice/${result.exam_id}`);
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded bg-accent-blue px-4 py-1.5 font-sans text-[12px] font-medium text-white transition-colors hover:brightness-110"
              >
                Start now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
      {showConfirmLeave && (
        <ConfirmLeaveDialog
          onCancel={() => setShowConfirmLeave(false)}
          onConfirm={handleConfirmLeave}
        />
      )}
    </>
  );
}
