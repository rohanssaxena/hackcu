import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Folder, FileText, File, ChevronRight, ChevronDown,
  List, LayoutGrid, ArrowUpDown, Filter, Plus, Download,
  FolderOpen, ArrowUpRight, Search, BookOpen, Sparkles,
  Check, Loader2, ExternalLink, Upload, Lock,
} from "lucide-react";
import { resolvePathToNode } from "../data/fileSystem";
import { getFiles } from "../services/canvasAPI";
import { useCourse } from "../context/CourseContext";

// ── Helpers ────────────────────────────────────────────────────────────────

function getFileIcon(item) {
  if (item.type === "folder") return Folder;
  if (item.type === "pdf") return FileText;
  return File;
}

function formatTotalSize(items) {
  const files = items.filter((i) => i.type !== "folder");
  const folders = items.filter((i) => i.type === "folder");
  return `${files.length} file${files.length !== 1 ? "s" : ""}, ${folders.length} folder${folders.length !== 1 ? "s" : ""}`;
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function canvasFileType(f) {
  const ct = f["content-type"] || f.mime_class || "";
  if (ct.includes("pdf")) return "pdf";
  if (ct.includes("image")) return "image";
  if (ct.includes("presentation") || (f.filename || "").endsWith(".pptx")) return "pptx";
  if (ct.includes("word") || (f.filename || "").endsWith(".docx")) return "docx";
  return "file";
}

function CanvasFileTypeIcon({ type }) {
  if (type === "pdf")  return <FileText className="size-4 text-red-400" />;
  if (type === "pptx") return <FileText className="size-4 text-orange-400" />;
  if (type === "docx") return <FileText className="size-4 text-blue-400" />;
  return <File className="size-4 text-text-secondary" />;
}

// Ingestion status persisted in localStorage
const INGESTION_KEY = "micro_ingested_files";
function getIngestedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(INGESTION_KEY) || "[]")); }
  catch { return new Set(); }
}
function markIngested(id) {
  const ids = getIngestedIds();
  ids.add(String(id));
  localStorage.setItem(INGESTION_KEY, JSON.stringify([...ids]));
}

// ── Canvas file row ────────────────────────────────────────────────────────

function CanvasFileRow({ file }) {
  const [status, setStatus] = useState(
    getIngestedIds().has(String(file.id)) ? "done" : "idle"
  );
  const type = canvasFileType(file);

  async function handleIngest(e) {
    e.stopPropagation();
    setStatus("loading");
    // TODO: replace with real POST /courses/:id/upload → ingestion pipeline
    await new Promise((r) => setTimeout(r, 1200));
    markIngested(file.id);
    setStatus("done");
  }

  return (
    <div className="group flex items-center rounded py-1.5 px-1 transition-colors hover:bg-[#2a2a2e]">
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <span className="w-5 shrink-0" />
        <CanvasFileTypeIcon type={type} />
        <span className="font-sans text-[13px] text-text-primary truncate">
          {file.display_name || file.filename}
        </span>
      </div>
      <span className="w-20 shrink-0 font-mono text-[11px] text-text-secondary">
        {formatBytes(file.size)}
      </span>
      <span className="w-24 shrink-0 text-right font-sans text-[11px] text-text-secondary">
        {formatDate(file.updated_at)}
      </span>
      <div className="ml-3 shrink-0 w-[110px] flex justify-end">
        {status === "done" ? (
          <span className="flex items-center gap-1 font-sans text-[10px] text-accent-green">
            <Check className="size-3" /> Added to Micro
          </span>
        ) : status === "loading" ? (
          <span className="flex items-center gap-1 font-sans text-[10px] text-text-secondary">
            <Loader2 className="size-3 animate-spin" /> Adding...
          </span>
        ) : (
          <button
            onClick={handleIngest}
            className="flex items-center gap-1 rounded bg-[#1e2a3a] px-2 py-0.5 font-sans text-[10px] text-accent-blue opacity-0 transition-all group-hover:opacity-100 hover:bg-[#253545] cursor-pointer border border-accent-blue/20"
          >
            <Sparkles className="size-3" /> Add to Micro
          </button>
        )}
      </div>
    </div>
  );
}

// ── Canvas course folder ───────────────────────────────────────────────────

function CanvasCourseFolder({ course }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const canvasUrl = `https://canvas.colorado.edu/courses/${course.id}/files`;

  async function handleToggle() {
    setOpen((v) => !v);
    if (!loaded) {
      setLoading(true);
      setError(null);
      try {
        const f = await getFiles(course.id);
        setFiles(f);
      } catch (err) {
        // 401 = files locked by professor, other = actual error
        setError(err.message?.includes("401") ? "locked" : "error");
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    }
  }

  const displayCode = (course.course_code || "").split("-")[0].trim();
  const displayName = course.name.includes(":")
    ? course.name.split(":")[1].trim()
    : course.name;

  const relevant = files.filter((f) => {
    const t = canvasFileType(f);
    if (!["pdf", "pptx", "docx", "file"].includes(t)) return false;
    return (f.display_name || f.filename || "")
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  return (
    <div>
      <div
        onClick={handleToggle}
        className="group flex cursor-pointer items-center rounded py-1.5 transition-colors hover:bg-[#2a2a2e]"
      >
        <div className="flex flex-1 items-center gap-2">
          <button className="flex size-5 shrink-0 items-center justify-center rounded transition-colors hover:bg-[#393939]">
            {open
              ? <ChevronDown className="size-3 text-text-secondary" />
              : <ChevronRight className="size-3 text-text-secondary" />
            }
          </button>
          <BookOpen className="size-4 text-accent-blue shrink-0" />
          <span className="font-mono text-[13px] text-text-primary group-hover:text-white">
            {displayCode}
          </span>
          <span className="font-sans text-[11px] text-text-secondary truncate">
            {displayName}
          </span>
        </div>
        {loaded && !error && (
          <span className="font-mono text-[10px] text-text-faint mr-2">
            {relevant.length} file{relevant.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {open && (
        <div className="ml-7 border-l border-border-default pl-2 pb-2">
          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-2 py-2 pl-1">
              <Loader2 className="size-3.5 animate-spin text-text-secondary" />
              <span className="font-sans text-[12px] text-text-secondary">Loading files...</span>
            </div>
          )}

          {/* Locked by professor */}
          {!loading && error === "locked" && (
            <div className="flex flex-col gap-2 py-2 pl-1">
              <div className="flex items-center gap-2">
                <Lock className="size-3.5 text-text-faint" />
                <span className="font-sans text-[12px] text-text-secondary">
                  Files aren't published for this course.
                </span>
              </div>
              <div className="flex items-center gap-3 pl-5">
                <a
                  href={canvasUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 font-sans text-[11px] text-accent-blue hover:underline cursor-pointer"
                >
                  <ExternalLink className="size-3" /> Open in Canvas
                </a>
                <span className="text-text-separator">·</span>
                <label className="flex items-center gap-1 font-sans text-[11px] text-text-secondary hover:text-text-primary cursor-pointer">
                  <Upload className="size-3" />
                  Upload manually
                  <input
                    type="file"
                    accept=".pdf,.pptx,.docx,.txt,.md"
                    multiple
                    className="hidden"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      // TODO: wire to ingestion pipeline
                      console.log("Files to ingest:", [...e.target.files].map(f => f.name));
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Generic error */}
          {!loading && error === "error" && (
            <div className="flex items-center gap-2 py-2 pl-1">
              <span className="font-sans text-[12px] text-text-secondary">
                Failed to load files.
              </span>
              <a
                href={canvasUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 font-sans text-[11px] text-accent-blue hover:underline"
              >
                <ExternalLink className="size-3" /> Open in Canvas
              </a>
            </div>
          )}

          {/* No files */}
          {!loading && !error && loaded && relevant.length === 0 && (
            <div className="flex flex-col gap-2 py-2 pl-1">
              <span className="font-sans text-[12px] text-text-secondary">
                No files available for this course.
              </span>
              <label className="flex w-fit items-center gap-1 font-sans text-[11px] text-text-secondary hover:text-text-primary cursor-pointer">
                <Upload className="size-3" />
                Upload your own notes
                <input
                  type="file"
                  accept=".pdf,.pptx,.docx,.txt,.md"
                  multiple
                  className="hidden"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    console.log("Files to ingest:", [...e.target.files].map(f => f.name));
                  }}
                />
              </label>
            </div>
          )}

          {/* File list */}
          {!loading && !error && relevant.length > 0 && (
            <>
              {files.length > 5 && (
                <div className="my-1.5 flex items-center gap-2 rounded border border-border-subtle bg-bg-elevated px-2 py-1">
                  <Search className="size-3 shrink-0 text-text-faint" />
                  <input
                    type="text"
                    placeholder="Filter files..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-transparent font-sans text-[11px] text-text-primary outline-none placeholder:text-text-faint"
                  />
                </div>
              )}

              {/* Column headers */}
              <div className="flex items-center py-1 border-b border-border-default">
                <span className="flex-1 font-sans text-[10px] uppercase tracking-wide text-text-faint pl-7">Name</span>
                <span className="w-20 font-sans text-[10px] uppercase tracking-wide text-text-faint">Size</span>
                <span className="w-24 text-right font-sans text-[10px] uppercase tracking-wide text-text-faint">Updated</span>
                <span className="w-[110px]" />
              </div>

              {relevant.map((f) => (
                <CanvasFileRow key={f.id} file={f} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Canvas section ─────────────────────────────────────────────────────────

function CanvasSection() {
  const { courses, activeCourse, loading } = useCourse();

  // Show only the active course if one is selected, otherwise all courses
  const displayCourses = activeCourse ? [activeCourse] : courses;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border-default py-1.5 mb-1">
        <div className="flex items-center gap-2">
          <BookOpen className="size-3.5 text-accent-blue" />
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            Canvas Courses
          </span>
          {!loading && (
            <span className="font-mono text-[10px] text-text-faint">
              {displayCourses.length} course{displayCourses.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="font-sans text-[10px] text-text-faint italic">
          Hover a file → "Add to Micro" to ingest it
        </span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-3">
          <Loader2 className="size-3.5 animate-spin text-text-secondary" />
          <span className="font-sans text-[12px] text-text-secondary">Loading courses...</span>
        </div>
      )}

      {!loading && displayCourses.map((c) => (
        <CanvasCourseFolder key={c.id} course={c} />
      ))}
    </div>
  );
}

// ── Main Workspace ─────────────────────────────────────────────────────────

export default function Workspace() {
  const navigate = useNavigate();
  const [path, setPath] = useState(["College", "Y1S2", "APPM 1360"]);
  const [viewMode, setViewMode] = useState("list");
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [sortField, setSortField] = useState("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [activeTab, setActiveTab] = useState("canvas");

  const currentNode = useMemo(() => resolvePathToNode(path), [path]);
  const items = currentNode.children || [];

  const sortedItems = useMemo(() => {
    const folders = items.filter((i) => i.type === "folder");
    const files = items.filter((i) => i.type !== "folder");
    const sorter = (a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "modified") cmp = (a.modified || "").localeCompare(b.modified || "");
      else if (sortField === "size") cmp = (a.size || "").localeCompare(b.size || "");
      return sortAsc ? cmp : -cmp;
    };
    return [...folders.sort(sorter), ...files.sort(sorter)];
  }, [items, sortField, sortAsc]);

  const breadcrumb = ["My Workspace", ...path];
  const navigateToFolder = (n) => { setPath([...path, n]); setExpandedFolders(new Set()); };
  const navigateToBreadcrumb = (i) => { setPath(i === 0 ? [] : path.slice(0, i)); setExpandedFolders(new Set()); };
  const toggleExpand = (n) => setExpandedFolders((prev) => { const next = new Set(prev); next.has(n) ? next.delete(n) : next.add(n); return next; });
  const toggleSort = (f) => { if (sortField === f) setSortAsc(!sortAsc); else { setSortField(f); setSortAsc(true); } };
  const lastSegment = path.length > 0 ? path[path.length - 1] : "My Workspace";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden px-8 pt-10">
        <h1 className="mb-4 font-sans text-4xl font-semibold text-text-primary">My Workspace</h1>

        {/* Toolbar */}
        <div className="mb-3 flex items-center gap-3">
          <button onClick={() => navigate(`/course/${encodeURIComponent(lastSegment)}`, { state: { path } })} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded bg-white px-3 py-1 text-black transition-colors hover:bg-gray-200">
            <span className="font-sans text-[11px] font-medium">Launch</span>
            <ArrowUpRight className="size-3" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-border-subtle bg-bg-elevated px-2.5 py-1">
            <Search className="size-3.5 shrink-0 text-text-faint" />
            <input type="text" placeholder="Search files..." className="w-full bg-transparent font-sans text-[11px] text-text-primary outline-none placeholder:text-text-faint" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded border border-border-subtle">
              <button onClick={() => setViewMode("list")} className={`cursor-pointer p-1.5 transition-colors ${viewMode === "list" ? "bg-[#393939] text-text-primary" : "text-text-secondary hover:bg-[#2e2e2e] hover:text-text-primary"}`}><List className="size-3.5" /></button>
              <button onClick={() => setViewMode("grid")} className={`cursor-pointer p-1.5 transition-colors ${viewMode === "grid" ? "bg-[#393939] text-text-primary" : "text-text-secondary hover:bg-[#2e2e2e] hover:text-text-primary"}`}><LayoutGrid className="size-3.5" /></button>
            </div>
            <button className="flex cursor-pointer items-center gap-1.5 rounded border border-border-subtle px-2 py-1 text-text-secondary transition-colors hover:bg-[#2e2e2e] hover:text-text-primary"><ArrowUpDown className="size-3" /><span className="font-sans text-[11px]">Sort</span></button>
            <button className="flex cursor-pointer items-center gap-1.5 rounded border border-border-subtle px-2 py-1 text-text-secondary transition-colors hover:bg-[#2e2e2e] hover:text-text-primary"><Filter className="size-3" /><span className="font-sans text-[11px]">Filter</span></button>
            <button className="flex cursor-pointer items-center gap-1.5 rounded bg-accent-blue px-3 py-1 text-white transition-colors hover:brightness-110"><Plus className="size-3" /><span className="font-sans text-[11px] font-medium">New file</span></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-3 flex items-center gap-0 border-b border-border-default">
          {[{ id: "canvas", label: "Canvas Files", icon: BookOpen }, { id: "local", label: "Local Files", icon: Folder }].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`flex items-center gap-1.5 px-4 py-2 font-sans text-[12px] cursor-pointer transition-colors border-b-2 -mb-px ${activeTab === id ? "border-accent-blue text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
              <Icon className="size-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "canvas" && <CanvasSection />}
          {activeTab === "local" && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {breadcrumb.map((seg, i) => (
                    <div key={i} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="size-3 text-text-faint" />}
                      <button onClick={() => navigateToBreadcrumb(i)} className={`cursor-pointer font-sans text-[11px] transition-colors hover:text-text-primary ${i === breadcrumb.length - 1 ? "font-medium text-text-primary" : "text-text-secondary"}`}>{seg}</button>
                    </div>
                  ))}
                  <span className="ml-3 font-sans text-[11px] text-text-faint">{items.length} items · 42.8 MB</span>
                </div>
                <span className="font-sans text-[11px] text-text-faint">Last modified: 30 minutes ago</span>
              </div>
              {viewMode === "list" ? (
                <div className="flex flex-col">
                  <div className="flex items-center border-b border-border-default py-1.5">
                    <button onClick={() => toggleSort("name")} className="flex flex-1 cursor-pointer items-center gap-1 font-sans text-[11px] font-medium uppercase tracking-wide text-text-faint transition-colors hover:text-text-secondary">Name{sortField === "name" && <ChevronDown className={`size-3 transition-transform ${!sortAsc ? "rotate-180" : ""}`} />}</button>
                    <button onClick={() => toggleSort("size")} className="flex w-20 cursor-pointer items-center gap-1 font-sans text-[11px] font-medium uppercase tracking-wide text-text-faint transition-colors hover:text-text-secondary">Size{sortField === "size" && <ChevronDown className={`size-3 transition-transform ${!sortAsc ? "rotate-180" : ""}`} />}</button>
                    <button onClick={() => toggleSort("modified")} className="flex w-28 cursor-pointer items-center justify-end gap-1 font-sans text-[11px] font-medium uppercase tracking-wide text-text-faint transition-colors hover:text-text-secondary">Modified{sortField === "modified" && <ChevronDown className={`size-3 transition-transform ${!sortAsc ? "rotate-180" : ""}`} />}</button>
                  </div>
                  {sortedItems.map((item) => <FileRow key={item.name} item={item} expanded={expandedFolders.has(item.name)} onToggleExpand={() => toggleExpand(item.name)} onNavigate={() => navigateToFolder(item.name)} onNavigateChild={(p, c) => { setPath([...path, p, c]); setExpandedFolders(new Set()); }} />)}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 pt-2">
                  {sortedItems.map((item) => <FileCard key={item.name} item={item} onNavigate={() => item.type === "folder" && navigateToFolder(item.name)} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex h-[30px] shrink-0 items-center justify-between border-t border-border-default bg-bg-sidebar px-8">
        <span className="font-sans text-[11px] text-text-faint">
          {activeTab === "canvas" ? "Canvas files sync automatically · upload your own notes for locked courses" : `${formatTotalSize(items)} · 42.8 MB total`}
        </span>
        <button className="flex cursor-pointer items-center gap-1.5 font-sans text-[11px] text-text-secondary transition-colors hover:text-text-primary"><Download className="size-3" />Download</button>
      </div>
    </div>
  );
}

// ── Local file components ──────────────────────────────────────────────────

function FileRow({ item, expanded, onToggleExpand, onNavigate, onNavigateChild }) {
  const Icon = getFileIcon(item);
  const isFolder = item.type === "folder";
  return (
    <>
      <div className="group flex cursor-pointer items-center rounded py-1.5 transition-colors hover:bg-[#2a2a2e]" onClick={() => { if (isFolder) onNavigate(); }}>
        <div className="flex flex-1 items-center gap-2">
          {isFolder ? (<button onClick={(e) => { e.stopPropagation(); onToggleExpand(); }} className="flex size-5 cursor-pointer items-center justify-center rounded transition-colors hover:bg-[#393939]">{expanded ? <ChevronDown className="size-3 text-text-secondary" /> : <ChevronRight className="size-3 text-text-secondary" />}</button>) : <span className="w-5" />}
          <Icon className={`size-4 ${isFolder ? "text-text-primary" : item.type === "pdf" ? "text-red-400" : "text-text-secondary"}`} />
          <span className="font-sans text-[13px] leading-[19.5px] text-text-primary group-hover:text-white">{item.name}</span>
        </div>
        <span className="w-20 font-mono text-[11px] text-text-secondary">{item.size || ""}</span>
        <span className="w-28 text-right font-sans text-[11px] text-text-secondary">{item.modified || ""}</span>
      </div>
      {isFolder && expanded && item.children && (
        <div className="ml-7 border-l border-border-default pl-2">
          {item.children.map((child) => {
            const ChildIcon = getFileIcon(child);
            const isChildFolder = child.type === "folder";
            return (
              <div key={child.name} onClick={() => { if (isChildFolder) onNavigateChild(item.name, child.name); }} className={`flex items-center rounded py-1 transition-colors hover:bg-[#2a2a2e] ${isChildFolder ? "cursor-pointer" : ""}`}>
                <div className="flex flex-1 items-center gap-2">
                  <span className="w-5" /><ChildIcon className={`size-4 ${isChildFolder ? "text-text-primary" : child.type === "pdf" ? "text-red-400" : "text-text-secondary"}`} />
                  <span className="font-sans text-[13px] leading-[19.5px] text-text-primary">{child.name}</span>
                </div>
                <span className="w-20 font-mono text-[11px] text-text-secondary">{child.size || ""}</span>
                <span className="w-28 text-right font-sans text-[11px] text-text-secondary">{child.modified || ""}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function FileCard({ item, onNavigate }) {
  const Icon = getFileIcon(item);
  const isFolder = item.type === "folder";
  return (
    <button onClick={onNavigate} className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated p-4 transition-colors hover:border-border-default hover:bg-[#2e2e30] ${!isFolder ? "cursor-default" : ""}`}>
      {isFolder ? <FolderOpen className="size-10 text-accent-blue" /> : <Icon className={`size-10 ${item.type === "pdf" ? "text-red-400" : "text-text-secondary"}`} />}
      <span className="w-full truncate text-center font-sans text-[12px] text-text-primary">{item.name}</span>
      {item.size && <span className="font-mono text-[10px] text-text-faint">{item.size}</span>}
    </button>
  );
}