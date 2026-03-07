import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Folder, PanelLeftClose, PanelLeftOpen, LayoutDashboard,
  BarChart3, GraduationCap, RotateCcw, ChevronDown, ChevronRight,
  Sparkles, Sun, Moon, Monitor, User, Check, LogOut, Loader2,
} from "lucide-react";
import { useCourse } from "../context/CourseContext";
import { logout } from "../services/canvasAPI";

const NAV_ITEMS = [
  { label: "Dashboard",    Icon: LayoutDashboard, path: "/" },
  { label: "My Workspace", Icon: Folder,          path: "/workspace" },
  { label: "Progress",     Icon: BarChart3,        path: "/progress" },
  { label: "Academics",    Icon: GraduationCap,    path: "/academics" },
  { label: "Review",       Icon: RotateCcw,        path: "/review" },
];

const FAVORITES    = ["APPM Exam 2 revision", "csci midterm 1"];
const QUICK_ACTIONS = ["Review due content", "Custom shortcut 1", "Custom shortcut 2"];
const THEME_OPTIONS = [
  { value: "dark",   Icon: Moon,    label: "Dark" },
  { value: "light",  Icon: Sun,     label: "Light" },
  { value: "system", Icon: Monitor, label: "System" },
];

export default function Sidebar({ onOpenGuidedMode }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { courses, activeCourse, selectCourse, loading, shortCode } = useCourse();

  const [collapsed,       setCollapsed]       = useState(false);
  const [favoritesOpen,   setFavoritesOpen]   = useState(true);
  const [quickActionsOpen,setQuickActionsOpen]= useState(true);
  const [theme,           setTheme]           = useState("dark");
  const [dropdownOpen,    setDropdownOpen]    = useState(false);
  const dropdownRef = useRef(null);

  const userName  = localStorage.getItem("micro_user_name")  || "Student";
  const userEmail = localStorage.getItem("micro_user_email") || "";

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (collapsed) {
    return (
      <aside className="flex h-full w-10 shrink-0 flex-col items-center border-r border-border-default bg-bg-sidebar pt-3">
        <button onClick={() => setCollapsed(false)} className="cursor-pointer rounded p-1 text-text-faint transition-colors hover:bg-[#2e2e2e] hover:text-text-primary">
          <PanelLeftOpen className="size-3.5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-border-default bg-bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="font-sans text-[11px] font-semibold uppercase text-text-label">Micro</span>
        <button onClick={() => setCollapsed(true)} className="cursor-pointer rounded p-0.5 text-text-faint transition-colors hover:bg-[#2e2e2e] hover:text-text-primary">
          <PanelLeftClose className="size-3.5" />
        </button>
      </div>

      {/* Course selector dropdown */}
      <div className="flex flex-col gap-1.5 px-3 pt-1 pb-1" ref={dropdownRef}>
        {/* Static "Current Folder" pill */}
        <button className="flex h-[26px] cursor-pointer items-center justify-between rounded border border-border-subtle bg-bg-elevated px-2 transition-colors hover:bg-bg-hover">
          <span className="font-sans text-[13px] leading-[19.5px] text-text-primary">Current Folder</span>
          <ChevronDown className="size-3 text-text-secondary" />
        </button>

        {/* Course dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="flex h-[26px] w-full cursor-pointer items-center justify-between rounded border border-border-subtle bg-bg-elevated px-2 transition-colors hover:bg-bg-hover"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {loading ? (
                <Loader2 className="size-3 animate-spin text-text-secondary" />
              ) : (
                <span className="size-1.5 rounded-full bg-accent-blue shrink-0" />
              )}
              <span className="font-sans text-[13px] leading-[19.5px] text-text-primary truncate">
                {loading ? "Loading…" : activeCourse ? shortCode(activeCourse) : "No courses"}
              </span>
            </div>
            <ChevronDown className={`size-3 text-text-secondary shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && !loading && courses.length > 0 && (
            <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-border-default bg-bg-sidebar shadow-xl">
              {courses.map(c => {
                const active = activeCourse?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => { selectCourse(c); setDropdownOpen(false); }}
                    className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[#2e2e2e] ${active ? "bg-[#1e2a3a]" : ""}`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-mono text-[12px] text-text-primary truncate">{shortCode(c)}</span>
                      <span className="font-sans text-[10px] text-text-faint truncate">
                        {c.name.includes(":") ? c.name.split(":")[1].trim() : c.name}
                      </span>
                    </div>
                    {active && <Check className="size-3 shrink-0 text-accent-blue" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col pt-1">
        {NAV_ITEMS.map(({ label, Icon, path }) => {
          const active = isActive(path);
          return (
            <button key={label} onClick={() => navigate(path)}
              className={`flex h-[23.5px] cursor-pointer items-center gap-1.5 pl-4 transition-colors ${active ? "bg-[#1e2a3a] text-text-primary" : "text-text-secondary hover:bg-[#2e2e2e] hover:text-text-primary"}`}>
              <Icon className="size-3.5" />
              <span className="font-sans text-[13px] leading-[19.5px]">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mx-0 mt-1.5 h-px bg-border-default" />

      {/* Favorites */}
      <div className="pt-1">
        <button onClick={() => setFavoritesOpen(v => !v)}
          className="flex w-full cursor-pointer items-center gap-1 px-4 py-1 transition-colors hover:bg-[#2e2e2e]">
          {favoritesOpen ? <ChevronDown className="size-3 text-text-faint" /> : <ChevronRight className="size-3 text-text-faint" />}
          <span className="font-sans text-[11px] font-bold uppercase text-text-faint">Favorites</span>
        </button>
        {favoritesOpen && (
          <div className="flex flex-col">
            {FAVORITES.map(fav => (
              <button key={fav} className="flex h-[23.5px] cursor-pointer items-center pl-4 text-text-secondary transition-colors hover:bg-[#2e2e2e] hover:text-text-primary">
                <span className="font-sans text-[13px] leading-[19.5px]">{fav}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mx-0 mt-1.5 h-px bg-border-default" />

      {/* Quick Actions */}
      <div className="pt-1">
        <button onClick={() => setQuickActionsOpen(v => !v)}
          className="flex w-full cursor-pointer items-center gap-1 px-4 py-1 transition-colors hover:bg-[#2e2e2e]">
          {quickActionsOpen ? <ChevronDown className="size-3 text-text-faint" /> : <ChevronRight className="size-3 text-text-faint" />}
          <span className="font-sans text-[11px] font-bold uppercase text-text-faint">Quick Actions</span>
        </button>
        {quickActionsOpen && (
          <div className="flex flex-col">
            {QUICK_ACTIONS.map(action => (
              <button key={action} className="flex h-[23.5px] cursor-pointer items-center pl-4 text-text-secondary transition-colors hover:bg-[#2e2e2e] hover:text-text-primary">
                <span className="font-sans text-[13px] leading-[19.5px]">{action}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Bottom */}
      <div className="flex flex-col gap-2 px-3 pb-3">
        <button onClick={onOpenGuidedMode}
          className="guided-btn group relative flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-md px-3 py-2 font-sans text-[12px] font-medium text-white transition-all">
          <span className="guided-btn-bg absolute inset-0 rounded-md" />
          <span className="guided-btn-shimmer absolute inset-0 rounded-md" />
          <Sparkles className="relative z-10 size-3.5" />
          <span className="relative z-10">Guided Learning Mode</span>
        </button>

        <div className="flex h-8 items-center rounded-md bg-[#1e1e1e] p-0.5">
          {THEME_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setTheme(opt.value)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md py-1 font-sans text-[11px] transition-all ${theme === opt.value ? "bg-[#393939] text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}>
              <opt.Icon className="size-3" /><span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* User + logout */}
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 group">
          <div className="flex size-6 items-center justify-center rounded-full bg-accent-blue shrink-0">
            <User className="size-3.5 text-white" />
          </div>
          <div className="flex flex-col items-start flex-1 min-w-0">
            <span className="font-sans text-[12px] leading-tight text-text-primary truncate">{userName}</span>
            <span className="font-sans text-[10px] leading-tight text-text-secondary truncate">{userEmail}</span>
          </div>
          <button onClick={handleLogout} title="Log out"
            className="cursor-pointer text-text-faint hover:text-red-400 transition-colors shrink-0">
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}