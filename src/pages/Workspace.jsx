import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Folder,
  FileText,
  File,
  ChevronRight,
  ChevronDown,
  List,
  LayoutGrid,
  ArrowUpDown,
  Filter,
  Plus,
  Download,
  FolderOpen,
  FolderPlus,
  ArrowUpRight,
  Search,
  Loader2,
  Upload,
  X,
  MoreHorizontal,
  ExternalLink,
  Pencil,
  Info,
  Trash2,
} from "lucide-react";
import {
  fetchFolderTree,
  resolvePathToNode,
  uploadFiles,
  createFolder,
  downloadFile,
  deleteFile,
  deleteFolder,
  renameFile,
} from "../lib/workspace";
import FileViewer from "../components/FileViewer";
import { useTabs } from "../contexts/TabContext";

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

export default function Workspace() {
  const navigate = useNavigate();
  const { openTab } = useTabs();
  const [tree, setTree] = useState({ name: "My Workspace", children: [] });
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [sortField, setSortField] = useState("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState(null);
  const [toast, setToast] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const refreshTree = () =>
    fetchFolderTree().then((t) => setTree(t));

  useEffect(() => {
    fetchFolderTree().then((t) => {
      setTree(t);
      setLoading(false);
    });
  }, []);

  const handleFileUpload = async (e) => {
    const selected = e.target.files;
    if (!selected?.length) return;
    setUploading(true);
    const result = await uploadFiles(Array.from(selected), path);
    if (result.errors.length) {
      showToast(result.errors[0], true);
    } else {
      showToast(`Uploaded ${result.uploaded} file${result.uploaded > 1 ? "s" : ""}`);
    }
    await refreshTree();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateFolder = async () => {
    const name = newFolderName?.trim();
    if (!name) {
      setNewFolderName(null);
      return;
    }
    const result = await createFolder(name, path);
    if (result.error) {
      showToast(result.error, true);
    }
    setNewFolderName(null);
    await refreshTree();
  };

  const currentNode = useMemo(
    () => resolvePathToNode(tree, path),
    [tree, path],
  );
  const items = currentNode.children || [];

  const sortedItems = useMemo(() => {
    const folders = items.filter((i) => i.type === "folder");
    const files = items.filter((i) => i.type !== "folder");

    const sorter = (a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "modified")
        cmp = (a.modified || "").localeCompare(b.modified || "");
      else if (sortField === "size")
        cmp = (a.size || "").localeCompare(b.size || "");
      return sortAsc ? cmp : -cmp;
    };

    return [...folders.sort(sorter), ...files.sort(sorter)];
  }, [items, sortField, sortAsc]);

  const breadcrumb = ["My Workspace", ...path];

  const navigateToFolder = (folderName) => {
    setPath([...path, folderName]);
    setExpandedFolders(new Set());
  };

  const navigateToBreadcrumb = (index) => {
    if (index === 0) setPath([]);
    else setPath(path.slice(0, index));
    setExpandedFolders(new Set());
  };

  const toggleExpand = (folderName) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderName)) next.delete(folderName);
      else next.add(folderName);
      return next;
    });
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const lastSegment =
    path.length > 0 ? path[path.length - 1] : "My Workspace";

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="font-sans text-[13px] text-text-faint">
          Loading workspace…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col items-center overflow-hidden pt-10">
        <div className="flex w-full max-w-[880px] flex-1 flex-col overflow-hidden">
        <h1 className="mb-4 font-sans text-4xl font-semibold text-text-primary">
          My Workspace
        </h1>

        {/* Toolbar */}
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={() =>
              currentNode?.id && currentNode?.type === "folder"
                ? openTab(`/course/${currentNode.id}`, lastSegment)
                : null
            }
            disabled={!currentNode?.id || currentNode?.type !== "folder"}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded bg-white px-3 py-1 text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="font-sans text-[11px] font-medium">Launch</span>
            <ArrowUpRight className="size-3" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-border-subtle bg-bg-elevated px-2.5 py-1">
            <Search className="size-3.5 shrink-0 text-text-faint" />
            <input
              type="text"
              placeholder="Search files..."
              className="w-full bg-transparent font-sans text-[11px] text-text-primary outline-none placeholder:text-text-faint"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded border border-border-subtle">
              <button
                onClick={() => setViewMode("list")}
                className={`cursor-pointer p-1.5 transition-colors ${
                  viewMode === "list"
                    ? "bg-[#393939] text-text-primary"
                    : "text-text-secondary hover:bg-[#2e2e2e] hover:text-text-primary"
                }`}
              >
                <List className="size-3.5" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`cursor-pointer p-1.5 transition-colors ${
                  viewMode === "grid"
                    ? "bg-[#393939] text-text-primary"
                    : "text-text-secondary hover:bg-[#2e2e2e] hover:text-text-primary"
                }`}
              >
                <LayoutGrid className="size-3.5" />
              </button>
            </div>

            <button className="flex cursor-pointer items-center gap-1.5 rounded border border-border-subtle px-2 py-1 text-text-secondary transition-colors hover:bg-[#2e2e2e] hover:text-text-primary">
              <ArrowUpDown className="size-3" />
              <span className="font-sans text-[11px]">Sort</span>
            </button>

            <button className="flex cursor-pointer items-center gap-1.5 rounded border border-border-subtle px-2 py-1 text-text-secondary transition-colors hover:bg-[#2e2e2e] hover:text-text-primary">
              <Filter className="size-3" />
              <span className="font-sans text-[11px]">Filter</span>
            </button>

            <button
              onClick={() => setNewFolderName("")}
              className="flex cursor-pointer items-center gap-1.5 rounded border border-border-subtle px-2 py-1 text-text-secondary transition-colors hover:bg-[#2e2e2e] hover:text-text-primary"
            >
              <FolderPlus className="size-3" />
              <span className="font-sans text-[11px]">New folder</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex cursor-pointer items-center gap-1.5 rounded bg-accent-blue px-3 py-1 text-white transition-colors hover:brightness-110 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Upload className="size-3" />
              )}
              <span className="font-sans text-[11px] font-medium">
                {uploading ? "Uploading…" : "Upload"}
              </span>
            </button>
          </div>
        </div>

        {/* Breadcrumb + stats */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {breadcrumb.map((seg, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight className="size-3 text-text-faint" />
                )}
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className={`cursor-pointer font-sans text-[11px] transition-colors hover:text-text-primary ${
                    i === breadcrumb.length - 1
                      ? "font-medium text-text-primary"
                      : "text-text-secondary"
                  }`}
                >
                  {seg}
                </button>
              </div>
            ))}
            <span className="ml-3 font-sans text-[11px] text-text-faint">
              {items.length} items
            </span>
          </div>
        </div>

        {/* File list / grid */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === "list" ? (
            <div className="flex flex-col">
              <div className="flex items-center border-b border-border-default py-1.5">
                <button
                  onClick={() => toggleSort("name")}
                  className="flex flex-1 cursor-pointer items-center gap-1 font-sans text-[11px] font-medium uppercase tracking-wide text-text-faint transition-colors hover:text-text-secondary"
                >
                  Name
                  {sortField === "name" && (
                    <ChevronDown
                      className={`size-3 transition-transform ${!sortAsc ? "rotate-180" : ""}`}
                    />
                  )}
                </button>
                <button
                  onClick={() => toggleSort("size")}
                  className="flex w-20 cursor-pointer items-center gap-1 font-sans text-[11px] font-medium uppercase tracking-wide text-text-faint transition-colors hover:text-text-secondary"
                >
                  Size
                  {sortField === "size" && (
                    <ChevronDown
                      className={`size-3 transition-transform ${!sortAsc ? "rotate-180" : ""}`}
                    />
                  )}
                </button>
                <button
                  onClick={() => toggleSort("modified")}
                  className="flex w-28 cursor-pointer items-center justify-end gap-1 font-sans text-[11px] font-medium uppercase tracking-wide text-text-faint transition-colors hover:text-text-secondary"
                >
                  Modified
                  {sortField === "modified" && (
                    <ChevronDown
                      className={`size-3 transition-transform ${!sortAsc ? "rotate-180" : ""}`}
                    />
                  )}
                </button>
              </div>

              {newFolderName !== null && (
                <div className="flex items-center gap-2 rounded bg-[#1e1e1e] py-1.5">
                  <span className="w-5" />
                  <FolderPlus className="size-4 text-accent-blue" />
                  <input
                    autoFocus
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder();
                      if (e.key === "Escape") setNewFolderName(null);
                    }}
                    onBlur={handleCreateFolder}
                    placeholder="Folder name…"
                    className="flex-1 bg-transparent font-sans text-[13px] text-text-primary outline-none placeholder:text-text-faint"
                  />
                  <button
                    onClick={() => setNewFolderName(null)}
                    className="mr-2 cursor-pointer text-text-faint hover:text-text-primary"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}

              {sortedItems.map((item) => (
                <FileRow
                  key={item.name}
                  item={item}
                  expanded={expandedFolders.has(item.name)}
                  onToggleExpand={() => toggleExpand(item.name)}
                  onNavigate={() => navigateToFolder(item.name)}
                  onNavigateChild={(parentName, childName) => {
                    setPath([...path, parentName, childName]);
                    setExpandedFolders(new Set());
                  }}
                  onFileClick={(file) => setViewingFile(file)}
                  onRefresh={refreshTree}
                  onToast={showToast}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 pt-2">
              {sortedItems.map((item) => (
                <FileCard
                  key={item.name}
                  item={item}
                  onNavigate={() =>
                    item.type === "folder" && navigateToFolder(item.name)
                  }
                  onFileClick={(file) => setViewingFile(file)}
                />
              ))}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="flex h-[30px] shrink-0 items-center justify-between border-t border-border-default bg-bg-sidebar px-8">
        <span className="font-sans text-[11px] text-text-faint">
          {formatTotalSize(items)}
        </span>
        <button className="flex cursor-pointer items-center gap-1.5 font-sans text-[11px] text-text-secondary transition-colors hover:text-text-primary">
          <Download className="size-3" />
          Download
        </button>
      </div>

      {/* File viewer modal */}
      {viewingFile && (
        <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-12 left-1/2 z-50 -translate-x-1/2 rounded-md px-4 py-2 font-sans text-[12px] shadow-lg ${
            toast.isError
              ? "bg-red-500/90 text-white"
              : "bg-accent-green/90 text-black"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function FileContextMenu({ position, item, onClose, onOpen, onRefresh, onToast }) {
  const ref = useRef(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(item.name);
  const renameRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    if (renaming) renameRef.current?.focus();
  }, [renaming]);

  const isFolder = item.type === "folder";

  const handleOpen = () => { onOpen?.(item); onClose(); };

  const handleDownload = async () => {
    if (isFolder || !item.id) return onClose();
    const result = await downloadFile(item.id, item.name);
    if (result.error) onToast?.(result.error, true);
    onClose();
  };

  const handleDelete = async () => {
    if (isFolder) {
      const result = await deleteFolder(item.id);
      if (result.error) { onToast?.(result.error, true); }
      else { onToast?.(`Deleted folder ${result.name}`); onRefresh?.(); }
    } else if (item.id) {
      const result = await deleteFile(item.id);
      if (result.error) { onToast?.(result.error, true); }
      else { onToast?.(`Deleted ${item.name}`); onRefresh?.(); }
    }
    onClose();
  };

  const commitRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === item.name || !item.id) {
      setRenaming(false);
      return;
    }
    const result = await renameFile(item.id, trimmed);
    if (result.error) { onToast?.(result.error, true); }
    else { onToast?.(`Renamed to ${trimmed}`); onRefresh?.(); }
    setRenaming(false);
    onClose();
  };

  if (renaming) {
    return (
      <div
        ref={ref}
        className="fixed z-50 min-w-[200px] rounded-md border border-border-default bg-[#1e1e1e] p-2 shadow-xl"
        style={{ left: position.x, top: position.y }}
      >
        <input
          ref={renameRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") onClose();
          }}
          onBlur={commitRename}
          className="w-full rounded border border-border-default bg-[#111] px-2 py-1 font-sans text-[12px] text-text-primary outline-none focus:border-accent-blue"
        />
      </div>
    );
  }

  const menuItems = [
    { label: "Open", Icon: ExternalLink, action: handleOpen },
    ...(!isFolder ? [{ label: "Download", Icon: Download, action: handleDownload }] : []),
    { divider: true },
    ...(!isFolder ? [{ label: "Rename", Icon: Pencil, action: () => setRenaming(true) }] : []),
    { label: "Delete", Icon: Trash2, danger: true, action: handleDelete },
    { divider: true },
    { label: "More Info", Icon: Info, action: () => { onToast?.(`${item.name} — ${item.size || "folder"}`); onClose(); } },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[150px] rounded-md border border-border-default bg-[#1e1e1e] py-1 shadow-xl"
      style={{ left: position.x, top: position.y }}
    >
      {menuItems.map((mi, i) =>
        mi.divider ? (
          <div key={i} className="mx-2 my-1 h-px bg-border-default" />
        ) : (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); mi.action?.(); }}
            className={`flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 font-sans text-[12px] transition-colors hover:bg-[#2a2a2a] ${
              mi.danger ? "text-red-400" : "text-text-primary"
            }`}
          >
            <mi.Icon className="size-3" />
            {mi.label}
          </button>
        ),
      )}
    </div>
  );
}

function ThreeDotButton({ item, onOpen, onRefresh, onToast }) {
  const [menuPos, setMenuPos] = useState(null);
  const btnRef = useRef(null);

  const openMenu = (e) => {
    e.stopPropagation();
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ x: rect.right - 150, y: rect.bottom + 4 });
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        className="ml-1 shrink-0 cursor-pointer rounded p-0.5 text-transparent transition-colors group-hover:text-text-faint hover:!bg-[#393939] hover:!text-text-primary"
      >
        <MoreHorizontal className="size-3.5" />
      </button>
      {menuPos && (
        <FileContextMenu
          position={menuPos}
          item={item}
          onClose={() => setMenuPos(null)}
          onOpen={onOpen}
          onRefresh={onRefresh}
          onToast={onToast}
        />
      )}
    </>
  );
}

function FileRow({
  item,
  expanded,
  onToggleExpand,
  onNavigate,
  onNavigateChild,
  onFileClick,
  onRefresh,
  onToast,
}) {
  const Icon = getFileIcon(item);
  const isFolder = item.type === "folder";

  return (
    <>
      <div
        className="group flex cursor-pointer items-center rounded py-1.5 transition-colors hover:bg-[#2a2a2e]"
        onClick={() => {
          if (isFolder) onNavigate();
          else onFileClick?.(item);
        }}
      >
        <div className="flex flex-1 items-center gap-2">
          {isFolder ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="flex size-5 cursor-pointer items-center justify-center rounded transition-colors hover:bg-[#393939]"
            >
              {expanded ? (
                <ChevronDown className="size-3 text-text-secondary" />
              ) : (
                <ChevronRight className="size-3 text-text-secondary" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <Icon
            className={`size-4 ${
              isFolder
                ? "text-text-primary"
                : item.type === "pdf"
                  ? "text-red-400"
                  : "text-text-secondary"
            }`}
          />
          <span className="font-sans text-[13px] leading-[19.5px] text-text-primary group-hover:text-white">
            {item.name}
          </span>
          {isFolder && (
            <span className="flex items-center gap-1">
              {item.outline_generated && (
                <span className="rounded bg-accent-blue/20 px-1.5 py-0.5 font-sans text-[9px] font-medium text-accent-blue">
                  outline
                </span>
              )}
              {item.lc_generated && (
                <span className="rounded bg-accent-green/20 px-1.5 py-0.5 font-sans text-[9px] font-medium text-accent-green">
                  Lesson Plan
                </span>
              )}
            </span>
          )}
        </div>
        <span className="w-20 font-mono text-[11px] text-text-secondary">
          {item.size || ""}
        </span>
        <span className="w-28 text-right font-sans text-[11px] text-text-secondary">
          {item.modified || ""}
        </span>
        <ThreeDotButton item={item} onOpen={(f) => onFileClick?.(f)} onRefresh={onRefresh} onToast={onToast} />
      </div>

      {isFolder && expanded && item.children && (
        <div className="ml-7 border-l border-border-default pl-2">
          {item.children.map((child) => {
            const ChildIcon = getFileIcon(child);
            const isChildFolder = child.type === "folder";
            return (
              <div
                key={child.name}
                onClick={() => {
                  if (isChildFolder) onNavigateChild(item.name, child.name);
                  else onFileClick?.(child);
                }}
                className="group flex cursor-pointer items-center rounded py-1 transition-colors hover:bg-[#2a2a2e]"
              >
                <div className="flex flex-1 items-center gap-2">
                  <span className="w-5" />
                  <ChildIcon
                    className={`size-4 ${
                      isChildFolder
                        ? "text-text-primary"
                        : child.type === "pdf"
                          ? "text-red-400"
                          : "text-text-secondary"
                    }`}
                  />
                  <span className="font-sans text-[13px] leading-[19.5px] text-text-primary">
                    {child.name}
                  </span>
                  {isChildFolder && (
                    <span className="flex items-center gap-1">
                      {child.outline_generated && (
                        <span className="rounded bg-accent-blue/20 px-1.5 py-0.5 font-sans text-[9px] font-medium text-accent-blue">
                          outline
                        </span>
                      )}
                      {child.lc_generated && (
                        <span className="rounded bg-accent-green/20 px-1.5 py-0.5 font-sans text-[9px] font-medium text-accent-green">
                          Lesson Plan
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <span className="w-20 font-mono text-[11px] text-text-secondary">
                  {child.size || ""}
                </span>
                <span className="w-28 text-right font-sans text-[11px] text-text-secondary">
                  {child.modified || ""}
                </span>
                <ThreeDotButton item={child} onOpen={(f) => onFileClick?.(f)} onRefresh={onRefresh} onToast={onToast} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function FileCard({ item, onNavigate, onFileClick }) {
  const Icon = getFileIcon(item);
  const isFolder = item.type === "folder";

  return (
    <button
      onClick={() => {
        if (isFolder) onNavigate();
        else onFileClick?.(item);
      }}
      className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated p-4 transition-colors hover:border-border-default hover:bg-[#2e2e30]"
    >
      {isFolder ? (
        <FolderOpen className="size-10 text-accent-blue" />
      ) : (
        <Icon
          className={`size-10 ${
            item.type === "pdf" ? "text-red-400" : "text-text-secondary"
          }`}
        />
      )}
      <span className="w-full truncate text-center font-sans text-[12px] text-text-primary">
        {item.name}
      </span>
      {isFolder && (item.outline_generated || item.lc_generated) && (
        <span className="flex flex-wrap justify-center gap-1">
          {item.outline_generated && (
            <span className="rounded bg-accent-blue/20 px-1.5 py-0.5 font-sans text-[9px] font-medium text-accent-blue">
              outline
            </span>
          )}
          {item.lc_generated && (
            <span className="rounded bg-accent-green/20 px-1.5 py-0.5 font-sans text-[9px] font-medium text-accent-green">
              Lesson Plan
            </span>
          )}
        </span>
      )}
      {item.size && (
        <span className="font-mono text-[10px] text-text-faint">
          {item.size}
        </span>
      )}
    </button>
  );
}
