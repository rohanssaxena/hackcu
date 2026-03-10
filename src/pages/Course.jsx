import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  Folder,
  FileText,
  File,
  ChevronRight,
  ChevronDown,
  Play,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Map,
  ListOrdered,
  MoreHorizontal,
  Download,
  ExternalLink,
  Pencil,
  Info,
  Trash2,
  ArrowUpDown,
  Filter,
  RotateCw,
  Plus,
  Zap,
  ClipboardList,
  MessageCircle,
  MessageSquare,
  X,
  MoreVertical,
} from "lucide-react";
import { supabase, USER_ID } from "../lib/supabase";
import FileViewer from "../components/FileViewer";
import OutlineModal from "../components/OutlineModal";
import AddExamModal from "../components/AddExamModal";
import DrillGenerationModal from "../components/DrillGenerationModal";
import OutlineView from "../components/OutlineView";
import { getOutline, getEstimatedTimeForContentNode, requestDrillGeneration } from "../lib/outlineService";
import { getProgressForFolder } from "../lib/checkpointProgressService";

const TABS = ["Overview", "Files", "About"];

/** Collect all objective IDs from outline tree (content nodes only). */
function collectObjectiveIds(nodes) {
  if (!nodes || !Array.isArray(nodes)) return [];
  let ids = [];
  for (const node of nodes) {
    if (node.type === "content" && node.objectives?.length) {
      for (const o of node.objectives) if (o.id) ids.push(o.id);
    }
    const children = node.children ?? node.nodes ?? [];
    if (children.length) ids.push(...collectObjectiveIds(children));
  }
  return ids;
}

export default function Course() {
  const { folderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const filePath = location.state?.path || [];
  const [activeTab, setActiveTab] = useState("Overview");

  const [folder, setFolder] = useState(null);
  const [topics, setTopics] = useState([]);
  const [mastery, setMastery] = useState({});
  const [studySets, setStudySets] = useState([]);
  const [exam, setExam] = useState(null);
  const [activities, setActivities] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [outlineGenerated, setOutlineGenerated] = useState(false);
  const [lcGenerated, setLcGenerated] = useState(false);
  const [showOutlineModal, setShowOutlineModal] = useState(false);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [showFolderPopup, setShowFolderPopup] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [editExam, setEditExam] = useState(null);
  const [howImDoing, setHowImDoing] = useState(null);
  const [modalInitialStage, setModalInitialStage] = useState(0);
  const [outlineData, setOutlineData] = useState(null);
  const [progressMap, setProgressMap] = useState({});
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState(null);
  const [showDrillModal, setShowDrillModal] = useState(false);

  useEffect(() => {
    if (!folderId) {
      setLoading(false);
      return;
    }

    async function load() {
      const { data: folderRow, error: folderErr } = await supabase
        .from("folders")
        .select("*")
        .eq("id", folderId)
        .eq("user_id", USER_ID)
        .single();

      if (folderErr || !folderRow) {
        setLoading(false);
        return;
      }
      setFolder(folderRow);
      setOutlineGenerated(!!folderRow.outline_generated);
      setLcGenerated(!!folderRow.lc_generated);

      if (folderRow.outline_generated) {
        getOutline(folderId).then((data) => {
          if (data) setOutlineData(data);
        });
        getProgressForFolder(folderId).then(setProgressMap);
      }

      const [filesRes, examRes, coursesRes] = await Promise.all([
        supabase
          .from("course_files")
          .select("*")
          .eq("folder_id", folderId)
          .order("filename"),
        supabase
          .from("exams")
          .select("*")
          .eq("folder_id", folderId)
          .gte("exam_date", new Date().toISOString())
          .order("exam_date")
          .limit(1),
        supabase.from("courses").select("id").eq("folder_id", folderId),
      ]);

      if (examRes.data?.[0]) setExam(examRes.data[0]);

      const { data: sets } = await supabase
        .from("study_sets")
        .select("id, title, type, card_count, mastered_count")
        .eq("folder_id", folderId)
        .eq("user_id", USER_ID);
      const setList = sets || [];
      const setIds = setList.map((s) => s.id);
      let pinnedIds = new Set();
      if (setIds.length > 0) {
        const { data: pinnedFavs } = await supabase
          .from("favorites")
          .select("target_id")
          .eq("user_id", USER_ID)
          .eq("target_type", "study_set")
          .in("target_id", setIds);
        pinnedIds = new Set((pinnedFavs || []).map((f) => f.target_id));
      }
      const withPinned = setList.map((s) => ({
        ...s,
        cards: s.card_count || 0,
        mastered: s.mastered_count || 0,
        pinned: pinnedIds.has(s.id),
      }));
      setStudySets(withPinned);

      if (filesRes.data?.length) {
        const fileTree = filesRes.data.map((f) => ({
          id: f.id,
          name: f.filename,
          type: mapFileType(f.file_type),
          size: formatBytes(f.file_size_bytes),
          modified: formatRelative(f.uploaded_at),
        }));
        setFiles(fileTree);
      }

      setLoading(false);
    }
    load();
  }, [folderId]);

  async function refetchStudySets() {
    if (!folderId) return;
    const { data: sets } = await supabase
      .from("study_sets")
      .select("id, title, type, card_count, mastered_count")
      .eq("folder_id", folderId)
      .eq("user_id", USER_ID);
    const setList = sets || [];
    const setIds = setList.map((s) => s.id);
    let pinnedIds = new Set();
    if (setIds.length > 0) {
      const { data: pinnedFavs } = await supabase
        .from("favorites")
        .select("target_id")
        .eq("user_id", USER_ID)
        .eq("target_type", "study_set")
        .in("target_id", setIds);
      pinnedIds = new Set((pinnedFavs || []).map((f) => f.target_id));
    }
    const withPinned = setList.map((s) => ({
      ...s,
      cards: s.card_count || 0,
      mastered: s.mastered_count || 0,
      pinned: pinnedIds.has(s.id),
    }));
    setStudySets(withPinned);
  }

  function handleOpenDrillModal() {
    setDrillError(null);
    setShowDrillModal(true);
  }

  function handleDrillComplete() {
    refetchStudySets();
  }

  function handleStartDrill(setId) {
    navigate(`/course/${folderId}/drill/${setId}`);
  }

  async function handleRenameSet(setId, newTitle) {
    if (!newTitle?.trim()) return;
    const { error } = await supabase
      .from("study_sets")
      .update({ title: newTitle.trim() })
      .eq("id", setId);
    if (!error) await refetchStudySets();
  }

  async function handleDeleteSet(setId) {
    if (!confirm("Delete this set? This cannot be undone.")) return;
    const { error } = await supabase.from("study_sets").delete().eq("id", setId);
    if (!error) await refetchStudySets();
  }


  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="font-sans text-[13px] text-text-faint">
          Loading course…
        </span>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8">
        <span className="font-sans text-[13px] text-text-secondary">
          Course not found or you don’t have access.
        </span>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded bg-[#2a2a2a] px-3 py-1.5 font-sans text-[12px] text-text-primary hover:bg-[#333]"
        >
          Go back
        </button>
      </div>
    );
  }

  const title = folder?.name || "";
  const pathLabel = filePath.length ? filePath.join(" / ") : title;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-8 pt-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-3 flex w-fit cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-text-secondary transition-colors hover:bg-[#232323] hover:text-text-primary"
      >
        <ArrowLeft className="size-3.5" />
        <span className="font-sans text-[12px]">Back</span>
      </button>

      <h1 className="mb-1 font-sans text-4xl font-semibold text-text-primary">
        {title}
      </h1>
      <div className="mb-6 flex items-center gap-1 font-sans text-[12px] text-text-secondary">
        {["My Workspace", ...(filePath || [])].map((seg, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3 text-text-faint" />}
            <span>{seg}</span>
          </span>
        ))}
      </div>

      {/* Sub-nav — text + underline */}
      <div className="mb-6 flex items-center border-b border-border-default">
        <div className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative cursor-pointer pb-2.5 font-sans text-[13px] transition-colors ${
                activeTab === tab
                  ? "font-medium text-text-primary"
                  : "text-text-faint hover:text-text-secondary"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-text-primary" />
              )}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 pb-2">
          <button
            onClick={() => {
              if (!outlineGenerated) {
                setModalInitialStage(0);
                setShowOutlineModal(true);
              }
            }}
            disabled={outlineGenerated}
            className={`flex items-center gap-1.5 rounded px-3 py-1 font-sans text-[11px] font-medium transition-colors ${
              outlineGenerated
                ? "cursor-default bg-[#2a2a2a] text-text-faint"
                : "cursor-pointer bg-white text-black hover:bg-gray-200"
            }`}
          >
            {outlineGenerated ? "Outline Generated" : "Generate Outline"}
          </button>
          {outlineGenerated && (
            <>
              <button
                onClick={() => {
                  if (!lcGenerated) {
                    setModalInitialStage(3);
                    setShowOutlineModal(true);
                  }
                }}
                disabled={lcGenerated}
                className={`flex items-center gap-1.5 rounded px-3 py-1 font-sans text-[11px] font-medium transition-colors ${
                  lcGenerated
                    ? "cursor-default bg-[#2a2a2a] text-text-faint"
                    : "cursor-pointer bg-white text-black hover:bg-gray-200"
                }`}
              >
                {lcGenerated ? "Content Generated" : "Generate Learning Content"}
              </button>
              <button
                onClick={() => setShowInfoPopup(true)}
                className="rounded p-1 text-text-faint transition-colors hover:bg-[#232323] hover:text-text-primary"
                title="Folder info"
              >
                <Info className="size-3.5" />
              </button>
              <button
                onClick={() => setShowFolderPopup(true)}
                className="rounded p-1 text-text-faint transition-colors hover:bg-[#232323] hover:text-text-primary"
                title="Files"
              >
                <Folder className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {showOutlineModal && folderId && (
        <OutlineModal
          folderId={folderId}
          folderName={folder?.name || ""}
          initialStage={modalInitialStage}
          onClose={() => setShowOutlineModal(false)}
          onComplete={() => {
            if (modalInitialStage === 0) {
              setOutlineGenerated(true);
              setLcGenerated(true);
              getOutline(folderId).then((data) => {
                if (data) setOutlineData(data);
              });
            } else {
              setLcGenerated(true);
            }
          }}
        />
      )}

      {showFolderPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowFolderPopup(false)}
        >
          <div
            className="flex max-h-[80vh] w-[480px] flex-col rounded-lg border border-border-default bg-bg-primary shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
              <span className="font-sans text-[14px] font-medium text-text-primary">
                Files in {folder?.name}
              </span>
              <button
                onClick={() => setShowFolderPopup(false)}
                className="rounded p-1 text-text-faint hover:text-text-primary"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {files.length === 0 ? (
                <p className="font-sans text-[12px] text-text-faint">
                  No files in this folder
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 rounded px-2 py-1.5 font-sans text-[12px] text-text-primary"
                    >
                      <File className="size-3.5 text-text-faint" />
                      {f.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showInfoPopup && folder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowInfoPopup(false)}
        >
          <div
            className="w-[360px] rounded-lg border border-border-default bg-bg-primary p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <span className="font-sans text-[14px] font-medium text-text-primary">
                Folder info
              </span>
              <button
                onClick={() => setShowInfoPopup(false)}
                className="rounded p-1 text-text-faint hover:text-text-primary"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-2 font-sans text-[12px]">
              <span className="text-text-secondary">
                <strong className="text-text-primary">Name:</strong> {folder.name}
              </span>
              <span className="text-text-secondary">
                <strong className="text-text-primary">Outline:</strong>{" "}
                {outlineGenerated ? "Generated" : "Not generated"}
              </span>
              <span className="text-text-secondary">
                <strong className="text-text-primary">Learning content:</strong>{" "}
                {lcGenerated ? "Generated" : "Not generated"}
              </span>
            </div>
          </div>
        </div>
      )}

      {showAddExamModal && folderId && (
        <AddExamModal
          folderId={folderId}
          folderName={folder?.name || ""}
          outline={outlineData}
          editExam={editExam}
          onClose={() => {
            setShowAddExamModal(false);
            setEditExam(null);
          }}
          onSaved={async () => {
            const { data } = await supabase
              .from("exams")
              .select("*")
              .eq("folder_id", folderId)
              .gte("exam_date", new Date().toISOString())
              .order("exam_date")
              .limit(1);
            if (data?.[0]) setExam(data[0]);
          }}
        />
      )}

      {showDrillModal && folderId && (
        <DrillGenerationModal
          folderId={folderId}
          userId={USER_ID}
          outline={outlineData}
          onClose={() => setShowDrillModal(false)}
          onComplete={handleDrillComplete}
          onStartDrill={(setId) => {
            setShowDrillModal(false);
            navigate(`/course/${folderId}/drill/${setId}`);
          }}
        />
      )}

      {/* Tab content + side cards */}
      <div className="flex flex-1 gap-10 pb-8">
        <div className="flex min-w-0 flex-1 flex-col">
          {activeTab === "Overview" ? (
            <OverviewTab
              topics={topics}
              mastery={mastery}
              folder={folder}
              outline={outlineData}
              progressMap={progressMap}
              onOpenDrillModal={handleOpenDrillModal}
              drillError={drillError}
            />
          ) : activeTab === "Files" ? (
            <FilesTab files={files} />
          ) : activeTab === "About" ? (
            <AboutTab folder={folder} />
          ) : null}
        </div>

        <div className="flex w-[260px] shrink-0 flex-col gap-4">
          <SidePanelCards
            exam={exam}
            studySets={studySets}
            progressMap={progressMap}
            mastery={mastery}
            howImDoing={howImDoing}
            onAddExam={() => {
              setEditExam(null);
              setShowAddExamModal(true);
            }}
            onEditExam={(e) => {
              setEditExam(e);
              setShowAddExamModal(true);
            }}
            onDeleteExam={async (e) => {
              if (!confirm("Delete this exam?")) return;
              await supabase.from("exams").delete().eq("id", e.id);
              setExam(null);
            }}
            onReloadHowImDoing={() => {
              const placeholders = [
                "You're making steady progress. Keep reviewing key concepts and practicing with flashcards to stay on track for your upcoming exam.",
                "Your study habits are paying off. Focus on weak areas and maintain consistency for best results.",
                "Good momentum! Consider spacing out your reviews to improve long-term retention.",
              ];
              setHowImDoing(
                placeholders[Math.floor(Math.random() * placeholders.length)]
              );
            }}
            onOpenDrillModal={handleOpenDrillModal}
            onSelectSet={handleStartDrill}
            onRenameSet={handleRenameSet}
            onDeleteSet={handleDeleteSet}
            drillError={drillError}
          />
        </div>
      </div>
    </div>
  );
}

/* ---- Helpers ---- */

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function mapFileType(dbType) {
  if (dbType === "pdf") return "pdf";
  if (["md", "docx", "txt"].includes(dbType)) return "doc";
  return "file";
}

/* ---- Side Panel Cards ---- */

const SET_TYPE_ICONS = {
  drill: Zap,
  flashcards: Layers,
  cheat_sheet: FileText,
  practice_exam: ClipboardList,
  socratic: MessageCircle,
  debate: MessageSquare,
};

function SidePanelCards({
  exam,
  studySets,
  progressMap = {},
  mastery = {},
  onAddExam,
  onEditExam,
  onDeleteExam,
  onReloadHowImDoing,
  howImDoing,
  onOpenDrillModal,
  onSelectSet,
  onRenameSet,
  onDeleteSet,
  drillError = null,
}) {
  const [openSetMenuId, setOpenSetMenuId] = useState(null);
  const contentIds = exam?.content || [];
  const topicIds = exam?.scope_topic_ids || [];
  const useContent = contentIds.length > 0;
  const useTopics = !useContent && topicIds.length > 0;
  const readiness = useContent
    ? Math.round(
        contentIds.reduce((s, id) => {
          const p = progressMap[id];
          return s + (p?.percent ?? 0);
        }, 0) / contentIds.length,
      )
    : useTopics
      ? Math.round(
          (topicIds.reduce((s, tid) => s + (mastery[tid]?.p_know || 0), 0) /
            topicIds.length) *
            100,
        )
      : 0;

  const daysAway = exam
    ? Math.ceil(
        (new Date(exam.exam_date) - Date.now()) / (1000 * 60 * 60 * 24),
      )
    : null;

  const defaultHowImDoing =
    "You're making steady progress. Keep reviewing key concepts and practicing with flashcards to stay on track for your upcoming exam.";
  const text = howImDoing ?? defaultHowImDoing;

  return (
    <div className="flex flex-col gap-4">
      {/* Upcoming Exam card */}
      <div className="flex flex-col gap-2 rounded border border-[#393939] px-4 py-3">
        <div className="flex items-center justify-between border-b border-border-default pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-text-muted" />
            <span className="font-sans text-[11px] font-medium text-text-muted">
              Upcoming Exam
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAddExam?.()}
              className="rounded p-1 text-text-faint transition-colors hover:bg-[#2e2e30] hover:text-text-primary"
              title="Add exam"
            >
              <Plus className="size-3.5" />
            </button>
            {exam && (
              <>
                <button
                  onClick={() => onEditExam?.(exam)}
                  className="rounded p-1 text-text-faint transition-colors hover:bg-[#2e2e30] hover:text-text-primary"
                  title="Edit exam"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => onDeleteExam?.(exam)}
                  className="rounded p-1 text-text-faint transition-colors hover:bg-red-500/20 hover:text-red-400"
                  title="Delete exam"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
        {exam ? (
          <div className="group/card -mx-2 cursor-pointer rounded-md px-2 py-2 transition-colors hover:bg-[#2e2e30]">
            <div className="relative">
              <div className="absolute right-0 top-0 flex justify-center rounded p-0.5 opacity-0 transition-opacity group-hover/card:opacity-100">
                <ArrowUpRight className="size-4 text-text-secondary transition-colors group-hover/card:text-text-primary" />
              </div>
              <p className="font-sans text-[13px] font-medium leading-[18px] text-text-primary">
                {exam.title}
              </p>
              <p className="mt-0.5 font-sans text-[11px] leading-[16px] text-text-secondary">
                {daysAway !== null &&
                  `${daysAway} day${daysAway !== 1 ? "s" : ""} until`}{" "}
                {new Date(exam.exam_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[10px] text-text-secondary">
                    Content progress
                  </span>
                  <span className="font-mono text-[10px] text-accent-green">
                    {readiness}%
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-bg-elevated">
                  <div
                    className="h-full rounded-full bg-accent-green"
                    style={{ width: `${readiness}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6">
            <Calendar className="size-8 text-text-faint/50" />
            <p className="text-center font-sans text-[12px] text-text-secondary">
              No exam scheduled. Take a breather!
            </p>
          </div>
        )}
      </div>

      {/* How I'm Doing card */}
      <div className="flex flex-col gap-2 rounded border border-[#393939] px-4 py-3">
        <div className="flex items-center justify-between border-b border-border-default pb-2">
          <span className="font-sans text-[11px] font-medium text-text-muted">
            How I&apos;m Doing
          </span>
          <button
            onClick={() => onReloadHowImDoing?.()}
            className="rounded p-1 text-text-faint transition-colors hover:bg-[#2e2e30] hover:text-text-primary"
            title="Reload"
          >
            <RotateCw className="size-3.5" />
          </button>
        </div>
        <div className="group/card -mx-2 cursor-pointer rounded-md px-2 py-2 transition-colors hover:bg-[#2e2e30]">
          <div className="relative">
            <div className="absolute right-0 top-0 flex justify-center rounded p-0.5 opacity-0 transition-opacity group-hover/card:opacity-100">
              <ArrowUpRight className="size-4 text-text-secondary transition-colors group-hover/card:text-text-primary" />
            </div>
            <p className="font-sans text-[12px] leading-[18px] text-text-secondary">
              {text}
            </p>
          </div>
        </div>
      </div>

      {/* Sets card */}
      <div className="flex flex-col gap-2 rounded border border-[#393939] px-4 py-3">
        <div className="flex items-center gap-2 border-b border-border-default pb-2">
          <Layers className="size-3.5 text-text-muted" />
          <span className="font-sans text-[11px] font-medium text-text-muted">
            Sets
          </span>
        </div>
        {studySets.length > 0 ? (
          studySets.map((set) => {
            const Icon = SET_TYPE_ICONS[set.type] || Layers;
            const totalCards = set.cards ?? set.card_count ?? 0;
            const completed = set.mastered ?? set.mastered_count ?? 0;
            const completionPct = totalCards > 0 ? Math.round((completed / totalCards) * 100) : 0;
            const menuOpen = openSetMenuId === set.id;
            return (
              <div
                key={set.id}
                className="group/set relative flex w-full items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-[#2e2e30]"
              >
                <button
                  type="button"
                  onClick={() => set.type === "drill" && onSelectSet?.(set.id)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                >
                  <Icon className="size-3.5 shrink-0 text-text-faint" />
                  <span className="truncate font-sans text-[12px] font-medium text-text-primary">
                    {set.title}
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-text-faint">
                    {completionPct}%
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenSetMenuId(menuOpen ? null : set.id);
                  }}
                  className="shrink-0 rounded p-1 opacity-0 transition-opacity group-hover/set:opacity-100 hover:bg-[#3a3a3a] hover:opacity-100"
                  title="Set options"
                  aria-label="Set options"
                >
                  <MoreVertical className="size-3.5 text-text-faint" />
                </button>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      aria-hidden
                      onClick={() => setOpenSetMenuId(null)}
                    />
                    <div className="absolute right-0 top-full z-20 mt-0.5 min-w-[120px] rounded-md border border-border-default bg-bg-elevated py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          const newTitle = window.prompt("Rename set", set.title);
                          if (newTitle != null) onRenameSet?.(set.id, newTitle);
                          setOpenSetMenuId(null);
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 font-sans text-[12px] text-text-primary hover:bg-bg-hover"
                      >
                        <Pencil className="size-3" />
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteSet?.(set.id);
                          setOpenSetMenuId(null);
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 font-sans text-[12px] text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="size-3" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6">
            <Layers className="size-8 text-text-faint/50" />
            <p className="text-center font-sans text-[12px] text-text-secondary">
              No sets yet. Create one above!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Overview Tab ---- */

function flattenOutlineNodes(nodes) {
  const out = [];
  for (const n of nodes || []) {
    out.push({ id: n.id, label: n.title, type: n.type });
    if (n.children?.length) out.push(...flattenOutlineNodes(n.children));
    if (n.nodes?.length) out.push(...flattenOutlineNodes(n.nodes));
  }
  return out;
}

function flattenOutlineNodesWithNumbering(nodes, prefix = "") {
  const out = [];
  const kids = nodes || [];
  kids.forEach((n, i) => {
    const num = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
    const item = {
      id: n.id,
      label: n.title || (n.type === "group" ? "Group" : "Section"),
      type: n.type,
      numbering: num,
    };
    out.push(item);
    const children = n.children || n.nodes || [];
    if (children.length) {
      out.push(...flattenOutlineNodesWithNumbering(children, num));
    }
  });
  return out;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 88;
const COL_GAP = 24;
const ROW_GAP = 12;

function buildLayeredLayout(nodes) {
  const columns = [];
  const connectors = [];
  const nextRow = {};

  function walk(nodes, colIndex, numberingPrefix) {
    if (!nodes?.length) return;
    nodes.forEach((n, i) => {
      const num = numberingPrefix ? `${numberingPrefix}.${i + 1}` : `${i + 1}`;
      const children = n.children || n.nodes || [];

      let row;
      if (children.length > 0) {
        walk(children, colIndex + 1, num);
        const childStartRow = nextRow[colIndex + 1] - children.length;
        row = childStartRow + (children.length - 1) / 2;
      } else {
        row = nextRow[colIndex] ?? 0;
        nextRow[colIndex] = row + 1;
      }

      if (!columns[colIndex]) columns[colIndex] = [];
      columns[colIndex].push({
        id: n.id || `n-${colIndex}-${row}`,
        label: n.title || (n.type === "group" ? "Group" : "Section"),
        type: n.type,
        numbering: num,
        col: colIndex,
        row,
      });

      if (children.length > 0) {
        const childStartRow = nextRow[colIndex + 1] - children.length;
        children.forEach((_, ci) => {
          connectors.push({
            from: { col: colIndex, row },
            to: { col: colIndex + 1, row: childStartRow + ci },
          });
        });
        nextRow[colIndex] = Math.max(nextRow[colIndex] ?? 0, nextRow[colIndex + 1]);
      }
    });
  }

  walk(nodes, 0, "");

  return { columns: columns.filter(Boolean), connectors };
}

function LayeredNode({ item, pos, progress, pct, folder, navigate }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="group absolute cursor-pointer rounded-lg border border-border-default bg-bg-elevated p-2 transition-colors hover:border-accent-blue hover:bg-bg-hover"
      style={{
        left: pos.x,
        top: pos.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => item.type === "content" && item.id && folder && navigate(`/course/${folder.id}/learn/${item.id}`)}
    >
      {hovered && (
        <div className="absolute right-1.5 top-1.5 rounded p-0.5 text-text-secondary">
          <ArrowUpRight className="size-3.5" />
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-[10px] font-medium text-text-faint">{item.numbering}</span>
        <div className="line-clamp-2 min-h-[2.4em] font-sans text-[11px] font-medium leading-tight text-text-primary" title={item.label}>
          {item.label}
        </div>
        {progress && progress.total > 0 && (
          <div className="mt-1.5">
            <div className="h-1 w-full overflow-hidden rounded-full bg-bg-chip">
              <div className="h-full rounded-full bg-accent-blue transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LayeredMindmapView({ folder, outlineNodes, progressMap, navigate }) {
  const { columns, connectors } = useMemo(
    () => buildLayeredLayout(outlineNodes || []),
    [outlineNodes]
  );

  const totalCols = columns.length;
  const maxRows = Math.max(...columns.map((c) => c.length), 1);

  const getNodePos = (col, row) => ({
    x: 20 + col * (NODE_WIDTH + COL_GAP),
    y: 20 + row * (NODE_HEIGHT + ROW_GAP),
  });

  const connectorPath = (from, to) => {
    const f = getNodePos(from.col, from.row);
    const t = getNodePos(to.col, to.row);
    const x1 = f.x + NODE_WIDTH;
    const y1 = f.y + NODE_HEIGHT / 2;
    const x2 = t.x;
    const y2 = t.y + NODE_HEIGHT / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const k = 0.5;
    const cpx1 = x1 + dx * k;
    const cpy1 = y1;
    const cpx2 = x2;
    const cpy2 = y2 - dy * k;
    return `M ${x1} ${y1} C ${cpx1} ${cpy1} ${cpx2} ${cpy2} ${x2} ${y2}`;
  };

  const width = totalCols * (NODE_WIDTH + COL_GAP) + 40;
  const height = maxRows * (NODE_HEIGHT + ROW_GAP) + 40;

  return (
    <div className="h-[380px] overflow-auto p-4">
      <div className="relative" style={{ width, height, minWidth: width, minHeight: height }}>
        <svg className="absolute inset-0" width={width} height={height}>
          <g stroke="var(--color-border-default)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {connectors.map((c, i) => (
              <path key={i} d={connectorPath(c.from, c.to)} />
            ))}
          </g>
        </svg>
        {columns.map((col, colIndex) =>
          col.map((item) => {
            const pos = getNodePos(item.col, item.row);
            const progress = item.type === "content" && progressMap[item.id] ? progressMap[item.id] : null;
            const pct = progress?.percent ?? 0;
            return (
              <LayeredNode
                key={`${item.id}-${item.col}-${item.row}`}
                item={item}
                pos={pos}
                progress={progress}
                pct={pct}
                folder={folder}
                navigate={navigate}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

const NODE_PADDING_X = 12;
const ROW_HEIGHT = 44;
const LEVEL_GAP = 24;
const CHAR_WIDTH = 6.2;

function measureLabelWidth(label) {
  return Math.max(48, (label || "").length * CHAR_WIDTH + NODE_PADDING_X * 2);
}

function computeSubtreeWidth(nodes) {
  if (!nodes?.length) return 0;
  return nodes.reduce((sum, n) => {
    const label = n.title || (n.type === "group" ? "Group" : "Section");
    const children = n.children || n.nodes || [];
    const selfW = measureLabelWidth(label);
    const childW = computeSubtreeWidth(children);
    const slot = Math.max(selfW, childW || selfW);
    return sum + slot + (sum > 0 ? LEVEL_GAP : 0);
  }, 0);
}

function buildMindmapNodes(folder, outlineNodes, parentId = "root", level = 1, startX = 0) {
  const nodes = [];
  const roots = outlineNodes || [];
  if (roots.length === 0) return nodes;

  const y = 40 + level * ROW_HEIGHT;
  let accX = startX;

  roots.forEach((n, i) => {
    const id = n.id || `n-${level}-${i}`;
    const label = n.title || (n.type === "group" ? "Group" : "Section");
    const children = n.children || n.nodes || [];
    const selfW = measureLabelWidth(label);
    const childW = computeSubtreeWidth(children);
    const slotW = Math.max(selfW, childW);
    const x = accX + slotW / 2;

    nodes.push({ id, label, x, y, level, parent: parentId });
    if (children.length > 0) {
      const childTotal = computeSubtreeWidth(children);
      const childStart = accX + (slotW - childTotal) / 2;
      nodes.push(...buildMindmapNodes(folder, children, id, level + 1, childStart));
    }
    accX += slotW + LEVEL_GAP;
  });
  return nodes;
}

function OverviewTab({
  topics,
  mastery,
  folder,
  outline,
  progressMap = {},
  onOpenDrillModal,
  drillError = null,
}) {
  const navigate = useNavigate();
  const [mapView, setMapView] = useState("map");
  const mapContainerRef = useRef(null);
  const [mapScale, setMapScale] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const outlineNodes = outline?.nodes || [];

  const mindmapNodes = [];
  const totalChildWidth = outlineNodes?.length ? computeSubtreeWidth(outlineNodes) : 0;
  const rootX = totalChildWidth / 2 + 40;
  const rootY = 40;

  if (folder) {
    mindmapNodes.push({
      id: "root",
      label: folder.name,
      x: rootX,
      y: rootY,
      level: 0,
    });
  }

  const childNodes = buildMindmapNodes(folder, outlineNodes, "root", 1, 20);
  mindmapNodes.push(...childNodes);

  const mapWidth = Math.max(800, totalChildWidth + 120);
  const mapHeight = 380;

  const flatWithNumbering = flattenOutlineNodesWithNumbering(outlineNodes);
  const linearOrder = flatWithNumbering
    .filter((n) => n.type === "content")
    .map((n) => ({ id: n.id, label: n.label, numbering: n.numbering, status: "upcoming" }));

  const nextUp = linearOrder.find((n) => {
    const p = progressMap[n.id];
    if (!p?.total) return true;
    return Math.round((p.completed / p.total) * 100) < 100;
  }) ?? linearOrder[0];
  const [nextUpEstimatedTime, setNextUpEstimatedTime] = useState(0);
  useEffect(() => {
    if (nextUp?.id) {
      getEstimatedTimeForContentNode(nextUp.id).then(setNextUpEstimatedTime);
    } else {
      setNextUpEstimatedTime(0);
    }
  }, [nextUp?.id]);

  const handleMapWheel = useCallback(
    (e) => {
      if (mapView !== "map") return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setMapScale((s) => Math.min(3, Math.max(0.3, s + delta)));
    },
    [mapView]
  );

  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el || mapView !== "map") return;
    el.addEventListener("wheel", handleMapWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleMapWheel);
  }, [mapView, handleMapWheel]);

  const handleMapMouseDown = (e) => {
    if (mapView !== "map" || e.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - mapOffset.x, y: e.clientY - mapOffset.y };
  };

  const handleMapMouseMove = (e) => {
    if (!isPanning) return;
    setMapOffset({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
  };

  const handleMapMouseUp = () => setIsPanning(false);

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (e) => handleMapMouseMove(e);
    const onUp = () => handleMapMouseUp();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanning]);

  const VERTICAL_TRUNK = 24;
  const roundedConnectorPath = (x1, y1, x2, y2) => {
    const branchY = y1 + VERTICAL_TRUNK;
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} L ${x1} ${branchY} L ${midX} ${branchY} L ${midX} ${y2} L ${x2} ${y2}`;
  };

  const nextUpProgress = nextUp?.id ? progressMap[nextUp.id] : null;
  const nextUpPct = nextUpProgress?.total
    ? Math.round((nextUpProgress.completed / nextUpProgress.total) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4">
        {/* Learn */}
        <button
          onClick={() => nextUp && folder && navigate(`/course/${folder.id}/learn/${nextUp.id}`)}
          disabled={!nextUp || !folder}
          className="flex flex-col gap-3 rounded-lg bg-[#212121] px-4 py-3 text-left transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-text-faint">
            Learn
          </span>
          {nextUp ? (
            <>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#3a3a3a] px-2 py-0.5 font-mono text-[10px] text-white">
                  {nextUp.numbering}
                </span>
                <span className="truncate font-sans text-[13px] font-medium text-text-primary">
                  {nextUp.label}
                </span>
              </div>
              <div className="flex items-center gap-2 font-sans text-[11px] text-text-secondary">
                <span className="underline">{nextUpPct}% complete</span>
                <span className="text-text-faint">•</span>
                <span className="underline">
                  {nextUpEstimatedTime > 0 ? `${nextUpEstimatedTime} min` : "—"}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[#333]">
                <div
                  className="h-full rounded-full bg-accent-green"
                  style={{ width: `${nextUpPct}%` }}
                />
              </div>
            </>
          ) : (
            <span className="font-sans text-[12px] text-text-faint">
              No content yet
            </span>
          )}
        </button>

        {/* Dynamic Practice */}
        <button className="flex flex-col items-start gap-2 rounded-lg bg-[#212121] px-4 py-3 text-left transition-colors hover:bg-[#2a2a2a]">
          <Zap className="size-5 text-accent-blue" />
          <span className="font-sans text-[13px] font-medium text-text-primary">
            Dynamic Practice
          </span>
          <span className="font-sans text-[11px] text-text-secondary">
            Adaptive practice based on your progress
          </span>
        </button>

        {/* Create new set */}
        <div className="flex flex-col gap-3 rounded-lg bg-[#212121] px-4 py-3">
          <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-text-faint">
            Create new set
          </span>
          {drillError && (
            <p className="font-sans text-[11px] text-red-400">{drillError}</p>
          )}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: "flashcards", label: "Flashcards", icon: Layers },
              { id: "drill", label: "Drill", icon: Zap },
              { id: "socratic", label: "Socratic", icon: MessageCircle },
              { id: "debate", label: "Debate", icon: MessageSquare },
            ].map((opt, i) => {
              const Icon = opt.icon;
              const colors = [
                "bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30",
                "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30",
                "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30",
                "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30",
              ];
              const isDrill = opt.id === "drill";
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={isDrill ? onOpenDrillModal : undefined}
                  className={`flex flex-col cursor-pointer items-center justify-center gap-2 rounded-md px-2 py-3 font-sans text-[11px] transition-colors ${colors[i % colors.length]}`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="text-center leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mock Exam */}
        <button className="flex flex-col items-start gap-2 rounded-lg bg-[#212121] px-4 py-3 text-left transition-colors hover:bg-[#2a2a2a]">
          <ClipboardList className="size-5 text-accent-blue" />
          <span className="font-sans text-[13px] font-medium text-text-primary">
            Mock Exam
          </span>
          <span className="font-sans text-[11px] text-text-secondary">
            Practice with exam-style questions
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-text-faint">
            Knowledge Map
          </span>
          <div className="flex overflow-hidden rounded border border-border-subtle bg-bg-sidebar">
            <button
              onClick={() => setMapView("map")}
              className={`flex cursor-pointer items-center gap-1 px-2 py-1 font-sans text-[10px] transition-colors ${
                mapView === "map"
                  ? "bg-bg-hover text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Map className="size-3" />
              Map
            </button>
            <button
              onClick={() => setMapView("layered")}
              className={`flex cursor-pointer items-center gap-1 border-l border-border-subtle px-2 py-1 font-sans text-[10px] transition-colors ${
                mapView === "layered"
                  ? "bg-bg-hover text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Layers className="size-3" />
              Layered
            </button>
            <button
              onClick={() => setMapView("linear")}
              className={`flex cursor-pointer items-center gap-1 border-l border-border-subtle px-2 py-1 font-sans text-[10px] transition-colors ${
                mapView === "linear"
                  ? "bg-bg-hover text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <ListOrdered className="size-3" />
              Linear
            </button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-bg-primary">

          {mapView === "map" ? (
            <div
              ref={mapContainerRef}
              className="relative h-[380px] overflow-hidden bg-bg-primary"
              onMouseDown={handleMapMouseDown}
              style={{ cursor: isPanning ? "grabbing" : "grab" }}
            >
              <div
                className="absolute inset-0 origin-top-left"
                style={{
                  transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapScale})`,
                  backgroundImage: "radial-gradient(circle, var(--color-border-subtle) 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              >
                <div className="relative" style={{ width: mapWidth, height: mapHeight }}>
                  <svg className="absolute inset-0 size-full" style={{ overflow: "visible" }}>
                    {mindmapNodes
                      .filter((n) => n.parent)
                      .map((n) => {
                        const parent = mindmapNodes.find((p) => p.id === n.parent);
                        if (!parent) return null;
                        const x1 = parent.x;
                        const y1 = parent.y + 16;
                        const x2 = n.x;
                        const y2 = n.y;
                        return (
                          <path
                            key={`${parent.id}-${n.id}`}
                            d={roundedConnectorPath(x1, y1, x2, y2)}
                            fill="none"
                            stroke="var(--color-border-default)"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        );
                      })}
                  </svg>
                  {mindmapNodes.map((node) => (
                    <div
                      key={node.id}
                      className={`absolute -translate-x-1/2 cursor-pointer rounded-md border px-3 py-1.5 font-sans text-[11px] transition-colors hover:border-accent-blue ${
                        node.level === 0
                          ? "border-accent-blue bg-accent-blue/20 font-medium text-accent-blue"
                          : node.level === 1
                            ? "border-border-default bg-bg-elevated text-text-primary"
                            : "border-border-subtle bg-bg-sidebar text-text-secondary"
                      }`}
                      style={{ left: node.x, top: node.y }}
                    >
                      {node.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : mapView === "layered" ? (
            <LayeredMindmapView
              folder={folder}
              outlineNodes={outlineNodes}
              progressMap={progressMap}
              navigate={navigate}
            />
          ) : outline ? (
            <div className="p-4">
              <OutlineView
                outline={outline}
                progressMap={progressMap}
                showHoverBreadcrumb
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-8">
              <p className="font-sans text-[13px] text-text-faint">No outline generated yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Content Tab ---- */

function RecursiveContentNode({ node, numbering, depth = 0 }) {
  const [open, setOpen] = useState(depth < 1);
  const isGroup = node.type === "group";
  const hasChildren = isGroup && node.children?.length > 0;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-[#2a2a2e]"
      >
        {hasChildren || node.type === "content" ? (
          open ? <ChevronDown className="size-3.5 shrink-0 text-text-faint" /> : <ChevronRight className="size-3.5 shrink-0 text-text-faint" />
        ) : (
          <span className="inline-block size-3.5 shrink-0" />
        )}
        <span className="font-mono text-[10px] text-text-faint">{numbering}</span>
        <span
          className={`flex-1 font-sans text-[13px] ${
            depth === 0
              ? "font-semibold text-text-primary"
              : depth === 1
                ? "font-medium text-text-primary"
                : "text-text-secondary"
          }`}
        >
          {node.title}
        </span>
        {node.type === "content" && node.objectives?.length > 0 && (
          <span className="shrink-0 rounded bg-[#232323] px-1.5 py-0.5 font-mono text-[9px] text-text-faint">
            {node.objectives.length} objective{node.objectives.length !== 1 ? "s" : ""}
          </span>
        )}
      </button>
      {open && (
        <div className={depth === 0 ? "ml-5" : "ml-6 border-l border-[#232323] pl-1"}>
          {node.type === "content" && node.objectives?.length > 0 && (
            <ul className="flex flex-col gap-0.5 px-3 py-1.5">
              {node.objectives.map((o, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-[5px] size-1 shrink-0 rounded-full bg-accent-blue" />
                  <span className="font-sans text-[11px] leading-[16px] text-text-secondary">
                    {o.objective || o}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {hasChildren &&
            node.children.map((child, i) => (
              <RecursiveContentNode
                key={child.id || i}
                node={child}
                numbering={`${numbering}.${i + 1}`}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function ContentTab({ outline }) {
  const roots = outline?.nodes || [];
  if (!roots.length) {
    return (
      <p className="py-12 text-center font-sans text-[13px] text-text-faint">
        No outline generated yet. Generate one to see the course content structure.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {roots.map((node, i) => (
        <RecursiveContentNode key={node.id || i} node={node} numbering={`${i + 1}`} depth={0} />
      ))}
    </div>
  );
}

/* ---- Files Tab ---- */

function getFileIcon(item) {
  if (item.type === "folder") return Folder;
  if (item.type === "pdf") return FileText;
  return File;
}

function FileContextMenu({ position, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const items = [
    { label: "Open", Icon: ExternalLink },
    { label: "Download", Icon: Download },
    { divider: true },
    { label: "Rename", Icon: Pencil },
    { label: "Delete", Icon: Trash2, danger: true },
    { divider: true },
    { label: "More Info", Icon: Info },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[150px] rounded-md border border-border-default bg-[#1e1e1e] py-1 shadow-xl"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} className="mx-2 my-1 h-px bg-border-default" />
        ) : (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={`flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 font-sans text-[12px] transition-colors hover:bg-[#2a2a2a] ${
              item.danger ? "text-red-400" : "text-text-primary"
            }`}
          >
            <item.Icon className="size-3" />
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}

function ThreeDotBtn() {
  const [menuPos, setMenuPos] = useState(null);
  const btnRef = useRef(null);

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          const rect = btnRef.current.getBoundingClientRect();
          setMenuPos({ x: rect.right - 150, y: rect.bottom + 4 });
        }}
        className="ml-1 shrink-0 cursor-pointer rounded p-0.5 text-transparent transition-colors group-hover:text-text-faint hover:!bg-[#393939] hover:!text-text-primary"
      >
        <MoreHorizontal className="size-3.5" />
      </button>
      {menuPos && (
        <FileContextMenu position={menuPos} onClose={() => setMenuPos(null)} />
      )}
    </>
  );
}

function FilesTab({ files }) {
  const [expanded, setExpanded] = useState(new Set());
  const [sortField, setSortField] = useState("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [viewingFile, setViewingFile] = useState(null);

  const toggle = (name) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
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

  const sorted = [...files].sort((a, b) => {
    const aIsFolder = a.type === "folder" ? 0 : 1;
    const bIsFolder = b.type === "folder" ? 0 : 1;
    if (aIsFolder !== bIsFolder) return aIsFolder - bIsFolder;
    let cmp = 0;
    if (sortField === "name") cmp = a.name.localeCompare(b.name);
    else if (sortField === "modified")
      cmp = (a.modified || "").localeCompare(b.modified || "");
    else if (sortField === "size")
      cmp = (a.size || "").localeCompare(b.size || "");
    return sortAsc ? cmp : -cmp;
  });

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => toggleSort(sortField === "name" ? "modified" : "name")}
          className="flex cursor-pointer items-center gap-1.5 rounded border border-border-subtle px-2 py-1 text-text-secondary transition-colors hover:bg-[#2e2e2e] hover:text-text-primary"
        >
          <ArrowUpDown className="size-3" />
          <span className="font-sans text-[11px]">Sort</span>
        </button>
        <button className="flex cursor-pointer items-center gap-1.5 rounded border border-border-subtle px-2 py-1 text-text-secondary transition-colors hover:bg-[#2e2e2e] hover:text-text-primary">
          <Filter className="size-3" />
          <span className="font-sans text-[11px]">Filter</span>
        </button>
        <span className="ml-auto font-sans text-[11px] text-text-faint">
          {files.length} items
        </span>
      </div>

      {/* Column headers */}
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
        <span className="w-6" />
      </div>

      {sorted.map((item) => (
        <CourseFileRow
          key={item.name}
          item={item}
          expanded={expanded.has(item.name)}
          onToggle={() => toggle(item.name)}
          depth={0}
          expandedSet={expanded}
          onToggleAny={toggle}
          onFileClick={(f) => setViewingFile(f)}
        />
      ))}

      {viewingFile && (
        <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />
      )}
    </div>
  );
}

function CourseFileRow({
  item,
  expanded,
  onToggle,
  depth,
  expandedSet,
  onToggleAny,
  onFileClick,
}) {
  const Icon = getFileIcon(item);
  const isFolder = item.type === "folder";

  return (
    <>
      <div
        className="group flex cursor-pointer items-center rounded py-1.5 transition-colors hover:bg-[#2a2a2e]"
        style={{ paddingLeft: depth * 20 }}
        onClick={() => {
          if (!isFolder && item.id) onFileClick?.(item);
        }}
      >
        <div className="flex flex-1 items-center gap-2">
          {isFolder ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
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
        </div>
        <span className="w-20 font-mono text-[11px] text-text-secondary">
          {item.size || ""}
        </span>
        <span className="w-28 text-right font-sans text-[11px] text-text-secondary">
          {item.modified || ""}
        </span>
        <ThreeDotBtn />
      </div>
      {isFolder && expanded && item.children && (
        <div
          className="border-l border-border-default"
          style={{ marginLeft: depth * 20 + 14 }}
        >
          {item.children.map((child) => (
            <CourseFileRow
              key={child.name}
              item={child}
              expanded={expandedSet.has(child.name)}
              onToggle={() => onToggleAny(child.name)}
              depth={1}
              expandedSet={expandedSet}
              onToggleAny={onToggleAny}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ---- About Tab ---- */

function AboutTab({ folder }) {
  if (!folder) return null;

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-text-faint">
          Folder Info
        </span>
        <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-elevated p-4">
          {[
            ["Name", folder.name],
            [
              "Created",
              new Date(folder.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
            ],
            [
              "Last active",
              folder.last_accessed_at
                ? formatRelative(folder.last_accessed_at)
                : formatRelative(folder.updated_at) || "—",
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="font-sans text-[12px] text-text-secondary">
                {label}
              </span>
              <span className="font-sans text-[12px] text-text-primary">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
