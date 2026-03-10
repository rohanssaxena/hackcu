import { useState, useCallback } from "react";
import {
  X,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Folder,
  FolderOpen,
} from "lucide-react";
import { supabase, USER_ID } from "../lib/supabase";
import MiniCalendar from "./MiniCalendar";

const EXAM_TYPES = [
  { id: "midterm", label: "Midterm", bg: "bg-amber-500/20", text: "text-amber-400" },
  { id: "final", label: "Final", bg: "bg-red-500/20", text: "text-red-400" },
  { id: "quiz", label: "Quiz", bg: "bg-emerald-500/20", text: "text-emerald-400" },
  { id: "homework", label: "Homework", bg: "bg-accent-blue/20", text: "text-accent-blue" },
];

/** Recursively collect all content node IDs from a node (group or content). */
function collectContentNodeIds(node) {
  if (node.type === "content") return [node.id];
  const kids = node.children || node.nodes || [];
  return kids.flatMap((c) => collectContentNodeIds(c));
}

function ContentSelector({ outline, selectedIds, onToggle }) {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node, depth = 0) => {
    const kids = node.children || node.nodes || [];
    const isGroup = node.type === "group";
    const contentIds = collectContentNodeIds(node);
    const allSelected =
      contentIds.length > 0 &&
      contentIds.every((id) => selectedIds.includes(id));

    const handleClick = () => {
      if (isGroup) {
        if (allSelected) {
          contentIds.forEach((id) => onToggle(id, false));
        } else {
          contentIds.forEach((id) => onToggle(id, true));
        }
      } else {
        onToggle(node.id, !selectedIds.includes(node.id));
      }
    };

    return (
      <div key={node.id} className="flex flex-col">
        <div
          className={`group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-[5px] text-left transition-colors hover:bg-[#1a1a1e] ${
            depth === 0 ? "mt-0.5" : ""
          }`}
        >
          {isGroup && kids.length > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="shrink-0 text-text-faint hover:text-text-secondary"
            >
              {expanded[node.id] !== false ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </button>
          ) : (
            <span className="inline-block size-3.5 shrink-0" />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="flex flex-1 items-center gap-2 text-left"
          >
            <span
              className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                isGroup ? allSelected : selectedIds.includes(node.id)
                  ? "border-accent-blue bg-accent-blue"
                  : "border-border-default bg-transparent"
              }`}
            >
              {(isGroup ? allSelected : selectedIds.includes(node.id)) && (
                <span className="size-1.5 rounded-full bg-white" />
              )}
            </span>
            {isGroup ? (
              expanded[node.id] !== false && kids.length > 0 ? (
                <FolderOpen className="size-3.5 shrink-0 text-amber-400/80" />
              ) : (
                <Folder className="size-3.5 shrink-0 text-amber-400/60" />
              )
            ) : (
              <BookOpen className="size-3.5 shrink-0 text-accent-blue/70" />
            )}
            <span
              className={`truncate font-sans text-[12.5px] leading-[18px] ${
                isGroup
                  ? depth === 0
                    ? "font-semibold text-text-primary"
                    : "font-medium text-text-primary/90"
                  : "text-accent-blue/90"
              }`}
            >
              {node.title || (isGroup ? "Group" : "Content")}
            </span>
          </button>
        </div>
        {isGroup && expanded[node.id] !== false && kids.length > 0 && (
          <div
            className={`ml-[11px] border-l pl-[11px] ${
              depth === 0 ? "border-amber-400/15" : "border-[#222]"
            }`}
          >
            {kids.map((c) => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const roots = outline?.nodes || [];
  return (
    <div className="max-h-[220px] overflow-y-auto rounded border border-[#1e1e1e] bg-[#111] p-2">
      {roots.length === 0 ? (
        <p className="py-4 text-center font-sans text-[12px] text-text-faint">
          No outline. Generate outline first.
        </p>
      ) : (
        roots.map((n) => renderNode(n))
      )}
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
            Discard exam?
          </p>
          <p className="mt-1.5 font-sans text-[13px] text-text-secondary">
            You have unsaved changes. Are you sure you want to discard?
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border-default px-4 py-3">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded px-3 py-1.5 font-sans text-[12px] font-medium text-text-secondary transition-colors hover:bg-[#232323] hover:text-text-primary"
          >
            No, keep editing
          </button>
          <button
            onClick={onConfirm}
            className="cursor-pointer rounded bg-red-500/20 px-3 py-1.5 font-sans text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/30"
          >
            Yes, discard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddExamModal({
  folderId,
  folderName,
  outline,
  onClose,
  onSaved,
  editExam = null,
}) {
  const isEdit = !!editExam;
  const [title, setTitle] = useState(editExam?.title ?? "");
  const [examDate, setExamDate] = useState(
    editExam?.exam_date ? editExam.exam_date.slice(0, 10) : ""
  );
  const [startDate, setStartDate] = useState(
    editExam?.start_date ? editExam.start_date.slice(0, 10) : ""
  );
  const [showEndDate, setShowEndDate] = useState(!!editExam?.end_date);
  const [endDate, setEndDate] = useState(
    editExam?.end_date ? editExam.end_date.slice(0, 10) : ""
  );
  const [startTime, setStartTime] = useState(
    editExam?.start_time ? String(editExam.start_time).slice(0, 5) : ""
  );
  const [endTime, setEndTime] = useState(
    editExam?.end_time ? String(editExam.end_time).slice(0, 5) : ""
  );
  const [examType, setExamType] = useState(editExam?.exam_type ?? "midterm");
  const [contentIds, setContentIds] = useState(editExam?.content ?? []);
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const initialValues = {
    title: editExam?.title ?? "",
    examDate: editExam?.exam_date?.slice(0, 10) ?? "",
    startDate: editExam?.start_date?.slice(0, 10) ?? "",
    endDate: editExam?.end_date?.slice(0, 10) ?? "",
    startTime: editExam?.start_time ? String(editExam.start_time).slice(0, 5) : "",
    endTime: editExam?.end_time ? String(editExam.end_time).slice(0, 5) : "",
    examType: editExam?.exam_type ?? "midterm",
    contentIds: editExam?.content ?? [],
  };

  const hasChanges = useCallback(() => {
    return (
      title !== initialValues.title ||
      examDate !== initialValues.examDate ||
      startDate !== initialValues.startDate ||
      endDate !== initialValues.endDate ||
      startTime !== initialValues.startTime ||
      endTime !== initialValues.endTime ||
      examType !== initialValues.examType ||
      JSON.stringify([...contentIds].sort()) !==
        JSON.stringify([...initialValues.contentIds].sort())
    );
  }, [
    title,
    examDate,
    startDate,
    endDate,
    startTime,
    endTime,
    examType,
    contentIds,
  ]);

  const handleToggleContent = (id, selected) => {
    setContentIds((prev) => {
      if (selected) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  const attemptClose = () => {
    if (hasChanges()) {
      setShowConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Exam name is required");
      return;
    }
    if (!examDate) {
      setError("Exam date is required");
      return;
    }
    if (!startDate) {
      setError("Start date is required");
      return;
    }
    if (showEndDate && !endDate) {
      setError("End date is required when enabled");
      return;
    }
    if (!startTime) {
      setError("Start time is required");
      return;
    }
    if (!endTime) {
      setError("End time is required");
      return;
    }
    if (contentIds.length === 0) {
      setError("Select at least one content node");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const examTimestamp = new Date(`${examDate}T00:00:00`).toISOString();
      const payload = {
        user_id: USER_ID,
        folder_id: folderId,
        title: title.trim(),
        exam_date: examTimestamp,
        start_date: startDate || null,
        end_date: showEndDate ? endDate || null : null,
        start_time: startTime || null,
        end_time: endTime || null,
        exam_type: examType,
        content: contentIds,
      };

      if (isEdit) {
        const { error: updateErr } = await supabase
          .from("exams")
          .update(payload)
          .eq("id", editExam.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from("exams").insert(payload);
        if (insertErr) throw insertErr;
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message || "Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={attemptClose}
      >
        <div
          className="flex max-h-[90vh] w-[520px] flex-col overflow-hidden rounded-xl border border-border-default bg-bg-primary shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
            <h2 className="font-sans text-[17px] font-semibold text-text-primary">
              {isEdit ? "Edit Exam" : "Add Exam"}
            </h2>
            <button
              onClick={attemptClose}
              className="rounded p-1.5 text-text-faint transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-5">
              <div>
                <label className="mb-1.5 block font-sans text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  Exam name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm 2"
                  className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2.5 font-sans text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-sans text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  Exam date
                </label>
                <MiniCalendar
                  value={examDate}
                  onChange={setExamDate}
                />
              </div>

              <div>
                <label className="mb-1.5 block font-sans text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  Start date
                </label>
                <MiniCalendar value={startDate} onChange={setStartDate} />
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showEndDate}
                  onChange={(e) => setShowEndDate(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border-default bg-transparent text-accent-blue focus:ring-accent-blue"
                />
                <span className="font-sans text-[12px] text-text-secondary">
                  Different end date
                </span>
              </label>

              {showEndDate && (
                <div>
                  <label className="mb-1.5 block font-sans text-[11px] font-medium uppercase tracking-wider text-text-muted">
                    End date
                  </label>
                  <MiniCalendar value={endDate} onChange={setEndDate} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-sans text-[11px] font-medium text-text-muted">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 font-sans text-[13px] text-text-primary focus:border-accent-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-sans text-[11px] font-medium text-text-muted">
                    End time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 font-sans text-[13px] text-text-primary focus:border-accent-blue focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block font-sans text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXAM_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setExamType(t.id)}
                      className={`cursor-pointer rounded-full px-3 py-1.5 font-sans text-[12px] font-medium transition-colors ${
                        examType === t.id
                          ? `${t.bg} ${t.text}`
                          : "bg-bg-elevated text-text-faint hover:bg-bg-hover hover:text-text-secondary"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-sans text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  Content on exam
                </label>
                <p className="mb-2 font-sans text-[10px] text-text-faint">
                  Select content nodes. Selecting a group selects all its content.
                </p>
                <ContentSelector
                  outline={outline}
                  selectedIds={contentIds}
                  onToggle={handleToggleContent}
                />
              </div>

              {error && (
                <p className="font-sans text-[12px] text-red-400">{error}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border-default px-5 py-4">
            <button
              onClick={attemptClose}
              className="cursor-pointer rounded-lg px-3 py-1.5 font-sans text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="cursor-pointer rounded-lg bg-white px-4 py-1.5 font-sans text-[12px] font-medium text-black transition-colors hover:bg-gray-200 disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Save Exam"}
            </button>
          </div>
        </div>
      </div>

      {showConfirmDiscard && (
        <ConfirmDiscardDialog
          onCancel={() => setShowConfirmDiscard(false)}
          onConfirm={() => {
            setShowConfirmDiscard(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
