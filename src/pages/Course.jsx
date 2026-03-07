import { useState, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
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
  Map,
  ListOrdered,
} from "lucide-react";
import { resolvePathToNode } from "../data/fileSystem";

const TABS = ["Overview", "Content", "Files", "About"];

const MINDMAP_NODES = [
  { id: "root", label: "APPM 1360", x: 400, y: 40, level: 0 },
  { id: "calc", label: "Calculus Foundations", x: 180, y: 130, level: 1, parent: "root" },
  { id: "linear", label: "Linear Algebra", x: 620, y: 130, level: 1, parent: "root" },
  { id: "limits", label: "Limits & Continuity", x: 60, y: 220, level: 2, parent: "calc" },
  { id: "deriv", label: "Derivatives", x: 200, y: 220, level: 2, parent: "calc" },
  { id: "integ", label: "Integration", x: 340, y: 220, level: 2, parent: "calc" },
  { id: "vectors", label: "Vectors & Spaces", x: 520, y: 220, level: 2, parent: "linear" },
  { id: "matrices", label: "Matrices", x: 680, y: 220, level: 2, parent: "linear" },
  { id: "eigen", label: "Eigenvalues", x: 780, y: 300, level: 3, parent: "matrices" },
  { id: "taylor", label: "Taylor Series", x: 120, y: 310, level: 3, parent: "deriv" },
  { id: "ftc", label: "Fund. Theorem", x: 340, y: 310, level: 3, parent: "integ" },
];

const LINEAR_ORDER = [
  { id: "limits", label: "Limits & Continuity", status: "done" },
  { id: "deriv", label: "Derivatives", status: "done" },
  { id: "taylor", label: "Taylor Series", status: "done" },
  { id: "integ", label: "Integration", status: "current" },
  { id: "ftc", label: "Fund. Theorem of Calculus", status: "upcoming" },
  { id: "vectors", label: "Vectors & Spaces", status: "upcoming" },
  { id: "matrices", label: "Matrices", status: "upcoming" },
  { id: "eigen", label: "Eigenvalues", status: "upcoming" },
];

const RECENT_ACTIVITIES = [
  { label: "Completed: Derivatives Quiz", time: "2 hours ago" },
  { label: "Reviewed: Taylor Series notes", time: "5 hours ago" },
  { label: "Started: Integration chapter", time: "1 day ago" },
  { label: "Scored 85% on Limits exam", time: "2 days ago" },
];

const SETS = [
  { name: "Midterm 1 Review", cards: 42, mastered: 28 },
  { name: "Derivatives Flashcards", cards: 36, mastered: 36 },
  { name: "Integration Techniques", cards: 24, mastered: 12 },
  { name: "Final Exam Prep", cards: 60, mastered: 8 },
];

export default function Course() {
  const { courseName } = useParams();
  const location = useLocation();
  const filePath = location.state?.path || [];
  const [activeTab, setActiveTab] = useState("Overview");

  const title = decodeURIComponent(courseName);
  const courseNode = useMemo(() => resolvePathToNode(filePath), [filePath]);
  const files = courseNode.children || [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-8 pt-10">
      {/* Title */}
      <h1 className="mb-1 font-sans text-4xl font-semibold text-text-primary">
        {title}
      </h1>
      <p className="mb-4 font-sans text-[13px] text-text-secondary">
        {filePath.join(" / ")}
      </p>

      {/* Sub-nav */}
      <div className="mb-6 flex gap-1 border-b border-border-default">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`cursor-pointer px-4 py-2 font-sans text-[13px] transition-colors ${
              activeTab === tab
                ? "border-b-2 border-accent-blue font-medium text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content + side cards */}
      <div className="flex flex-1 gap-10 overflow-y-auto pb-8">
        {/* Main column */}
        <div className="min-w-0 flex-1">
          {activeTab === "Overview" && <OverviewTab />}
          {activeTab === "Content" && <ContentTab />}
          {activeTab === "Files" && <FilesTab files={files} />}
          {activeTab === "About" && <AboutTab title={title} />}
        </div>

        {/* Right cards (always visible) */}
        <div className="flex w-[260px] shrink-0 flex-col gap-4">
          <SidePanelCards />
        </div>
      </div>
    </div>
  );
}

/* ---- Side Panel Cards ---- */

function SidePanelCards() {
  return (
    <>
      {/* Upcoming Exam */}
      <div className="flex flex-col gap-2 rounded border border-[#393939] px-4 py-3">
        <div className="flex items-center gap-2 border-b border-border-default pb-2">
          <Calendar className="size-3.5 text-text-muted" />
          <span className="font-sans text-[11px] font-medium text-text-muted">
            Upcoming Exam
          </span>
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <span className="font-sans text-[13px] font-medium text-text-primary">
            Midterm 2
          </span>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3 text-red-400" />
            <span className="font-sans text-[11px] text-red-400">
              Mar 15, 2026 — 5 days away
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[10px] text-text-secondary">Readiness</span>
              <span className="font-mono text-[10px] text-accent-green">72%</span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-bg-elevated">
              <div className="h-full w-[72%] rounded-full bg-accent-green" />
            </div>
          </div>
          <span className="font-sans text-[11px] text-text-faint">
            Covers: Ch. 4–7 (Integration, Series)
          </span>
        </div>
      </div>

      {/* Sets */}
      <div className="flex flex-col gap-3 rounded border border-[#393939] px-4 py-3">
        <div className="flex items-center gap-2 border-b border-border-default pb-2">
          <Layers className="size-3.5 text-text-muted" />
          <span className="font-sans text-[11px] font-medium text-text-muted">
            Sets
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {SETS.map((set) => (
            <button
              key={set.name}
              className="group/set flex cursor-pointer flex-col gap-1.5 rounded-md px-2 py-2 -mx-2 transition-colors hover:bg-[#2e2e30]"
            >
              <span className="font-sans text-[12px] font-medium text-text-primary">
                {set.name}
              </span>
              <div className="flex items-center justify-between">
                <span className="font-sans text-[10px] text-text-secondary">
                  {set.mastered}/{set.cards} mastered
                </span>
                <span className="font-mono text-[10px] text-text-faint">
                  {Math.round((set.mastered / set.cards) * 100)}%
                </span>
              </div>
              <div className="flex h-1 overflow-hidden rounded-full bg-bg-elevated">
                <div
                  className="h-full rounded-full bg-accent-blue"
                  style={{ width: `${(set.mastered / set.cards) * 100}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="flex flex-col gap-3 rounded border border-[#393939] px-4 py-3">
        <div className="border-b border-border-default pb-2">
          <span className="font-sans text-[11px] font-medium text-text-muted">
            Recent Activity
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {RECENT_ACTIVITIES.map((a, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-blue" />
              <div className="flex flex-col">
                <span className="font-sans text-[12px] leading-tight text-text-primary">
                  {a.label}
                </span>
                <span className="font-sans text-[10px] text-text-faint">{a.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---- Overview Tab ---- */

function OverviewTab() {
  const [mapView, setMapView] = useState("map");

  return (
    <div className="flex flex-col gap-8">
      {/* Next Up — VS Code style */}
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
            Integration Techniques — Part 3
          </span>
          <span className="font-sans text-[12px] text-text-secondary">
            Chapter 5 · Estimated 25 min
          </span>
        </div>
        <button className="flex cursor-pointer items-center gap-1.5 rounded bg-accent-blue px-4 py-1.5 font-sans text-[12px] font-medium text-white transition-colors hover:brightness-110">
          Continue
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      <div className="h-px bg-border-default" />

      {/* Progress summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Completed", value: "12/18", sub: "chapters" },
          { label: "Study Time", value: "24h", sub: "this week" },
          { label: "Accuracy", value: "87%", sub: "avg. quiz score" },
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

      {/* Knowledge Map / Linear */}
      <div className="flex flex-col gap-3">
        <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-text-faint">
          Knowledge Map
        </span>
        <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-bg-primary">
          {/* Toggle in top-right */}
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
                {MINDMAP_NODES.filter((n) => n.parent).map((n) => {
                  const parent = MINDMAP_NODES.find((p) => p.id === n.parent);
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
              {MINDMAP_NODES.map((node) => (
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
              {LINEAR_ORDER.map((item, i) => (
                <div key={item.id} className="flex items-center gap-3">
                  {/* Vertical line + dot */}
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
                    {i < LINEAR_ORDER.length - 1 && (
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

function ContentTab() {
  const CHAPTERS = [
    { num: 1, title: "Limits & Continuity", progress: 100 },
    { num: 2, title: "Derivatives", progress: 100 },
    { num: 3, title: "Applications of Derivatives", progress: 100 },
    { num: 4, title: "Integration", progress: 75 },
    { num: 5, title: "Integration Techniques", progress: 40 },
    { num: 6, title: "Sequences & Series", progress: 10 },
    { num: 7, title: "Taylor & Maclaurin Series", progress: 0 },
    { num: 8, title: "Linear Algebra Basics", progress: 0 },
  ];

  return (
    <div className="flex flex-col gap-1">
      {CHAPTERS.map((ch) => (
        <button
          key={ch.num}
          className="flex cursor-pointer items-center gap-4 rounded-md px-3 py-3 transition-colors hover:bg-[#2a2a2e]"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-bg-elevated font-mono text-[12px] text-text-secondary">
            {ch.num}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-left font-sans text-[13px] font-medium text-text-primary">
              {ch.title}
            </span>
            <div className="flex h-1 overflow-hidden rounded-full bg-bg-elevated">
              <div
                className={`h-full rounded-full ${ch.progress === 100 ? "bg-accent-green" : "bg-accent-blue"}`}
                style={{ width: `${ch.progress}%` }}
              />
            </div>
          </div>
          <span className="w-10 text-right font-mono text-[11px] text-text-secondary">
            {ch.progress}%
          </span>
        </button>
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

function FilesTab({ files }) {
  const [expanded, setExpanded] = useState(new Set());

  const toggle = (name) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center border-b border-border-default py-1.5">
        <span className="flex-1 font-sans text-[11px] font-medium uppercase tracking-wide text-text-faint">
          Name
        </span>
        <span className="w-20 font-sans text-[11px] font-medium uppercase tracking-wide text-text-faint">
          Size
        </span>
        <span className="w-28 text-right font-sans text-[11px] font-medium uppercase tracking-wide text-text-faint">
          Modified
        </span>
      </div>
      {files.map((item) => (
        <CourseFileRow
          key={item.name}
          item={item}
          expanded={expanded.has(item.name)}
          onToggle={() => toggle(item.name)}
          depth={0}
          expandedSet={expanded}
          onToggleAny={toggle}
        />
      ))}
    </div>
  );
}

function CourseFileRow({ item, expanded, onToggle, depth, expandedSet, onToggleAny }) {
  const Icon = getFileIcon(item);
  const isFolder = item.type === "folder";

  return (
    <>
      <div
        className="group flex items-center rounded py-1.5 transition-colors hover:bg-[#2a2a2e]"
        style={{ paddingLeft: depth * 20 }}
      >
        <div className="flex flex-1 items-center gap-2">
          {isFolder ? (
            <button
              onClick={onToggle}
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
      </div>
      {isFolder && expanded && item.children && (
        <div className="border-l border-border-default" style={{ marginLeft: depth * 20 + 14 }}>
          {item.children.map((child) => (
            <CourseFileRow
              key={child.name}
              item={child}
              expanded={expandedSet.has(child.name)}
              onToggle={() => onToggleAny(child.name)}
              depth={1}
              expandedSet={expandedSet}
              onToggleAny={onToggleAny}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ---- About Tab ---- */

function AboutTab({ title }) {
  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-text-faint">
          Course Info
        </span>
        <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-elevated p-4">
          {[
            ["Name", title],
            ["Semester", "Spring 2026"],
            ["Items", "128 files · 42.8 MB"],
            ["Created", "Jan 12, 2026"],
            ["Last active", "30 minutes ago"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="font-sans text-[12px] text-text-secondary">{label}</span>
              <span className="font-sans text-[12px] text-text-primary">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-text-faint">
          Description
        </span>
        <p className="font-sans text-[13px] leading-[20px] text-text-secondary">
          Applied mathematics course covering calculus, integration techniques,
          sequences and series, and introductory linear algebra. Includes weekly
          problem sets, two midterms, and a final exam.
        </p>
      </div>
    </div>
  );
}
