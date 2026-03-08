import { useState, useEffect } from "react";
import { X, FileText, Loader2, CheckCircle2, ChevronRight } from "lucide-react";
import { generateOutlineForFolder, getFilesForFolder } from "../lib/outlineService";

export default function OutlineGeneratorModal({ folderId, folderName, onClose, onComplete }) {
  // Stages: 1 = index files, 2 = generating, 3 = review
  const [stage, setStage] = useState(1);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [outline, setOutline] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadFiles() {
      try {
        const data = await getFilesForFolder(folderId);
        setFiles(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingFiles(false);
      }
    }
    loadFiles();
  }, [folderId]);

  const handleGenerate = async () => {
    if (files.length === 0) {
      setError("Add some files to this folder first before generating an outline.");
      return;
    }
    setStage(2);
    setError(null);
    try {
      const result = await generateOutlineForFolder(folderId);
      setOutline(result);
      setStage(3);
    } catch (err) {
      setError(err.message);
      setStage(1); // Go back so they can retry
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 font-sans backdrop-blur-sm">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border-default bg-[#151515] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-text-primary">
              Generate Outline
            </h2>
            <span className="text-xs text-text-secondary">
              for <span className="font-medium text-text-primary">{folderName}</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-faint hover:bg-[#2a2a2a] hover:text-text-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded bg-red-500/10 p-3 text-[13px] text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          {stage === 1 && (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-text-secondary">
                We'll analyze the following files to generate a structured curriculum outline. Make sure you've uploaded all relevant materials for this section.
              </p>
              
              <div className="flex flex-col rounded-lg border border-border-subtle bg-bg-elevated p-2">
                <div className="mb-2 px-2 pt-1 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                  Files to index ({files.length})
                </div>
                {loadingFiles ? (
                  <div className="flex items-center gap-2 p-2 text-[13px] text-text-faint">
                    <Loader2 className="size-4 animate-spin" /> Loading files...
                  </div>
                ) : files.length === 0 ? (
                  <div className="p-2 text-[13px] text-text-faint italic">
                    No files found in this folder.
                  </div>
                ) : (
                  <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-[#2a2a2e]">
                        <FileText className="size-3.5 text-text-secondary" />
                        <span className="truncate text-[13px] text-text-primary">{f.filename}</span>
                        <span className="ml-auto text-[10px] text-text-faint uppercase">{f.file_type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {stage === 2 && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="relative flex size-16 items-center justify-center rounded-full bg-accent-blue/10">
                <Loader2 className="size-8 animate-spin text-accent-blue" />
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-[15px] font-medium text-text-primary">Generating your outline...</h3>
                <p className="text-[13px] text-text-secondary max-w-sm">
                  The AI is analyzing the curriculum files and creating a structured map of concepts. This may take 10-20 seconds.
                </p>
              </div>
            </div>
          )}

          {stage === 3 && outline && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 rounded bg-accent-green/10 p-3 text-[13px] text-accent-green border border-accent-green/20">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Outline generated successfully! Review the structure below.</span>
              </div>
              
              <div className="flex flex-col gap-3">
                {outline.map((topic, i) => (
                  <div key={i} className="flex flex-col rounded-lg border border-border-subtle bg-bg-elevated p-4">
                    <span className="text-[14px] font-medium text-text-primary">
                      {i + 1}. {topic.title}
                    </span>
                    <span className="mt-1 text-[12px] text-text-secondary">
                      {topic.description}
                    </span>
                    {topic.subtopics && topic.subtopics.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1.5 border-l-2 border-border-default pl-3">
                        {topic.subtopics.map((sub, j) => (
                          <div key={j} className="flex items-start gap-2">
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-text-faint" />
                            <span className="text-[12px] text-text-primary">{sub}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border-default bg-[#1a1a1a] px-6 py-4">
          <button
            onClick={onClose}
            disabled={stage === 2}
            className="rounded px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-[#2a2a2a] hover:text-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          
          {stage === 1 && (
            <button
              onClick={handleGenerate}
              disabled={files.length === 0 || loadingFiles}
              className="flex items-center gap-1.5 rounded bg-accent-blue px-4 py-2 text-[13px] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
            >
              Generate Map
            </button>
          )}

          {stage === 3 && (
            <button
              onClick={onComplete}
              className="flex items-center gap-1.5 rounded bg-accent-green px-4 py-2 text-[13px] font-medium text-black transition-colors hover:brightness-110"
            >
              Accept & Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
