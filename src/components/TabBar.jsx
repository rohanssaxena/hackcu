import { useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { useTabs } from "../contexts/TabContext";

export default function TabBar() {
  const {
    tabs,
    activeTabId,
    activateTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    addNewTab,
    renameTab,
  } = useTabs();

  const [contextMenu, setContextMenu] = useState(null);
  const [renamingTab, setRenamingTab] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef(null);
  const renameRef = useRef(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setContextMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  useEffect(() => {
    if (renamingTab && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingTab]);

  const startRename = (id) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab) {
      setRenamingTab(id);
      setRenameValue(tab.label);
    }
    setContextMenu(null);
  };

  const commitRename = () => {
    if (renamingTab && renameValue.trim()) {
      renameTab(renamingTab, renameValue.trim());
    }
    setRenamingTab(null);
  };

  const handleDoubleClick = (e, tabId) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ tabId, x: rect.left, y: rect.bottom + 2 });
  };

  const MENU_ITEMS = [
    { label: "New Tab", action: () => { addNewTab(); setContextMenu(null); } },
    { label: "Rename Tab", action: () => startRename(contextMenu?.tabId) },
    { divider: true },
    { label: "Close Tab", action: () => { closeTab(contextMenu?.tabId); setContextMenu(null); } },
    { label: "Close Other Tabs", action: () => { closeOtherTabs(contextMenu?.tabId); setContextMenu(null); } },
    { label: "Close All Tabs", action: () => { closeAllTabs(); setContextMenu(null); } },
  ];

  return (
    <div className="relative flex h-[35px] w-full items-center border-b border-border-default bg-bg-sidebar">
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        const isRenaming = renamingTab === tab.id;
        return (
          <div
            key={tab.id}
            onClick={() => activateTab(tab.id)}
            onDoubleClick={(e) => handleDoubleClick(e, tab.id)}
            className={`group flex h-full cursor-pointer items-center gap-2 border-r border-border-default px-3 transition-colors ${
              isActive
                ? "bg-[#232323] text-white"
                : "text-[#868686] hover:bg-[#1e1e1e] hover:text-text-primary"
            }`}
          >
            {isRenaming ? (
              <input
                ref={renameRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenamingTab(null);
                }}
                onBlur={commitRename}
                className="w-24 bg-transparent font-sans text-[13px] leading-[19.5px] text-text-primary outline-none"
              />
            ) : (
              <span className="whitespace-nowrap font-sans text-[13px] leading-[19.5px]">
                {tab.label}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="shrink-0 cursor-pointer rounded p-0.5 text-transparent transition-colors group-hover:text-text-tab hover:!text-white"
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}

      <button
        onClick={addNewTab}
        className="flex h-full cursor-pointer items-center px-2 text-text-faint transition-colors hover:text-text-primary"
      >
        <Plus className="size-3.5" />
      </button>

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] rounded-md border border-border-default bg-[#1e1e1e] py-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {MENU_ITEMS.map((item, i) =>
            item.divider ? (
              <div key={i} className="mx-2 my-1 h-px bg-border-default" />
            ) : (
              <button
                key={i}
                onClick={item.action}
                className="flex w-full cursor-pointer items-center px-3 py-1.5 font-sans text-[12px] text-text-primary transition-colors hover:bg-[#2a2a2a]"
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
