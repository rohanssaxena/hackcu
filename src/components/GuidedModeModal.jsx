import { useState } from "react";
import { X, Sparkles } from "lucide-react";

export default function GuidedModeModal({ onClose }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[420px] overflow-hidden rounded-xl border border-border-default bg-bg-sidebar shadow-2xl">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-accent-blue via-purple-500 to-accent-green" />

        <div className="flex flex-col gap-5 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-accent-blue" />
              <h2 className="font-sans text-lg font-semibold text-text-primary">
                Guided Learning Mode
              </h2>
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer rounded p-1 text-text-secondary transition-colors hover:bg-[#2e2e2e] hover:text-text-primary"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="font-sans text-[13px] leading-[20px] text-text-secondary">
            Guided Learning Mode structures your study session with timed
            intervals, active recall prompts, and adaptive difficulty. Micro
            will guide you step-by-step through your material.
          </p>

          {/* Checkbox */}
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-accent-blue"
            />
            <span className="font-sans text-[12px] leading-[18px] text-text-secondary">
              I understand that this mode is not recommended for exams or
              quizzes.
            </span>
          </label>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              disabled={!agreed}
              className={`flex w-full cursor-pointer items-center justify-center rounded-lg px-4 py-2.5 font-sans text-[13px] font-medium transition-all ${
                agreed
                  ? "bg-accent-blue text-white hover:brightness-110"
                  : "cursor-not-allowed bg-[#333] text-text-faint"
              }`}
            >
              Start Guided Learning Mode
            </button>
            <button
              onClick={onClose}
              className="flex w-full cursor-pointer items-center justify-center rounded-lg px-4 py-2 font-sans text-[13px] text-text-secondary transition-colors hover:bg-[#2e2e2e] hover:text-text-primary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
