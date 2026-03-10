import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  X,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Pin,
  PinOff,
  Pencil,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  Link2,
  Globe,
  Image as ImageIcon,
  ArrowUp,
  Search,
  MessagesSquare,
  Wrench,
  Check,
  AlertCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  listConversations,
  createConversation,
  deleteConversation,
  updateConversation,
  getMessages,
  sendMessage,
} from "../lib/chatService";
import { useTabs } from "../contexts/TabContext";

const TOOL_LABELS = {
  list_folders: "Looking up folders",
  create_folder: "Creating folder",
  rename_folder: "Renaming folder",
  delete_folder: "Deleting folder",
  list_files: "Listing files",
  rename_file: "Renaming file",
  delete_file: "Deleting file",
  get_folder_status: "Checking folder status",
  generate_outline: "Generating outline",
  generate_learning_content: "Generating learning content",
  list_content_nodes: "Listing content",
  navigate_to_content_node: "Opening content",
  navigate_to_phase: "Opening phase",
};

function RelativeTime({ date }) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return <span>now</span>;
  if (mins < 60) return <span>{mins}m ago</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <span>{hrs}h ago</span>;
  const days = Math.floor(hrs / 24);
  if (days < 7) return <span>{days}d ago</span>;
  return <span>{d.toLocaleDateString()}</span>;
}

function ConversationItem({ conv, active, onSelect, onDelete, onUpdate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conv.title || "");
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== conv.title) {
      onUpdate(conv.id, { title: editTitle.trim() });
    }
    setEditing(false);
  };

  return (
    <div
      className={`group relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
        active ? "bg-bg-active-tab" : "hover:bg-bg-hover"
      }`}
      onClick={() => !editing && onSelect(conv.id)}
    >
      <MessageSquare className="size-3.5 shrink-0 text-text-faint" />
      <div className="flex-1 overflow-hidden">
        {editing ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setEditing(false);
            }}
            onBlur={handleRename}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent font-sans text-[12px] text-text-primary outline-none"
          />
        ) : (
          <span className="block truncate font-sans text-[12px] text-text-primary">
            {conv.title || "Untitled"}
          </span>
        )}
        <span className="font-sans text-[10px] text-text-faint">
          <RelativeTime date={conv.updated_at} />
        </span>
      </div>

      {conv.pinned && <Pin className="size-2.5 shrink-0 text-accent-blue/50" />}

      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="rounded p-0.5 text-text-faint opacity-0 transition-all hover:bg-bg-hover hover:text-text-secondary group-hover:opacity-100"
        >
          <MoreHorizontal className="size-3.5" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-md border border-border-default bg-bg-elevated py-1 shadow-xl">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
                setEditTitle(conv.title || "");
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-sans text-[11px] text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              <Pencil className="size-3" /> Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(conv.id, { pinned: !conv.pinned });
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-sans text-[11px] text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              {conv.pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
              {conv.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-sans text-[11px] text-red-400 transition-colors hover:bg-bg-hover"
            >
              <Trash2 className="size-3" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCallChip({ name, done, error }) {
  const label = TOOL_LABELS[name] || name;
  return (
    <div className="my-1 flex items-center gap-1.5 rounded-md px-2 py-1">
      {done ? (
        error ? (
          <AlertCircle className="size-3 shrink-0 text-red-400" />
        ) : (
          <Check className="size-3 shrink-0 text-emerald-400" />
        )
      ) : (
        <Loader2 className="size-3 shrink-0 animate-spin text-accent-blue" />
      )}
      <span className="font-sans text-[11px] text-text-secondary">{label}</span>
    </div>
  );
}

function MessageBubble({ message, isStreaming, streamParts }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-xl bg-accent-blue/10 px-3 py-2 text-text-primary">
          <p className="whitespace-pre-wrap font-sans text-[12.5px] leading-[18px]">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  const parts = streamParts || [];
  const hasToolCalls = message.tool_calls && message.tool_calls.length > 0;
  const textContent = message.content || "";

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] px-3 py-2 text-text-primary">
        {isStreaming && parts.length > 0 ? (
          <div>
            {parts.map((part, i) => {
              if (part.type === "text") {
                return (
                  <div key={i} className="chat-prose">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {part.content || " "}
                    </ReactMarkdown>
                  </div>
                );
              }
              if (part.type === "tool") {
                return (
                  <ToolCallChip
                    key={i}
                    name={part.name}
                    done={part.done}
                    error={part.error}
                  />
                );
              }
              return null;
            })}
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-accent-blue" />
          </div>
        ) : (
          <div>
            {hasToolCalls && message.tool_calls.map((tc, i) => (
              <ToolCallChip key={i} name={tc.name} done error={false} />
            ))}
            <div className="chat-prose">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {textContent || " "}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadSidebar({
  conversations,
  activeId,
  searchQuery,
  onSearchChange,
  onSelect,
  onNew,
  onDelete,
  onUpdate,
  onClose,
}) {
  const filtered = searchQuery
    ? conversations.filter((c) =>
        (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : conversations;
  const pinned = filtered.filter((c) => c.pinned);
  const unpinned = filtered.filter((c) => !c.pinned);

  return (
    <div className="flex h-full w-full flex-col border-r border-border-default bg-bg-sidebar">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-text-faint">
          Threads
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onNew}
            className="cursor-pointer rounded p-1 text-text-faint transition-colors hover:bg-bg-hover hover:text-text-primary"
            title="New thread"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-text-faint transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {searchQuery !== null && (
        <div className="px-2 pb-2">
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search threads..."
            className="w-full rounded-md border border-border-default bg-bg-primary px-2.5 py-1.5 font-sans text-[12px] text-text-primary outline-none placeholder:text-text-faint focus:border-text-secondary"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-1.5 pb-2">
        {pinned.length > 0 && (
          <div className="mb-2">
            <span className="px-2 font-sans text-[9px] font-semibold uppercase tracking-widest text-text-faint/50">
              Pinned
            </span>
            {pinned.map((c) => (
              <ConversationItem
                key={c.id}
                conv={c}
                active={c.id === activeId}
                onSelect={onSelect}
                onDelete={onDelete}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        )}
        {unpinned.length > 0 && (
          <div>
            {pinned.length > 0 && (
              <span className="px-2 font-sans text-[9px] font-semibold uppercase tracking-widest text-text-faint/50">
                Recent
              </span>
            )}
            {unpinned.map((c) => (
              <ConversationItem
                key={c.id}
                conv={c}
                active={c.id === activeId}
                onSelect={onSelect}
                onDelete={onDelete}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        )}
        {filtered.length === 0 && (
          <p className="px-2 pt-4 text-center font-sans text-[11px] text-text-faint">
            {searchQuery ? "No matches" : "No conversations yet"}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AIPanel({ onWidthChange }) {
  const { navigateInPlace } = useTabs();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    onWidthChange?.(collapsed ? 40 : 320);
  }, [collapsed, onWidthChange]);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamParts, setStreamParts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [atBottom, setAtBottom] = useState(true);
  const [chatMode, setChatMode] = useState("ask");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const modeMenuRef = useRef(null);

  const scrollToBottom = useCallback((force = false) => {
    if (force || atBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [atBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAtBottom(near);
  }, []);

  useEffect(() => {
    listConversations()
      .then((convs) => {
        setConversations(convs);
        if (convs.length > 0) setActiveConvId(convs[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    getMessages(activeConvId).then(setMessages);
  }, [activeConvId]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, streamParts]);

  useEffect(() => {
    if (!modeMenuOpen) return;
    const handler = (e) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target)) setModeMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modeMenuOpen]);

  const refreshConversations = async () => {
    const convs = await listConversations();
    setConversations(convs);
  };

  const handleNewConversation = async () => {
    const conv = await createConversation("New conversation");
    setConversations((prev) => [conv, ...prev]);
    setActiveConvId(conv.id);
    setMessages([]);
    setSidebarOpen(false);
    setSearchQuery(null);
  };

  const handleDeleteConversation = async (id) => {
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleUpdateConversation = async (id, updates) => {
    const updated = await updateConversation(id, updates);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? updated : c)),
    );
  };

  const handleSend = async () => {
    if (!input.trim() || streaming) return;

    let convId = activeConvId;
    if (!convId) {
      const conv = await createConversation("New conversation");
      setConversations((prev) => [conv, ...prev]);
      convId = conv.id;
      setActiveConvId(convId);
    }

    const userMsg = { id: crypto.randomUUID(), role: "user", content: input.trim(), created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamParts([]);

    let fullText = "";
    let toolCalls = [];

    await sendMessage(convId, userMsg.content, (event) => {
      switch (event.type) {
        case "delta":
          fullText += event.text;
          setStreamParts((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.type === "text") {
              copy[copy.length - 1] = { ...last, content: last.content + event.text };
            } else {
              copy.push({ type: "text", content: event.text });
            }
            return copy;
          });
          break;

        case "tool_start":
          toolCalls.push({ name: event.name, input: event.input });
          setStreamParts((prev) => [
            ...prev,
            { type: "tool", name: event.name, done: false, error: false },
          ]);
          break;

        case "tool_done":
          setStreamParts((prev) => {
            const copy = [...prev];
            for (let i = copy.length - 1; i >= 0; i--) {
              if (copy[i].type === "tool" && copy[i].name === event.name && !copy[i].done) {
                copy[i] = { ...copy[i], done: true, error: !!event.result?.error };
                break;
              }
            }
            return copy;
          });
          break;

        case "navigate":
          if (event.path) {
            const fullPath = event.hash ? `${event.path}${event.hash}` : event.path;
            navigateInPlace(fullPath);
          }
          break;

        case "done":
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: fullText,
              tool_calls: toolCalls.length > 0 ? toolCalls : null,
              created_at: new Date().toISOString(),
            },
          ]);
          setStreamParts([]);
          setStreaming(false);
          refreshConversations();
          break;

        case "error":
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `Error: ${event.error}`,
              created_at: new Date().toISOString(),
            },
          ]);
          setStreamParts([]);
          setStreaming(false);
          break;
      }
    }, { mode: chatMode === "agent" ? "agent" : chatMode === "tutor" ? "tutor" : "ask" });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const toggleSearch = () => {
    if (searchQuery !== null) {
      setSearchQuery(null);
      setSidebarOpen(false);
    } else {
      setSearchQuery("");
      setSidebarOpen(true);
    }
  };

  if (collapsed) {
    return (
      <aside className="flex h-full w-10 shrink-0 flex-col items-center border-l border-border-default bg-bg-sidebar pt-3">
        <button
          onClick={() => setCollapsed(false)}
          className="cursor-pointer rounded p-1 text-text-faint transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <PanelRightOpen className="size-3.5" />
        </button>
      </aside>
    );
  }

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-border-default bg-bg-sidebar">
      {/* Header */}
      <div className="flex h-9 items-center justify-between px-3">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="truncate font-sans text-[12px] font-medium text-text-primary">
            {activeConv?.title || "Ask AI"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewConversation}
            className="cursor-pointer rounded p-1 text-text-faint transition-colors hover:bg-bg-hover hover:text-text-primary"
            title="New conversation"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            onClick={() => {
              setSidebarOpen((v) => !v);
              if (sidebarOpen) setSearchQuery(null);
            }}
            className={`cursor-pointer rounded p-1 transition-colors hover:bg-bg-hover hover:text-text-primary ${
              sidebarOpen && searchQuery === null ? "text-text-primary" : "text-text-faint"
            }`}
            title="Conversations"
          >
            <MessagesSquare className="size-3.5" />
          </button>
          <button
            onClick={toggleSearch}
            className={`cursor-pointer rounded p-1 transition-colors hover:bg-bg-hover hover:text-text-primary ${
              searchQuery !== null ? "text-text-primary" : "text-text-faint"
            }`}
            title="Search conversations"
          >
            <Search className="size-3.5" />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="cursor-pointer rounded p-1 text-text-faint transition-colors hover:bg-bg-hover hover:text-text-primary"
            title="Collapse panel"
          >
            <PanelRightClose className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div className="absolute inset-0 z-20">
            <ThreadSidebar
              conversations={conversations}
              activeId={activeConvId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelect={(id) => {
                setActiveConvId(id);
                setSidebarOpen(false);
                setSearchQuery(null);
              }}
              onNew={handleNewConversation}
              onDelete={handleDeleteConversation}
              onUpdate={handleUpdateConversation}
              onClose={() => {
                setSidebarOpen(false);
                setSearchQuery(null);
              }}
            />
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-text-faint" />
            </div>
          ) : messages.length === 0 && !streaming ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6">
              <p className="text-center font-sans text-[13px] font-medium text-text-primary">
                How can I help?
              </p>
              <p className="text-center font-sans text-[11px] text-text-faint">
                Ask me anything about your courses.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 px-3 py-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {streaming && streamParts.length > 0 && (
                <MessageBubble
                  message={{ role: "assistant", content: "" }}
                  isStreaming
                  streamParts={streamParts}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {!atBottom && messages.length > 3 && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 cursor-pointer items-center gap-1 rounded-full border border-border-default bg-bg-elevated px-2.5 py-1 shadow-lg transition-colors hover:bg-bg-hover"
          >
            <ChevronDown className="size-3 text-text-secondary" />
            <span className="font-sans text-[10px] text-text-secondary">New messages</span>
          </button>
        )}
      </div>

      {/* Bottom input area */}
      <div className="flex flex-col gap-2 p-1.5">
        <div className="flex flex-col overflow-hidden rounded-[10px] border border-border-default bg-bg-primary">
          <div className="p-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={4}
              disabled={streaming}
              className="w-full resize-none bg-transparent font-sans text-[13px] leading-4 text-text-primary outline-none placeholder:text-text-faint disabled:opacity-50"
            />
          </div>

          <div className="flex h-[33.5px] items-center justify-between px-1.5">
            <div className="relative" ref={modeMenuRef}>
              <button
                onClick={() => setModeMenuOpen((v) => !v)}
                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-accent-pill px-1.5 py-0.5 transition-colors hover:bg-bg-hover"
              >
                <Link2 className="size-3 text-text-secondary" />
                <span className="font-sans text-[11px] leading-[16.5px] text-text-secondary">
                  {chatMode === "agent" ? "Do" : chatMode === "tutor" ? "Tutor" : "Ask"}
                </span>
                <ChevronDown className="size-3 text-text-secondary" />
              </button>
              {modeMenuOpen && (
                <div className="absolute bottom-full left-0 z-50 mb-1 rounded-md border border-border-default bg-bg-card py-1 shadow-lg">
                  <button
                    onClick={() => { setChatMode("ask"); setModeMenuOpen(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left font-sans text-[11px] transition-colors hover:bg-bg-hover ${chatMode === "ask" ? "bg-bg-hover text-text-primary" : "text-text-secondary"}`}
                  >
                    Ask — chat only, no tools
                  </button>
                  <button
                    onClick={() => { setChatMode("agent"); setModeMenuOpen(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left font-sans text-[11px] transition-colors hover:bg-bg-hover ${chatMode === "agent" ? "bg-bg-hover text-text-primary" : "text-text-secondary"}`}
                  >
                    Do — can use tools
                  </button>
                  <button
                    onClick={() => { setChatMode("tutor"); setModeMenuOpen(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left font-sans text-[11px] transition-colors hover:bg-bg-hover ${chatMode === "tutor" ? "bg-bg-hover text-text-primary" : "text-text-secondary"}`}
                  >
                    Tutor — explain step by step
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button className="cursor-pointer transition-colors hover:text-text-primary">
                <Globe className="size-3.5 text-text-secondary" />
              </button>
              <button className="cursor-pointer transition-colors hover:text-text-primary">
                <ImageIcon className="size-3.5 text-text-secondary" />
              </button>
              <button
                onClick={handleSend}
                disabled={streaming}
                className={`flex size-5 cursor-pointer items-center justify-center rounded-full transition-colors ${
                  input.trim() && !streaming
                    ? "bg-accent-blue hover:opacity-90"
                    : "bg-bg-chip opacity-50"
                }`}
              >
                {streaming ? (
                  <Loader2 className="size-3 animate-spin text-black" />
                ) : (
                  <ArrowUp className={`size-3 ${input.trim() ? "text-white" : "text-text-faint"}`} />
                )}
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
