import { useState } from "react";
import { X } from "lucide-react";

const INITIAL_TABS = [
  { id: "user-swift", label: "User.swift", modified: true },
  { id: "calc-review", label: "calc work + review fff" },
  { id: "changes", label: "Make the following changes t..." },
  { id: "untitled", label: "Untitled-2", closeable: true },
  { id: "profile", label: "ProfileTabView.swift", badge: "M" },
];

export default function TabBar() {
  const [activeTab, setActiveTab] = useState("calc-review");

  return (
    <div className="flex h-[35px] w-full items-center border-b border-border-default bg-bg-sidebar">
      {INITIAL_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex h-full cursor-pointer items-center gap-2 border-r border-border-default px-3 transition-colors ${
              isActive
                ? "bg-bg-active-tab text-white"
                : "bg-bg-sidebar text-text-tab hover:bg-[#2e2e30]"
            }`}
          >
            <span className="whitespace-nowrap font-sans text-[13px] leading-[19.5px]">
              {tab.label}
            </span>
            {tab.modified && (
              <span className="size-1 shrink-0 rounded-full bg-text-tab" />
            )}
            {tab.closeable && (
              <X className="size-3 shrink-0 text-text-tab transition-colors hover:text-white" />
            )}
            {tab.badge && (
              <span className="font-sans text-[13px] leading-[19.5px] text-text-tab">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
