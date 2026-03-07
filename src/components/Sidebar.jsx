import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Folder,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  BarChart3,
  GraduationCap,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", Icon: LayoutDashboard, path: "/" },
  { label: "My Workspace", Icon: Folder, path: "/workspace" },
  { label: "Progress", Icon: BarChart3, path: "/progress" },
  { label: "Academics", Icon: GraduationCap, path: "/academics" },
  { label: "Review", Icon: RotateCcw, path: "/review" },
];

const FAVORITES = ["APPM Exam 2 revision", "csci midterm 1"];

const QUICK_ACTIONS = [
  "Review due content",
  "Custom shortcut 1",
  "Custom shortcut 2",
];

const THEME_OPTIONS = [
  { value: "dark", Icon: Moon, label: "Dark" },
  { value: "light", Icon: Sun, label: "Light" },
  { value: "system", Icon: Monitor, label: "System" },
];

export default function Sidebar({ onOpenGuidedMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [quickActionsOpen, setQuickActionsOpen] = useState(true);
  const [theme, setTheme] = useState("dark");

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  if (collapsed) {
    return (
      <aside className="flex h-full w-10 shrink-0 flex-col items-center border-r border-border-default bg-bg-sidebar pt-3">
        <button
          onClick={() => setCollapsed(false)}
          className="cursor-pointer rounded p-1 text-text-faint transition-colors hover:bg-[#2e2e2e] hover:text-text-primary"
        >
          <PanelLeftOpen className="size-3.5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-border-default bg-bg-sidebar">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="font-sans text-[11px] font-semibold uppercase text-text-label">
          Micro
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="cursor-pointer rounded p-0.5 text-text-faint transition-colors hover:bg-[#2e2e2e] hover:text-text-primary"
        >
          <PanelLeftClose className="size-3.5" />
        </button>
      </div>

      {/* Folder selector */}
      <div className="flex flex-col gap-1.5 px-3 pt-1 pb-1">
        <button className="flex h-[26px] cursor-pointer items-center justify-between rounded border border-border-subtle bg-bg-elevated px-2 transition-colors hover:bg-bg-hover">
          <span className="font-sans text-[13px] leading-[19.5px] text-text-primary">
            Current Folder
          </span>
          <ChevronDown className="size-3 text-text-secondary" />
        </button>
        <button className="flex h-[26px] cursor-pointer items-center justify-between rounded border border-border-subtle bg-bg-elevated px-2 transition-colors hover:bg-bg-hover">
          <div className="flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-text-primary" />
            <span className="font-sans text-[13px] leading-[19.5px] text-text-primary">
              APPM 1360
            </span>
          </div>
          <ChevronDown className="size-3 text-text-secondary" />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col pt-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex h-[23.5px] cursor-pointer items-center gap-1.5 pl-4 transition-colors ${
                active
                  ? "bg-[#1e2a3a] text-text-primary"
                  : "text-text-secondary hover:bg-[#2e2e2e] hover:text-text-primary"
              }`}
            >
              <item.Icon className="size-3.5" />
              <span className="font-sans text-[13px] leading-[19.5px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-0 mt-1.5 h-px bg-border-default" />

      {/* Favorites — collapsible */}
      <div className="pt-1">
        <button
          onClick={() => setFavoritesOpen(!favoritesOpen)}
          className="flex w-full cursor-pointer items-center gap-1 px-4 py-1 transition-colors hover:bg-[#2e2e2e]"
        >
          {favoritesOpen ? (
            <ChevronDown className="size-3 text-text-faint" />
          ) : (
            <ChevronRight className="size-3 text-text-faint" />
          )}
          <span className="font-sans text-[11px] font-bold uppercase text-text-faint">
            Favorites
          </span>
        </button>
        {favoritesOpen && (
          <div className="flex flex-col">
            {FAVORITES.map((fav) => (
              <button
                key={fav}
                className="flex h-[23.5px] cursor-pointer items-center pl-4 text-text-secondary transition-colors hover:bg-[#2e2e2e] hover:text-text-primary"
              >
                <span className="font-sans text-[13px] leading-[19.5px]">
                  {fav}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-0 mt-1.5 h-px bg-border-default" />

      {/* Quick Actions — collapsible */}
      <div className="pt-1">
        <button
          onClick={() => setQuickActionsOpen(!quickActionsOpen)}
          className="flex w-full cursor-pointer items-center gap-1 px-4 py-1 transition-colors hover:bg-[#2e2e2e]"
        >
          {quickActionsOpen ? (
            <ChevronDown className="size-3 text-text-faint" />
          ) : (
            <ChevronRight className="size-3 text-text-faint" />
          )}
          <span className="font-sans text-[11px] font-bold uppercase text-text-faint">
            Quick Actions
          </span>
        </button>
        {quickActionsOpen && (
          <div className="flex flex-col">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                className="flex h-[23.5px] cursor-pointer items-center pl-4 text-text-secondary transition-colors hover:bg-[#2e2e2e] hover:text-text-primary"
              >
                <span className="font-sans text-[13px] leading-[19.5px]">
                  {action}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section */}
      <div className="flex flex-col gap-2 px-3 pb-3">
        <button
          onClick={onOpenGuidedMode}
          className="guided-btn group relative flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-md px-3 py-2 font-sans text-[12px] font-medium text-white transition-all"
        >
          <span className="guided-btn-bg absolute inset-0 rounded-md" />
          <span className="guided-btn-shimmer absolute inset-0 rounded-md" />
          <Sparkles className="relative z-10 size-3.5" />
          <span className="relative z-10">Guided Learning Mode</span>
        </button>

        <div className="flex h-8 items-center rounded-md bg-[#1e1e1e] p-0.5">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md py-1 font-sans text-[11px] transition-all ${
                theme === opt.value
                  ? "bg-[#393939] text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <opt.Icon className="size-3" />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        <button className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-[#2e2e2e]">
          <div className="flex size-6 items-center justify-center rounded-full bg-accent-blue">
            <User className="size-3.5 text-white" />
          </div>
          <div className="flex flex-col items-start">
            <span className="font-sans text-[12px] leading-tight text-text-primary">
              Rohan
            </span>
            <span className="font-sans text-[10px] leading-tight text-text-secondary">
              rohan@micro.study
            </span>
          </div>
        </button>
      </div>
    </aside>
  );
}
