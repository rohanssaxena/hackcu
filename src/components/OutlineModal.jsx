import { useState, useEffect } from "react";
import {
  X,
  FileText,
  File,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Circle,
  AlertCircle,
} from "lucide-react";
import {
  getFilesForFolder,
  requestOutlineGeneration,
  requestContentGeneration,
} from "../lib/outlineService";
import OutlineView from "./OutlineView";

const STAGES = [
  "Files to Index",
  "Generating Outline",
  "Review Outline",
  "Generating Content",
  "Finished",
];

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SubStepRow({ status, label }) {
  return (
    <div className="flex items-center gap-3">
      {status === "done" && <CheckCircle2 className="size-4 shrink-0 text-accent-green" />}
      {status === "active" && <Loader2 className="size-4 shrink-0 animate-spin text-accent-blue" />}
      {status === "pending" && <Circle className="size-4 shrink-0 text-[#333]" />}
      {status === "error" && <AlertCircle className="size-4 shrink-0 text-red-400" />}
      <span
        className={`font-sans text-[13px] ${
          status === "done"
            ? "text-text-secondary"
            : status === "active"
              ? "font-medium text-text-primary"
              : status === "error"
                ? "text-red-400"
                : "text-text-faint"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function ConfirmDiscardDialog({ onCancel, onConfirm }) {
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
            Cancel generation?
          </p>
          <p className="mt-1.5 font-sans text-[13px] text-text-secondary">
            This process is still running. If you leave now, all progress will be lost.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border-default px-4 py-3">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded px-3 py-1.5 font-sans text-[12px] font-medium text-text-secondary transition-colors hover:bg-[#232323] hover:text-text-primary"
          >
            No, go back
          </button>
          <button
            onClick={onConfirm}
            className="cursor-pointer rounded bg-red-500/20 px-3 py-1.5 font-sans text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/30"
          >
            Yes, cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OutlineModal({ folderId, folderName, onClose, onComplete, initialStage = 0 }) {
  const [stage, setStage] = useState(initialStage);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(initialStage === 0);
  const [outline, setOutline] = useState(null);
  const [error, setError] = useState(null);
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  // Stage 1 sub-steps
  const [outlineSubStep, setOutlineSubStep] = useState(0);

  // Stage 3 (content gen) state
  const [contentSubStep, setContentSubStep] = useState(0); // 0=collect, 1=generate, 2=store, 3=done
  const [contentTotal, setContentTotal] = useState(0);
  const [contentPending, setContentPending] = useState(0);

  const isProcessing = stage === 1 || stage === 3;

  const attemptClose = () => {
    if (isProcessing) {
      setShowConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (initialStage === 0) {
      getFilesForFolder(folderId)
        .then((f) => {
          setFiles(f);
          setLoading(false);
        })
        .catch((e) => {
          setError(e.message);
          setLoading(false);
        });
    }
  }, [folderId, initialStage]);

  useEffect(() => {
    if (initialStage === 3) {
      handleContinueToContent();
    }
  }, []);

  const handleGenerate = async () => {
    setStage(1);
    setError(null);
    setOutlineSubStep(0);

    try {
      const advanceTimer = setTimeout(() => setOutlineSubStep(1), 3000);

      const result = await requestOutlineGeneration(folderId);
      clearTimeout(advanceTimer);

      setOutlineSubStep(2);
      await new Promise((r) => setTimeout(r, 800));
      setOutlineSubStep(3);
      setOutline(result);

      await new Promise((r) => setTimeout(r, 400));
      setStage(2);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleContinueToContent = async () => {
    setStage(3);
    setError(null);
    setContentSubStep(0);

    try {
      await requestContentGeneration(folderId, (event) => {
        switch (event.type) {
          case "start":
            setContentTotal(event.total || 0);
            setContentPending(event.pendingCount ?? event.total ?? 0);
            break;
          case "status":
            if (event.step === "collect") setContentSubStep(0);
            else if (event.step === "generate") setContentSubStep(1);
            else if (event.step === "store") setContentSubStep(2);
            else if (event.step === "skip") setContentSubStep(3);
            break;
          case "error":
            setError(event.error);
            break;
          case "complete":
            setContentSubStep(3);
            break;
        }
      });

      await new Promise((r) => setTimeout(r, 400));
      setStage(4);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDone = () => {
    onComplete?.();
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={attemptClose}
      >
        <div
          className="flex h-[80vh] w-[640px] flex-col overflow-hidden rounded-lg border border-border-default bg-bg-primary shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title bar */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border-default bg-[#141414] px-4">
            <span className="font-sans text-[13px] font-medium text-text-primary">
              Generate Outline — {folderName}
            </span>
            <button
              onClick={attemptClose}
              className="cursor-pointer rounded p-1 text-text-secondary transition-colors hover:bg-[#232323] hover:text-text-primary"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Stage indicator */}
          <div className="flex items-center gap-2 border-b border-border-default bg-[#141414] px-4 py-2.5">
            {STAGES.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="size-3 text-text-faint" />}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`flex size-5 items-center justify-center rounded-full font-mono text-[10px] ${
                      i < stage
                        ? "bg-accent-green text-black"
                        : i === stage
                          ? "bg-accent-blue text-white"
                          : "bg-[#232323] text-text-faint"
                    }`}
                  >
                    {i < stage ? <CheckCircle2 className="size-3" /> : i + 1}
                  </div>
                  <span
                    className={`font-sans text-[11px] ${
                      i === stage
                        ? "font-medium text-text-primary"
                        : i < stage
                          ? "text-text-secondary"
                          : "text-text-faint"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Stage 0: File preview */}
            {stage === 0 && (
              <div className="flex flex-col gap-3">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-5 animate-spin text-text-faint" />
                  </div>
                ) : files.length === 0 ? (
                  <p className="py-8 text-center font-sans text-[13px] text-text-faint">
                    No files found in this folder.
                  </p>
                ) : (
                  <>
                    <p className="font-sans text-[12px] text-text-secondary">
                      The following {files.length} file{files.length !== 1 ? "s" : ""} will
                      be indexed to generate the outline:
                    </p>
                    <div className="flex flex-col rounded-md border border-border-default">
                      {files.map((f, i) => {
                        const Icon = f.file_type === "pdf" ? FileText : File;
                        return (
                          <div
                            key={f.id}
                            className={`flex items-center gap-3 px-3 py-2 ${
                              i > 0 ? "border-t border-border-default" : ""
                            }`}
                          >
                            <Icon
                              className={`size-4 shrink-0 ${
                                f.file_type === "pdf" ? "text-red-400" : "text-text-secondary"
                              }`}
                            />
                            <span className="flex-1 font-sans text-[13px] text-text-primary">
                              {f.filename}
                            </span>
                            <span className="font-mono text-[11px] text-text-faint">
                              {formatBytes(f.file_size_bytes)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {error && <p className="font-sans text-[12px] text-red-400">{error}</p>}
              </div>
            )}

            {/* Stage 1: Outline generation — sub-step checklist */}
            {stage === 1 && (
              <div className="flex flex-col items-center justify-center gap-8 py-12">
                <div className="flex flex-col gap-4">
                  <SubStepRow
                    label="Extracting text from files"
                    status={outlineSubStep > 0 ? "done" : outlineSubStep === 0 ? "active" : "pending"}
                  />
                  <SubStepRow
                    label="Generating outline with AI"
                    status={outlineSubStep > 1 ? "done" : outlineSubStep === 1 ? "active" : "pending"}
                  />
                  <SubStepRow
                    label="Parsing and storing structure"
                    status={outlineSubStep > 2 ? "done" : outlineSubStep === 2 ? "active" : "pending"}
                  />
                </div>
                <span className="font-sans text-[11px] text-text-faint">
                  Processing {files.length} file{files.length !== 1 ? "s" : ""}…
                </span>
                {error && <p className="font-sans text-[12px] text-red-400">{error}</p>}
              </div>
            )}

            {/* Stage 2: Review outline */}
            {stage === 2 && outline && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-accent-green" />
                  <span className="font-sans text-[13px] font-medium text-text-primary">
                    Outline generated — review before continuing
                  </span>
                </div>
                <OutlineView outline={outline} />
              </div>
            )}

            {/* Stage 3: Content generation — single batched call */}
            {stage === 3 && (
              <div className="flex flex-col items-center justify-center gap-8 py-12">
                <div className="flex flex-col gap-4">
                  <SubStepRow
                    label="Collecting content nodes from outline"
                    status={contentSubStep > 0 ? "done" : contentSubStep === 0 ? "active" : "pending"}
                  />
                  <SubStepRow
                    label={`Generating learning content${contentPending > 0 ? ` for ${contentPending} topic${contentPending !== 1 ? "s" : ""}` : ""}`}
                    status={contentSubStep > 1 ? "done" : contentSubStep === 1 ? "active" : "pending"}
                  />
                  <SubStepRow
                    label="Storing phases and checkpoints"
                    status={contentSubStep > 2 ? "done" : contentSubStep === 2 ? "active" : "pending"}
                  />
                </div>
                {contentTotal > 0 && (
                  <span className="font-sans text-[11px] text-text-faint">
                    {contentTotal} topic{contentTotal !== 1 ? "s" : ""} total
                  </span>
                )}
                {error && <p className="font-sans text-[12px] text-red-400">{error}</p>}
              </div>
            )}

            {/* Stage 4: Finished */}
            {stage === 4 && (
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <CheckCircle2 className="size-10 text-accent-green" />
                <span className="font-sans text-[15px] font-medium text-text-primary">
                  Outline & learning content generated
                </span>
                <span className="font-sans text-[13px] text-text-secondary">
                  {contentTotal} topics with learning phases are ready.
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex h-14 shrink-0 items-center justify-end gap-3 border-t border-border-default bg-[#141414] px-4">
            {stage === 0 && (
              <button
                onClick={handleGenerate}
                disabled={loading || files.length === 0}
                className="flex cursor-pointer items-center gap-1.5 rounded bg-white px-4 py-1.5 font-sans text-[12px] font-medium text-black transition-colors hover:bg-gray-200 disabled:cursor-default disabled:opacity-40"
              >
                Generate Outline
              </button>
            )}
            {stage === 2 && (
              <button
                onClick={handleContinueToContent}
                className="flex cursor-pointer items-center gap-1.5 rounded bg-white px-4 py-1.5 font-sans text-[12px] font-medium text-black transition-colors hover:bg-gray-200"
              >
                Generate Content
              </button>
            )}
            {stage === 4 && (
              <button
                onClick={handleDone}
                className="flex cursor-pointer items-center gap-1.5 rounded bg-white px-4 py-1.5 font-sans text-[12px] font-medium text-black transition-colors hover:bg-gray-200"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
      {showConfirmDiscard && (
        <ConfirmDiscardDialog
          onCancel={() => setShowConfirmDiscard(false)}
          onConfirm={onClose}
        />
      )}
    </>
  );
}
