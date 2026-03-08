import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { supabase, USER_ID } from "../lib/supabase";
import FileViewer from "../components/FileViewer";
import OutlineModal from "../components/OutlineModal";
import OutlineView from "../components/OutlineView";
import { getOutline } from "../lib/outlineService";

const TABS = ["Overview", "Content", "Files", "Outline", "About"];

export default function Course() {
  const { courseName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const filePath = location.state?.path || [];
  const [activeTab, setActiveTab] = useState("Overview");

  const title = decodeURIComponent(courseName);

  const [course, setCourse] = useState(null);
  const [topics, setTopics] = useState([]);
  const [mastery, setMastery] = useState({});
  const [studySets, setStudySets] = useState([]);
  const [exam, setExam] = useState(null);
  const [activities, setActivities] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [outlineGenerated, setOutlineGenerated] = useState(false);
  const [folderId, setFolderId] = useState(null);
  const [showOutlineModal, setShowOutlineModal] = useState(false);
  const [outlineData, setOutlineData] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: courseRow } = await supabase
        .from("courses")
        .select("*")
        .eq("user_id", USER_ID)
        .eq("title", title)
        .single();

      if (!courseRow) {
        setLoading(false);
        return;
      }
      setCourse(courseRow);

      // Load folder outline status
      if (courseRow.folder_id) {
        setFolderId(courseRow.folder_id);
        const { data: folderRow } = await supabase
          .from("folders")
          .select("outline_generated")
          .eq("id", courseRow.folder_id)
          .single();
        if (folderRow) {
          setOutlineGenerated(!!folderRow.outline_generated);
          if (folderRow.outline_generated) {
            getOutline(courseRow.folder_id).then((data) => {
              if (data) setOutlineData(data);
            });
          }
        }
      }

      const [topicsRes, examRes, actionsRes, filesRes, setsRes] =
        await Promise.all([
          supabase
            .from("topics")
            .select("*")
            .eq("course_id", courseRow.id)
            .order("order_index"),
          supabase
            .from("exams")
            .select("*")
            .eq("course_id", courseRow.id)
            .gte("exam_date", new Date().toISOString())
            .order("exam_date")
            .limit(1),
          supabase
            .from("study_actions")
            .select("*")
            .eq("user_id", USER_ID)
            .eq("course_id", courseRow.id)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("course_files")
            .select("*")
            .eq("course_id", courseRow.id)
            .order("filename"),
          supabase
            .from("study_sets")
            .select("*, study_set_progress(*)")
            .eq("course_id", courseRow.id)
            .eq("user_id", USER_ID),
        ]);

      if (topicsRes.data) {
        setTopics(topicsRes.data);
        const { data: beliefs } = await supabase
          .from("mastery_beliefs")
          .select("topic_id, p_know, last_reviewed")
          .eq("user_id", USER_ID)
          .in(
            "topic_id",
            topicsRes.data.map((t) => t.id),
          );
        if (beliefs) {
          const m = {};
          beliefs.forEach((b) => {
            m[b.topic_id] = b;
          });
          setMastery(m);
        }
      }

      if (examRes.data?.[0]) setExam(examRes.data[0]);
      if (actionsRes.data) setActivities(actionsRes.data);

      if (filesRes.data) {
        const folderGroups = {};
        const standalone = [];
        for (const f of filesRes.data) {
          if (f.folder_id) {
            if (!folderGroups[f.folder_id]) folderGroups[f.folder_id] = [];
            folderGroups[f.folder_id].push(f);
          } else {
            standalone.push(f);
          }
        }

        const folderIds = Object.keys(folderGroups);
        let folderNames = {};
        if (folderIds.length) {
          const { data: folders } = await supabase
            .from("folders")
            .select("id, name")
            .in("id", folderIds);
          if (folders) {
            folders.forEach((f) => {
              folderNames[f.id] = f.name;
            });
          }
        }

        const fileTree = [];
        for (const [fId, fFiles] of Object.entries(folderGroups)) {
          if (fId === courseRow.folder_id) {
            standalone.push(...fFiles);
            continue;
          }
          fileTree.push({
            name: folderNames[fId] || "Folder",
            type: "folder",
            children: fFiles.map((f) => ({
              id: f.id,
              name: f.filename,
              type: mapFileType(f.file_type),
              size: formatBytes(f.file_size_bytes),
              modified: formatRelative(f.uploaded_at),
            })),
          });
        }
        standalone.forEach((f) => {
          fileTree.push({
            id: f.id,
            name: f.filename,
            type: mapFileType(f.file_type),
            size: formatBytes(f.file_size_bytes),
            modified: formatRelative(f.uploaded_at),
          });
        });
        setFiles(fileTree);
      }

      if (setsRes.data) {
        setStudySets(
          setsRes.data.map((s) => {
            const progress = s.study_set_progress?.[0];
            const totalCards = s.topic_ids?.length * 10 || 0;
            const masteredCards = progress
              ? Math.round((progress.score || 0) * totalCards)
              : 0;
            return {
              id: s.id,
              name: s.title,
              cards: totalCards,
              mastered: masteredCards,
            };
          }),
        );
      }

      setLoading(false);
    }
    load();
  }, [title]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="font-sans text-[13px] text-text-faint">
          Loading course…
        </span>
      </div>
    );
  }

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
      <p className="mb-5 font-sans text-[13px] text-text-secondary">
        {pathLabel}
      </p>

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
        <div className="ml-auto pb-2">
          <button
            onClick={() => !outlineGenerated && setShowOutlineModal(true)}
            disabled={outlineGenerated}
            className={`flex items-center gap-1.5 rounded px-3 py-1 font-sans text-[11px] font-medium transition-colors ${
              outlineGenerated
                ? "cursor-default bg-[#2a2a2a] text-text-faint"
                : "cursor-pointer bg-white text-black hover:bg-gray-200"
            }`}
          >
            {outlineGenerated ? "Outline Generated" : "Generate Outline"}
          </button>
        </div>
      </div>

      {showOutlineModal && folderId && (
        <OutlineModal
          folderId={folderId}
          folderName={title}
          onClose={() => setShowOutlineModal(false)}
          onComplete={() => {
            setOutlineGenerated(true);
            getOutline(folderId).then((data) => {
              if (data) setOutlineData(data);
            });
          }}
        />
      )}

      {/* Tab content + side cards */}
      <div className="flex flex-1 gap-10 pb-8">
        <div className="min-w-0 flex-1">
          {activeTab === "Overview" && (
            <OverviewTab topics={topics} mastery={mastery} course={course} />
          )}
          {activeTab === "Content" && (
            <ContentTab outline={outlineData} />
          )}
          {activeTab === "Files" && <FilesTab files={files} />}
          {activeTab === "Outline" && (
            outlineData ? (
              <OutlineView outline={outlineData} />
            ) : (
              <p className="py-12 text-center font-sans text-[13px] text-text-faint">
                No outline generated yet. Click "Generate Outline" above to create one.
              </p>
            )
          )}
          {activeTab === "About" && <AboutTab course={course} />}
        </div>

        <div className="flex w-[260px] shrink-0 flex-col gap-4">
          <SidePanelCards
            exam={exam}
            studySets={studySets}
            activities={activities}
            topics={topics}
            mastery={mastery}
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

function SidePanelCards({ exam, studySets, activities, topics, mastery }) {
  const readiness = exam?.scope_topic_ids?.length
    ? Math.round(
        (exam.scope_topic_ids.reduce(
          (s, tid) => s + (mastery[tid]?.p_know || 0),
          0,
        ) /
          exam.scope_topic_ids.length) *
          100,
      )
    : 0;

  const daysAway = exam
    ? Math.ceil(
        (new Date(exam.exam_date) - Date.now()) / (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <>
      {exam && (
        <div className="flex flex-col gap-2 rounded border border-[#393939] px-4 py-3">
          <div className="flex items-center gap-2 border-b border-border-default pb-2">
            <Calendar className="size-3.5 text-text-muted" />
            <span className="font-sans text-[11px] font-medium text-text-muted">
              Upcoming Exam
            </span>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <span className="font-sans text-[13px] font-medium text-text-primary">
              {exam.title}
            </span>
            <div className="flex items-center gap-1.5">
              <Clock className="size-3 text-red-400" />
              <span className="font-sans text-[11px] text-red-400">
                {new Date(exam.exam_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                — {daysAway} days away
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-sans text-[10px] text-text-secondary">
                  Readiness
                </span>
                <span className="font-mono text-[10px] text-accent-green">
                  {readiness}%
                </span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-bg-elevated">
                <div
                  className="h-full rounded-full bg-accent-green"
                  style={{ width: `${readiness}%` }}
                />
              </div>
            </div>
            {exam.notes && (
              <span className="font-sans text-[11px] text-text-faint">
                {exam.notes}
              </span>
            )}
          </div>
        </div>
      )}

      {studySets.length > 0 && (
        <div className="flex flex-col gap-3 rounded border border-[#393939] px-4 py-3">
          <div className="flex items-center gap-2 border-b border-border-default pb-2">
            <Layers className="size-3.5 text-text-muted" />
            <span className="font-sans text-[11px] font-medium text-text-muted">
              Sets
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {studySets.map((set) => {
              const pct =
                set.cards > 0
                  ? Math.round((set.mastered / set.cards) * 100)
                  : 0;
              return (
                <button
                  key={set.id}
                  className="group/set -mx-2 flex cursor-pointer flex-col gap-1.5 rounded-md px-2 py-2 transition-colors hover:bg-[#2e2e30]"
                >
                  <span className="font-sans text-[12px] font-medium text-text-primary">
                    {set.name}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[10px] text-text-secondary">
                      {set.mastered}/{set.cards} mastered
                    </span>
                    <span className="font-mono text-[10px] text-text-faint">
                      {pct}%
                    </span>
                  </div>
                  <div className="flex h-1 overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className="h-full rounded-full bg-accent-blue"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activities.length > 0 && (
        <div className="flex flex-col gap-3 rounded border border-[#393939] px-4 py-3">
          <div className="border-b border-border-default pb-2">
            <span className="font-sans text-[11px] font-medium text-text-muted">
              Recent Activity
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-2">
                <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-blue" />
                <div className="flex flex-col">
                  <span className="font-sans text-[12px] leading-tight text-text-primary">
                    {a.metadata?.label || a.action_type}
                  </span>
                  <span className="font-sans text-[10px] text-text-faint">
                    {formatRelative(a.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ---- Overview Tab ---- */

function OverviewTab({ topics, mastery, course }) {
  const [mapView, setMapView] = useState("map");

  const sortedTopics = [...topics].sort(
    (a, b) => a.order_index - b.order_index,
  );
  const rootTopics = sortedTopics.filter((t) => !t.parent_topic_id);
  const childTopics = sortedTopics.filter((t) => t.parent_topic_id);

  const mindmapNodes = [];
  const rootX = 400;
  const rootY = 40;

  if (course) {
    mindmapNodes.push({
      id: "root",
      label: course.title,
      x: rootX,
      y: rootY,
      level: 0,
    });
  }

  const spacing = 800 / Math.max(rootTopics.length, 1);
  rootTopics.forEach((t, i) => {
    const x = 60 + i * spacing;
    mindmapNodes.push({
      id: t.id,
      label: t.name,
      x,
      y: 130,
      level: 1,
      parent: "root",
    });
  });

  childTopics.forEach((t) => {
    const parentNode = mindmapNodes.find((n) => n.id === t.parent_topic_id);
    if (parentNode) {
      const siblings = childTopics.filter(
        (c) => c.parent_topic_id === t.parent_topic_id,
      );
      const idx = siblings.indexOf(t);
      const offset = (idx - (siblings.length - 1) / 2) * 140;
      mindmapNodes.push({
        id: t.id,
        label: t.name,
        x: parentNode.x + offset,
        y: parentNode.y + 90,
        level: 2,
        parent: t.parent_topic_id,
      });
    }
  });

  const linearOrder = sortedTopics.map((t) => {
    const m = mastery[t.id];
    let status = "upcoming";
    if (m) {
      if (m.p_know >= 0.8) status = "done";
      else if (m.p_know >= 0.3) status = "current";
    }
    return { id: t.id, label: t.name, status };
  });

  const nextTopic = sortedTopics.find(
    (t) => !mastery[t.id] || mastery[t.id].p_know < 0.8,
  );

  const totalTopics = topics.length;
  const completedTopics = topics.filter(
    (t) => mastery[t.id]?.p_know >= 0.8,
  ).length;
  const avgMastery =
    totalTopics > 0
      ? Math.round(
          (topics.reduce((s, t) => s + (mastery[t.id]?.p_know || 0), 0) /
            totalTopics) *
            100,
        )
      : 0;

  return (
    <div className="flex flex-col gap-8">
      {nextTopic && (
        <div className="flex items-center gap-4 py-2">
          <div className="flex size-9 items-center justify-center rounded bg-accent-blue/15">
            <Play className="size-4 text-accent-blue" />
          </div>
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-2">
              <span className="font-sans text-[11px] font-medium uppercase tracking-wide text-text-faint">
                Next Up
              </span>
            </div>
            <span className="font-sans text-[14px] font-medium text-text-primary">
              {nextTopic.name}
            </span>
            <span className="font-sans text-[12px] text-text-secondary">
              Topic {nextTopic.order_index} ·{" "}
              {Math.round((mastery[nextTopic.id]?.p_know || 0) * 100)}% mastery
            </span>
          </div>
          <button className="flex cursor-pointer items-center gap-1.5 rounded bg-accent-blue px-4 py-1.5 font-sans text-[12px] font-medium text-white transition-colors hover:brightness-110">
            Continue
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}

      <div className="h-px bg-border-default" />

      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Completed",
            value: `${completedTopics}/${totalTopics}`,
            sub: "topics",
          },
          { label: "Avg Mastery", value: `${avgMastery}%`, sub: "across topics" },
          {
            label: "Study Sets",
            value: `${topics.length > 0 ? completedTopics : 0}`,
            sub: "completed",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-1 rounded-lg border border-border-subtle bg-bg-elevated p-4"
          >
            <span className="font-mono text-2xl font-semibold text-text-primary">
              {stat.value}
            </span>
            <span className="font-sans text-[11px] text-text-secondary">
              {stat.sub}
            </span>
            <span className="font-sans text-[10px] uppercase tracking-wide text-text-faint">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-text-faint">
          Knowledge Map
        </span>
        <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-bg-primary">
          <div className="absolute right-3 top-3 z-20 flex overflow-hidden rounded border border-border-subtle bg-bg-sidebar">
            <button
              onClick={() => setMapView("map")}
              className={`flex cursor-pointer items-center gap-1 px-2 py-1 font-sans text-[10px] transition-colors ${
                mapView === "map"
                  ? "bg-[#393939] text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Map className="size-3" />
              Map
            </button>
            <button
              onClick={() => setMapView("linear")}
              className={`flex cursor-pointer items-center gap-1 px-2 py-1 font-sans text-[10px] transition-colors ${
                mapView === "linear"
                  ? "bg-[#393939] text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <ListOrdered className="size-3" />
              Linear
            </button>
          </div>

          {mapView === "map" ? (
            <div className="relative h-[380px]">
              <svg className="absolute inset-0 size-full">
                {mindmapNodes
                  .filter((n) => n.parent)
                  .map((n) => {
                    const parent = mindmapNodes.find(
                      (p) => p.id === n.parent,
                    );
                    if (!parent) return null;
                    return (
                      <line
                        key={`${parent.id}-${n.id}`}
                        x1={parent.x}
                        y1={parent.y + 16}
                        x2={n.x}
                        y2={n.y}
                        stroke="#3e3e3e"
                        strokeWidth={1.5}
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
          ) : (
            <div className="flex flex-col p-4">
              {linearOrder.map((item, i) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`size-3 rounded-full border-2 ${
                        item.status === "done"
                          ? "border-accent-green bg-accent-green"
                          : item.status === "current"
                            ? "border-accent-blue bg-accent-blue"
                            : "border-border-default bg-transparent"
                      }`}
                    />
                    {i < linearOrder.length - 1 && (
                      <div className="h-8 w-px bg-border-default" />
                    )}
                  </div>
                  <span
                    className={`font-sans text-[13px] ${
                      item.status === "current"
                        ? "font-medium text-accent-blue"
                        : item.status === "done"
                          ? "text-text-secondary line-through"
                          : "text-text-faint"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Content Tab ---- */

function ContentNode({ title, numbering, isTerminal, objectives, children, depth = 0 }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = children && children.length > 0;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-[#2a2a2e]"
      >
        {hasChildren ? (
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
          {title}
        </span>
        {isTerminal && objectives?.length > 0 && (
          <span className="shrink-0 rounded bg-[#232323] px-1.5 py-0.5 font-mono text-[9px] text-text-faint">
            {objectives.length} objective{objectives.length !== 1 ? "s" : ""}
          </span>
        )}
      </button>
      {open && (
        <div className={depth === 0 ? "ml-5" : "ml-6 border-l border-[#232323] pl-1"}>
          {isTerminal && objectives?.length > 0 && (
            <ul className="flex flex-col gap-0.5 px-3 py-1.5">
              {objectives.map((o, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-[5px] size-1 shrink-0 rounded-full bg-accent-blue" />
                  <span className="font-sans text-[11px] leading-[16px] text-text-secondary">{o}</span>
                </li>
              ))}
            </ul>
          )}
          {hasChildren && children}
        </div>
      )}
    </div>
  );
}

function ContentTab({ outline }) {
  if (!outline || !outline.sections?.length) {
    return (
      <p className="py-12 text-center font-sans text-[13px] text-text-faint">
        No outline generated yet. Generate one to see the course content structure.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {outline.sections.map((section, i) => (
        <ContentNode
          key={section.id || i}
          title={section.title}
          numbering={`${i + 1}`}
          isTerminal={!!section.content}
          objectives={section.objectives}
          depth={0}
        >
          {section.subsections?.map((sub, j) => (
            <ContentNode
              key={sub.id || j}
              title={sub.title}
              numbering={`${i + 1}.${j + 1}`}
              isTerminal={!!sub.content}
              objectives={sub.objectives}
              depth={1}
            >
              {sub.topics?.map((topic, k) => (
                <ContentNode
                  key={topic.id || k}
                  title={topic.title}
                  numbering={`${i + 1}.${j + 1}.${k + 1}`}
                  isTerminal={!!topic.content}
                  objectives={topic.objectives}
                  depth={2}
                />
              ))}
            </ContentNode>
          ))}
        </ContentNode>
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

function AboutTab({ course }) {
  if (!course) return null;

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-text-faint">
          Course Info
        </span>
        <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-elevated p-4">
          {[
            ["Name", course.title],
            ["Subject", course.subject],
            ["Type", course.subject_type],
            ["Status", course.status],
            [
              "Created",
              new Date(course.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
            ],
            [
              "Last active",
              course.last_accessed_at
                ? formatRelative(course.last_accessed_at)
                : "—",
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
      {course.description && (
        <div className="flex flex-col gap-2">
          <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-text-faint">
            Description
          </span>
          <p className="font-sans text-[13px] leading-[20px] text-text-secondary">
            {course.description}
          </p>
        </div>
      )}
    </div>
  );
}
