import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";

const TabContext = createContext(null);

const STORAGE_KEY = "micro:tabs";

let _nextId = 1;
const genId = () => `tab-${_nextId++}`;

const PATH_LABELS = {
  "/": "Dashboard",
  "/workspace": "My Workspace",
  "/progress": "Progress",
  "/academics": "Academics",
  "/review": "Review",
  "/admin": "Admin Panel",
};

function labelForPath(path) {
  if (PATH_LABELS[path]) return PATH_LABELS[path];
  if (path.startsWith("/course/"))
    return decodeURIComponent(path.split("/course/")[1]);
  return "Untitled";
}

function loadPersistedTabs(fallbackPath) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.tabs?.length) {
        let maxNum = 0;
        for (const t of saved.tabs) {
          const n = parseInt(t.id.replace("tab-", ""), 10);
          if (n > maxNum) maxNum = n;
        }
        _nextId = maxNum + 1;
        return { tabs: saved.tabs, activeTabId: saved.activeTabId };
      }
    }
  } catch {}
  const id = genId();
  return {
    tabs: [{ id, label: labelForPath(fallbackPath), path: fallbackPath, renamed: false }],
    activeTabId: id,
  };
}

function persistTabs(tabs, activeTabId) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, activeTabId }));
  } catch {}
}

export function TabProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const initialised = useRef(false);

  const [{ tabs, activeTabId }, setState] = useState(() =>
    loadPersistedTabs(location.pathname),
  );

  const setTabs = useCallback(
    (updater) =>
      setState((prev) => {
        const nextTabs = typeof updater === "function" ? updater(prev.tabs) : updater;
        return { ...prev, tabs: nextTabs };
      }),
    [],
  );
  const setActiveTabId = useCallback(
    (id) => setState((prev) => ({ ...prev, activeTabId: id })),
    [],
  );

  // Navigate to the active tab's path on first mount if it differs from the URL
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    const active = tabs.find((t) => t.id === activeTabId);
    if (active && active.path !== location.pathname) {
      navigate(active.path, { replace: true });
    }
  }, []);

  // Persist on every change
  useEffect(() => {
    persistTabs(tabs, activeTabId);
  }, [tabs, activeTabId]);

  const openTab = useCallback(
    (path, label) => {
      const resolvedLabel = label || labelForPath(path);
      setTabs((prev) => {
        const existing = prev.find((t) => t.path === path);
        if (existing) {
          setActiveTabId(existing.id);
          navigate(path);
          return prev;
        }
        const id = genId();
        setActiveTabId(id);
        navigate(path);
        return [...prev, { id, label: resolvedLabel, path, renamed: false }];
      });
    },
    [navigate, setTabs, setActiveTabId],
  );

  const activateTab = useCallback(
    (id) => {
      setTabs((prev) => {
        const tab = prev.find((t) => t.id === id);
        if (tab) {
          setActiveTabId(id);
          navigate(tab.path);
        }
        return prev;
      });
    },
    [navigate, setTabs, setActiveTabId],
  );

  const closeTab = useCallback(
    (id) => {
      setState((prev) => {
        const remaining = prev.tabs.filter((t) => t.id !== id);
        if (remaining.length === 0) {
          const fallback = { id: genId(), label: "Dashboard", path: "/", renamed: false };
          navigate("/");
          return { tabs: [fallback], activeTabId: fallback.id };
        }
        if (prev.activeTabId === id) {
          const idx = prev.tabs.findIndex((t) => t.id === id);
          const next = remaining[Math.min(idx, remaining.length - 1)];
          navigate(next.path);
          return { tabs: remaining, activeTabId: next.id };
        }
        return { ...prev, tabs: remaining };
      });
    },
    [navigate],
  );

  const closeOtherTabs = useCallback(
    (id) => {
      setState((prev) => {
        const tab = prev.tabs.find((t) => t.id === id);
        if (!tab) return prev;
        navigate(tab.path);
        return { tabs: [tab], activeTabId: id };
      });
    },
    [navigate],
  );

  const closeAllTabs = useCallback(() => {
    const fallback = { id: genId(), label: "Dashboard", path: "/", renamed: false };
    setState({ tabs: [fallback], activeTabId: fallback.id });
    navigate("/");
  }, [navigate]);

  const addNewTab = useCallback(() => {
    const id = genId();
    const tab = { id, label: "Dashboard", path: "/", renamed: false };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(id);
    navigate("/");
  }, [navigate, setTabs, setActiveTabId]);

  const renameTab = useCallback(
    (id, newLabel) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === id ? { ...t, label: newLabel, renamed: true } : t)),
      );
    },
    [setTabs],
  );

  const navigateInPlace = useCallback(
    (path) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== activeTabId) return t;
          const label = t.renamed ? t.label : labelForPath(path);
          return { ...t, path, label };
        }),
      );
      navigate(path);
    },
    [activeTabId, navigate, setTabs],
  );

  return (
    <TabContext.Provider
      value={{
        tabs,
        activeTabId,
        openTab,
        activateTab,
        closeTab,
        closeOtherTabs,
        closeAllTabs,
        addNewTab,
        renameTab,
        navigateInPlace,
      }}
    >
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error("useTabs must be used within TabProvider");
  return ctx;
}
