import { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  X,
  Download,
  Pencil,
  Eye,
  Save,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";
import { getFileUrl, getFileText, saveFileText } from "../lib/workspace";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const TEXT_TYPES = new Set(["md", "txt", "doc", "file"]);
const PDF_TYPES = new Set(["pdf"]);
const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 2.0, 3.0];

function PdfViewer({ url }) {
  const [numPages, setNumPages] = useState(null);
  const [activePage, setActivePage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [pageInputValue, setPageInputValue] = useState("1");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const containerRef = useRef(null);
  const thumbSidebarRef = useRef(null);
  const pageRefs = useRef({});
  const thumbRefs = useRef({});

  const onDocumentLoadSuccess = ({ numPages: total }) => {
    setNumPages(total);
    setActivePage(1);
    setPageInputValue("1");
  };

  const scrollToPage = useCallback(
    (n) => {
      const clamped = Math.max(1, Math.min(n, numPages || 1));
      setActivePage(clamped);
      setPageInputValue(String(clamped));
      const el = pageRefs.current[clamped];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [numPages],
  );

  const scrollThumbIntoView = useCallback((pageNum) => {
    const el = thumbRefs.current[pageNum];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  // Track which page is currently most visible via IntersectionObserver
  useEffect(() => {
    if (!numPages) return;
    const container = containerRef.current;
    if (!container) return;

    const visibleRatios = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNum = Number(entry.target.dataset.page);
          visibleRatios.set(pageNum, entry.intersectionRatio);
        }
        let bestPage = 1;
        let bestRatio = 0;
        for (const [page, ratio] of visibleRatios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestPage = page;
          }
        }
        if (bestRatio > 0) {
          setActivePage(bestPage);
          setPageInputValue(String(bestPage));
          scrollThumbIntoView(bestPage);
        }
      },
      { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (let i = 1; i <= numPages; i++) {
      const el = pageRefs.current[i];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [numPages, scrollThumbIntoView]);

  const zoomIn = () => {
    const next = ZOOM_STEPS.find((s) => s > scale + 0.01);
    if (next) setScale(next);
  };

  const zoomOut = () => {
    const prev = [...ZOOM_STEPS].reverse().find((s) => s < scale - 0.01);
    if (prev) setScale(prev);
  };

  const handlePageInputSubmit = () => {
    const parsed = parseInt(pageInputValue, 10);
    if (!isNaN(parsed)) scrollToPage(parsed);
    else setPageInputValue(String(activePage));
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  });

  const pctLabel = `${Math.round(scale * 100)}%`;
  const THUMB_SCALE = 0.18;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* PDF toolbar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border-default bg-[#1a1a1a] px-3">
        {/* Left: sidebar toggle + page nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className={`cursor-pointer rounded p-1 transition-colors hover:bg-[#2a2a2a] ${sidebarOpen ? "text-text-primary" : "text-text-faint"}`}
            title="Toggle page thumbnails"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            >
              <rect x="1" y="1" width="4" height="12" rx="0.5" />
              <rect x="7" y="1" width="6" height="12" rx="0.5" />
            </svg>
          </button>

          <div className="h-4 w-px bg-border-default" />

          <button
            onClick={() => scrollToPage(activePage - 1)}
            disabled={activePage <= 1}
            className="cursor-pointer rounded p-1 text-text-secondary transition-colors hover:bg-[#2a2a2a] hover:text-text-primary disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <div className="flex items-center gap-1">
            <input
              value={pageInputValue}
              onChange={(e) => setPageInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePageInputSubmit()}
              onBlur={handlePageInputSubmit}
              className="w-8 rounded border border-border-default bg-[#232323] px-1 py-0.5 text-center font-mono text-[11px] text-text-primary outline-none focus:border-text-secondary"
            />
            <span className="font-mono text-[11px] text-text-faint">/</span>
            <span className="font-mono text-[11px] text-text-secondary">
              {numPages ?? "–"}
            </span>
          </div>
          <button
            onClick={() => scrollToPage(activePage + 1)}
            disabled={!numPages || activePage >= numPages}
            className="cursor-pointer rounded p-1 text-text-secondary transition-colors hover:bg-[#2a2a2a] hover:text-text-primary disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        {/* Right: zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={scale <= ZOOM_STEPS[0]}
            className="cursor-pointer rounded p-1 text-text-secondary transition-colors hover:bg-[#2a2a2a] hover:text-text-primary disabled:cursor-default disabled:opacity-30"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <span className="w-10 text-center font-mono text-[11px] text-text-secondary">
            {pctLabel}
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
            className="cursor-pointer rounded p-1 text-text-secondary transition-colors hover:bg-[#2a2a2a] hover:text-text-primary disabled:cursor-default disabled:opacity-30"
          >
            <ZoomIn className="size-3.5" />
          </button>

          <div className="mx-1.5 h-4 w-px bg-border-default" />

          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="cursor-pointer rounded p-1 text-text-secondary transition-colors hover:bg-[#2a2a2a] hover:text-text-primary"
          >
            <RotateCw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Body: sidebar + pages */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail sidebar */}
        {sidebarOpen && (
          <div
            ref={thumbSidebarRef}
            className="flex w-[140px] shrink-0 flex-col items-center gap-2.5 overflow-y-auto border-r border-border-default bg-[#141414] py-3"
          >
            <Document file={url} loading={null} error={null}>
              {numPages &&
                Array.from({ length: numPages }, (_, i) => {
                  const pg = i + 1;
                  const isActive = pg === activePage;
                  return (
                    <button
                      key={pg}
                      ref={(el) => {
                        thumbRefs.current[pg] = el;
                      }}
                      onClick={() => scrollToPage(pg)}
                      className={`group flex cursor-pointer flex-col items-center gap-1 rounded-md px-1.5 py-1.5 transition-colors ${
                        isActive
                          ? "bg-[#232323]"
                          : "hover:bg-[#1e1e1e]"
                      }`}
                    >
                      <div
                        className={`overflow-hidden rounded-sm shadow-sm ring-1 transition-all ${
                          isActive
                            ? "ring-accent-blue"
                            : "ring-border-default group-hover:ring-text-faint"
                        }`}
                      >
                        <Page
                          pageNumber={pg}
                          scale={THUMB_SCALE}
                          rotate={rotation}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </div>
                      <span
                        className={`font-mono text-[10px] ${
                          isActive ? "text-text-primary" : "text-text-faint"
                        }`}
                      >
                        {pg}
                      </span>
                    </button>
                  );
                })}
            </Document>
          </div>
        )}

        {/* Main PDF pages */}
        <div
          ref={containerRef}
          className="flex flex-1 flex-col items-center overflow-auto bg-[#1e1e1e] py-4"
        >
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-text-faint" />
              </div>
            }
            error={
              <div className="flex h-64 items-center justify-center">
                <span className="font-sans text-[13px] text-red-400">
                  Failed to load PDF
                </span>
              </div>
            }
          >
            {numPages &&
              Array.from({ length: numPages }, (_, i) => (
                <div
                  key={i}
                  data-page={i + 1}
                  ref={(el) => {
                    pageRefs.current[i + 1] = el;
                  }}
                  className="mb-3 shadow-lg last:mb-0"
                >
                  <Page
                    pageNumber={i + 1}
                    scale={scale}
                    rotate={rotation}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </div>
              ))}
          </Document>
        </div>
      </div>
    </div>
  );
}

export default function FileViewer({ file, onClose }) {
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState(null);
  const [text, setText] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState("");
  const [saving, setSaving] = useState(false);

  const isPdf = PDF_TYPES.has(file.type);
  const isText = TEXT_TYPES.has(file.type);

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (isPdf) {
        const result = await getFileUrl(file.id);
        if (result) setUrl(result.url);
      } else if (isText) {
        const content = await getFileText(file.id);
        if (content !== null) {
          setText(content);
          setEditBuffer(content);
        }
        const result = await getFileUrl(file.id);
        if (result) setUrl(result.url);
      } else {
        const result = await getFileUrl(file.id);
        if (result) setUrl(result.url);
      }
      setLoading(false);
    }
    load();
  }, [file.id, isPdf, isText]);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveFileText(file.id, editBuffer);
    if (result.ok) {
      setText(editBuffer);
      setEditing(false);
    }
    setSaving(false);
  };

  const handleDownload = () => {
    if (url) window.open(url, "_blank");
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-[70vw] max-w-[960px] flex-col overflow-hidden rounded-lg border border-border-default bg-bg-primary shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border-default bg-[#141414] px-4">
          <div className="flex items-center gap-2">
            <FileText className="size-3.5 text-text-secondary" />
            <span className="font-sans text-[13px] font-medium text-text-primary">
              {file.name}
            </span>
            {file.size && (
              <span className="font-mono text-[10px] text-text-faint">
                {file.size}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isText && !loading && text !== null && (
              <button
                onClick={() => {
                  if (editing) {
                    setEditBuffer(text);
                    setEditing(false);
                  } else {
                    setEditing(true);
                  }
                }}
                className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-text-secondary transition-colors hover:bg-[#232323] hover:text-text-primary"
              >
                {editing ? (
                  <>
                    <Eye className="size-3" />
                    <span className="font-sans text-[11px]">Preview</span>
                  </>
                ) : (
                  <>
                    <Pencil className="size-3" />
                    <span className="font-sans text-[11px]">Edit</span>
                  </>
                )}
              </button>
            )}
            {editing && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex cursor-pointer items-center gap-1 rounded bg-accent-blue px-2 py-1 text-white transition-colors hover:brightness-110 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Save className="size-3" />
                )}
                <span className="font-sans text-[11px] font-medium">Save</span>
              </button>
            )}
            {url && (
              <button
                onClick={handleDownload}
                className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-text-secondary transition-colors hover:bg-[#232323] hover:text-text-primary"
              >
                <Download className="size-3" />
                <span className="font-sans text-[11px]">Download</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="cursor-pointer rounded p-1 text-text-secondary transition-colors hover:bg-[#232323] hover:text-text-primary"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-text-faint" />
          </div>
        ) : isPdf && url ? (
          <PdfViewer url={url} />
        ) : isText && text !== null ? (
          <div className="flex-1 overflow-auto">
            {editing ? (
              <textarea
                value={editBuffer}
                onChange={(e) => setEditBuffer(e.target.value)}
                className="size-full resize-none bg-bg-primary p-6 font-mono text-[13px] leading-6 text-text-primary outline-none"
                spellCheck={false}
              />
            ) : (
              <pre className="whitespace-pre-wrap p-6 font-mono text-[13px] leading-6 text-text-primary">
                {text}
              </pre>
            )}
          </div>
        ) : url ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <FileText className="size-12 text-text-faint" />
            <span className="font-sans text-[13px] text-text-secondary">
              Preview not available for this file type
            </span>
            <button
              onClick={handleDownload}
              className="flex cursor-pointer items-center gap-1.5 rounded bg-accent-blue px-4 py-1.5 font-sans text-[12px] font-medium text-white transition-colors hover:brightness-110"
            >
              <Download className="size-3.5" />
              Download file
            </button>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <span className="font-sans text-[13px] text-text-faint">
              Could not load file
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
