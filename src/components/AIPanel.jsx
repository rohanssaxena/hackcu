import { useState, useRef } from "react";
import {
  Settings,
  X,
  Link2,
  ChevronDown,
  Globe,
  Image as ImageIcon,
  ArrowUp,
} from "lucide-react";

const MODE_OPTIONS = ["Ask", "Act", "Advise"];

export default function AIPanel() {
  const [activeHeaderTab, setActiveHeaderTab] = useState("ask");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState("Ask");
  const [modeOpen, setModeOpen] = useState(false);
  const textareaRef = useRef(null);

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-border-default bg-bg-sidebar">
      {/* Header */}
      <div className="flex h-9 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveHeaderTab("ask")}
            className={`cursor-pointer rounded px-1.5 py-0.5 font-sans text-[11px] transition-colors ${
              activeHeaderTab === "ask"
                ? "bg-[#454546] text-white"
                : "bg-accent-pill text-text-primary hover:bg-[#3a3a3a]"
            }`}
          >
            Ask AI
          </button>
          <button
            onClick={() => setActiveHeaderTab("actions")}
            className={`cursor-pointer rounded px-1.5 py-0.5 font-sans text-[11px] transition-colors ${
              activeHeaderTab === "actions"
                ? "bg-[#454546] text-white"
                : "bg-accent-pill text-text-primary hover:bg-[#3a3a3a]"
            }`}
          >
            Actions
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="cursor-pointer transition-colors hover:text-white">
            <Settings className="size-3.5 text-text-secondary" />
          </button>
          <button className="cursor-pointer transition-colors hover:text-white">
            <X className="size-3.5 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Empty chat area */}
      <div className="flex-1" />

      {/* Bottom input area */}
      <div className="flex flex-col gap-2 p-1.5">
        <div className="flex flex-col overflow-hidden rounded-[10px] border border-border-default bg-bg-primary">
          {/* Textarea */}
          <div className="p-3">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask anything..."
              rows={4}
              className="w-full resize-none bg-transparent font-sans text-[13px] leading-4 text-text-primary outline-none placeholder:text-[#666]"
            />
          </div>

          {/* Toolbar */}
          <div className="flex h-[33.5px] items-center justify-between px-1.5">
            {/* Mode dropdown */}
            <div className="relative">
              <button
                onClick={() => setModeOpen(!modeOpen)}
                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-accent-pill px-1.5 py-0.5 transition-colors hover:bg-[#3a3a3a]"
              >
                <Link2 className="size-3 text-[#a1a1a1]" />
                <span className="font-sans text-[11px] leading-[16.5px] text-[#a1a1a1]">
                  {mode}
                </span>
                <ChevronDown className="size-3 text-[#a1a1a1]" />
              </button>

              {modeOpen && (
                <div className="absolute bottom-full left-0 mb-1 w-28 overflow-hidden rounded-md border border-border-default bg-[#2a2a2a] py-1 shadow-lg">
                  {MODE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setMode(opt);
                        setModeOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center px-3 py-1.5 text-left font-sans text-[12px] transition-colors hover:bg-[#393939] ${
                        mode === opt ? "text-white" : "text-text-secondary"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button className="cursor-pointer transition-colors hover:text-white">
                <Globe className="size-3.5 text-text-secondary" />
              </button>
              <button className="cursor-pointer transition-colors hover:text-white">
                <ImageIcon className="size-3.5 text-text-secondary" />
              </button>
              <button
                className={`flex size-5 cursor-pointer items-center justify-center rounded-full transition-colors ${
                  message.trim()
                    ? "bg-white hover:bg-gray-200"
                    : "bg-[#555] hover:bg-[#666]"
                }`}
              >
                <ArrowUp className={`size-3 ${message.trim() ? "text-black" : "text-[#888]"}`} />
              </button>
            </div>
          </div>
        </div>

        <button className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-text-primary">
          <div className="size-3 rounded-md border border-text-secondary" />
          <span className="font-sans text-[11px] leading-[16.5px] text-text-secondary">
            Local
          </span>
          <ChevronDown className="size-3 text-text-secondary" />
        </button>
      </div>
    </aside>
  );
}
