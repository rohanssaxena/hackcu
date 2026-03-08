import { useState, useEffect, useRef } from "react";
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
  "Generating Content",
  "Review",
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

export default function OutlineModal({ folderId, folderName, onClose, onComplete }) {
  const [stage, setStage] = useState(0);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [outline, setOutline] = useState(null);
  const [error, setError] = useState(null);
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  // Stage 1 sub-steps
  const [outlineSubStep, setOutlineSubStep] = useState(0);

  // Stage 2 (content gen) state
  const [contentNodes, setContentNodes] = useState([]);
  const [contentNodeStatuses, setContentNodeStatuses] = useState([]);

  const attemptClose = () => {
    if (stage >= 1 && stage <= 2) {
      setShowConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    getFilesForFolder(folderId)
      .then((f) => {
        setFiles(f);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [folderId]);

  const handleGenerate = async () => {
    setStage(1);
    setError(null);
    setOutlineSubStep(0);

    try {
      // sub-step 0: extracting
      const advanceTimer = setTimeout(() => setOutlineSubStep(1), 3000);

      const result = await requestOutlineGeneration(folderId);
      clearTimeout(advanceTimer);

      // sub-step 2: storing
      setOutlineSubStep(2);
      await new Promise((r) => setTimeout(r, 800));
      setOutlineSubStep(3);
      setOutline(result);

      await new Promise((r) => setTimeout(r, 400));

      // Move to stage 2: content generation
      setStage(2);
      await runContentGeneration();
    } catch (e) {
      setError(e.message);
    }
  };

  const runContentGeneration = async () => {
    try {
      await requestContentGeneration(folderId, (event) => {
        switch (event.type) {
          case "start":
            setContentNodes(event.nodes);
            setContentNodeStatuses(event.nodes.map(() => "pending"));
            break;
          case "node_start":
            setContentNodeStatuses((prev) => {
              const next = [...prev];
              next[event.index] = "active";
              return next;
            });
            break;
          case "node_done":
            setContentNodeStatuses((prev) => {
              const next = [...prev];
              next[event.index] = "done";
              return next;
            });
            break;
          case "node_error":
            setContentNodeStatuses((prev) => {
              const next = [...prev];
              next[event.index] = "error";
              return next;
            });
            break;
          case "error":
            setError(event.error);
            break;
          case "complete":
            break;
        }
      });

      await new Promise((r) => setTimeout(r, 400));
      setStage(3);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDone = () => {
    onComplete?.();
    onClose();
  };

  const doneCount = contentNodeStatuses.filter((s) => s === "done").length;

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

          {/* Stage 2: Content generation — section-by-section progress */}
          {stage === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="font-sans text-[13px] font-medium text-text-primary">
                  Generating learning content…
                </p>
                {contentNodes.length > 0 && (
                  <span className="font-mono text-[11px] text-text-faint">
                    {doneCount} / {contentNodes.length}
                  </span>
                )}
              </div>

              {contentNodes.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-5 animate-spin text-text-faint" />
                </div>
              ) : (
                <div className="flex flex-col rounded-md border border-border-default">
                  {contentNodes.map((title, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-3 py-2.5 ${
                        i > 0 ? "border-t border-border-default" : ""
                      }`}
                    >
                      {contentNodeStatuses[i] === "done" && (
                        <CheckCircle2 className="size-4 shrink-0 text-accent-green" />
                      )}
                      {contentNodeStatuses[i] === "active" && (
                        <Loader2 className="size-4 shrink-0 animate-spin text-accent-blue" />
                      )}
                      {contentNodeStatuses[i] === "pending" && (
                        <Circle className="size-4 shrink-0 text-[#333]" />
                      )}
                      {contentNodeStatuses[i] === "error" && (
                        <AlertCircle className="size-4 shrink-0 text-red-400" />
                      )}
                      <span
                        className={`font-sans text-[13px] ${
                          contentNodeStatuses[i] === "done"
                            ? "text-text-secondary"
                            : contentNodeStatuses[i] === "active"
                              ? "font-medium text-text-primary"
                              : contentNodeStatuses[i] === "error"
                                ? "text-red-400"
                                : "text-text-faint"
                        }`}
                      >
                        {title}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="mt-2 font-sans text-[12px] text-red-400">{error}</p>}
            </div>
          )}

          {/* Stage 3: Review */}
          {stage === 3 && outline && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-accent-green" />
                <span className="font-sans text-[13px] font-medium text-text-primary">
                  Outline & content generated successfully
                </span>
              </div>
              <OutlineView outline={outline} />
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
          {stage === 3 && (
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
