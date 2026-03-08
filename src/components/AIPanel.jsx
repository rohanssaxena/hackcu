import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings, X, Link2, ChevronDown, ArrowUp,
  BookOpen, Layers, RotateCcw, Loader2, Sparkles, User,
} from "lucide-react";
import { useCourse } from "../context/CourseContext";
import { getFullSnapshot } from "../services/canvasAPI";

function inlineFormat(text) {
  const parts = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  let last = 0, match, key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={key++}>{text.slice(last, match.index)}</span>);
    const raw = match[0];
    if (raw.startsWith("**"))
      parts.push(<strong key={key++} className="font-semibold text-white">{raw.slice(2, -2)}</strong>);
    else
      parts.push(<em key={key++} className="italic text-text-secondary">{raw.slice(1, -1)}</em>);
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return parts.length ? parts : text;
}

function renderMarkdown(text) {
  const lines = text.split("\n");
  const result = [];
  lines.forEach((line, i) => {
    if (!line.trim()) {
      result.push(<div key={i} className="h-1" />);
    } else if (line.startsWith("## ")) {
      result.push(
        <p key={i} className="font-sans text-[10px] font-semibold text-text-faint uppercase tracking-widest mt-2 mb-0.5">
          {inlineFormat(line.slice(3))}
        </p>
      );
    } else if (line.startsWith("# ")) {
      result.push(
        <p key={i} className="font-sans text-[12px] font-semibold text-white mt-1">
          {inlineFormat(line.slice(2))}
        </p>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)[1];
      const rest = line.replace(/^\d+\.\s*/, "");
      result.push(
        <div key={i} className="flex gap-1.5 items-baseline">
          <span className="font-mono text-[10px] text-accent-blue shrink-0">{num}.</span>
          <span className="font-sans text-[12px] text-text-primary leading-relaxed">{inlineFormat(rest)}</span>
        </div>
      );
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      result.push(
        <div key={i} className="flex gap-2 items-baseline">
          <span className="text-accent-blue shrink-0 text-[7px] mt-1.5">●</span>
          <span className="font-sans text-[12px] text-text-primary leading-relaxed">{inlineFormat(line.slice(2))}</span>
        </div>
      );
    } else {
      result.push(
        <p key={i} className="font-sans text-[12px] text-text-primary leading-relaxed">
          {inlineFormat(line)}
        </p>
      );
    }
  });
  return <div className="flex flex-col gap-0.5">{result}</div>;
}

function parseActions(text) {
  const actions = [];
  const clean = text.replace(/\[ACTION:(.*?)\]/g, (_, json) => {
    try { actions.push(JSON.parse(json)); } catch {}
    return "";
  }).trim();
  return { clean, actions };
}

function buildSystemPrompt(courses, recommendedCourses = []) {
  const now = new Date();
  const courseList = courses.map(c => {
    const upcoming = (c.assignments || [])
      .filter(a => a.dueAt && !a.submitted)
      .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
      .slice(0, 5)
      .map(a => {
        const h = Math.round((new Date(a.dueAt) - now) / 36e5);
        const due = h < 24 ? "due today" : h < 48 ? "due tomorrow" : "due in " + Math.ceil(h / 24) + " days";
        return "  - [id:" + a.id + "] " + a.name + " (" + due + ")";
      }).join("\n");
    return c.courseCode + " — " + c.shortName + (upcoming ? "\n" + upcoming : "\n  (no upcoming assignments)");
  }).join("\n\n");

  return "You are Micro, an intelligent study assistant embedded in a student's academic dashboard. You have real-time access to the student's Canvas courses and assignments.\n\nToday is " + now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) + ".\n\nSTUDENT'S CURRENT COURSES AND UPCOMING ASSIGNMENTS:\n" + (courseList || "No courses loaded yet.") + "\n\nYour job is to give sharp, actionable study advice. Be concise and direct — no fluff. Use the actual course codes and assignment names from their data.\n\nIMPORTANT — ACTION CARDS:\nWhen you recommend a specific course to study or review, append action cards using this exact format at the END of your message (after your text):\n[ACTION:{\"type\":\"workspace\",\"courseCode\":\"CSCI 3202\",\"label\":\"Open CSCI 3202 workspace\"}]\n[ACTION:{\"type\":\"review\",\"courseCode\":\"CSCI 3202\",\"label\":\"Review flashcards for CSCI 3202\"}]\n[ACTION:{\"type\":\"assignment\",\"courseCode\":\"CSCI 3202\",\"assignmentId\":\"12345\",\"label\":\"Open Quiz 6 on Canvas\"}]\n\nRules for action cards:\n- Only include them when recommending specific courses\n- courseCode must exactly match one of the student courses\n- Recommend ONE primary course per response — focus your advice on that one course\n- Always include a workspace and review card for the primary course\n- When you mention a specific assignment by name, add an assignment card for it using its [id:XXX] from the data\n- If you mention a second course briefly, add only a workspace card for it\n- Max 5 action cards per response\n- Do not explain the action cards in your text, just append them silently\n- CRITICAL: Whenever you name a specific assignment as top priority or most urgent, you MUST emit an assignment action card for it using its [id:XXX] from the data above. No exceptions — if you call it out by name, link it." + (recommendedCourses.length ? "\n\nCOURSES ALREADY RECOMMENDED THIS SESSION (do not recommend these again unless the user explicitly asks about them): " + recommendedCourses.join(", ") : "");
}

function MessageBubble({ msg, onAction }) {
  const { clean, actions } = parseActions(msg.content);
  return (
    <div className={"flex gap-2 " + (msg.role === "user" ? "justify-end" : "justify-start")}>
      {msg.role === "assistant" && (
        <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-blue/20">
          <Sparkles className="size-3 text-accent-blue" />
        </div>
      )}
      <div className={"flex flex-col gap-2 max-w-[85%] " + (msg.role === "user" ? "items-end" : "items-start")}>
        <div className={"rounded-2xl px-3 py-2 " + (msg.role === "user"
          ? "bg-accent-blue text-white rounded-br-sm font-sans text-[12px] leading-relaxed"
          : "bg-[#2a2a2e] text-text-primary rounded-bl-sm")}>
          {msg.role === "user" ? clean : renderMarkdown(clean)}
        </div>
        {actions.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full">
            {actions.map((action, i) => (
              <button key={i} onClick={() => onAction(action)}
                className={"flex items-center gap-2 rounded-xl border px-3 py-2 text-left font-sans text-[11px] transition-all hover:scale-[1.01] cursor-pointer " + (
                  action.type === "review"
                    ? "border-accent-green/30 bg-accent-green/5 text-accent-green hover:bg-accent-green/10"
                    : action.type === "assignment"
                    ? "border-yellow-400/30 bg-yellow-400/5 text-yellow-400 hover:bg-yellow-400/10"
                    : "border-accent-blue/30 bg-accent-blue/5 text-accent-blue hover:bg-accent-blue/10"
                )}>
                {action.type === "review" ? <Layers className="size-3.5 shrink-0" /> : action.type === "assignment" ? <span className="text-[10px] shrink-0">↗</span> : <BookOpen className="size-3.5 shrink-0" />}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {msg.role === "user" && (
        <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#3a3a3e]">
          <User className="size-3 text-text-secondary" />
        </div>
      )}
    </div>
  );
}

const SUGGESTIONS = [
  "Which class should I study next?",
  "What's due soon?",
  "Help me make a study plan for today",
  "Which course needs the most attention?",
];

export default function AIPanel() {
  const navigate = useNavigate();
  const { courses: rawCourses, selectCourse } = useCourse();
  const [courses, setCourses] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [mode, setMode] = useState("Ask");
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { getFullSnapshot().then(setCourses).catch(() => {}); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send(text) {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!key) throw new Error("VITE_ANTHROPIC_API_KEY not set");
      const res = await fetch("/anthropic-api/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: buildSystemPrompt(courses, recommendedCourses),
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text ?? "Sorry, I could not get a response.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      // Track recommended courses from action cards in the reply
      const actionMatches = [...reply.matchAll(/\[ACTION:\{"type":"(?:workspace|review)","courseCode":"([^"]+)"/g)];
      const newCodes = actionMatches.map(m => m[1]).filter(Boolean);
      if (newCodes.length) {
        setRecommendedCourses(prev => [...new Set([...prev, ...newCodes])]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Error: " + e.message }]);
    } finally {
      setLoading(false);
    }
  }

  function handleAction(action) {
    if (action.type === "assignment") {
      // Find courseId from snapshot courses
      const snapCourse = courses.find(c => c.courseCode === action.courseCode);
      const courseId = snapCourse?.id;
      if (courseId && action.assignmentId) {
        window.open("https://canvas.colorado.edu/courses/" + courseId + "/assignments/" + action.assignmentId, "_blank");
      }
      return;
    }
    const course = rawCourses.find(c =>
      c.course_code?.includes(action.courseCode) || c.name?.includes(action.courseCode)
    );
    if (course) selectCourse(course);
    navigate(action.type === "review" ? "/review" : "/workspace");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-border-default bg-bg-sidebar">
      <div className="flex h-9 shrink-0 items-center justify-between px-4 border-b border-border-default">
        <div className="flex items-center gap-2.5">
          <button className="cursor-pointer rounded px-1.5 py-0.5 font-sans text-[11px] bg-[#454546] text-white">Ask AI</button>
          <button className="cursor-pointer rounded px-1.5 py-0.5 font-sans text-[11px] bg-accent-pill text-text-primary hover:bg-[#3a3a3a] transition-colors">Actions</button>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={() => { setMessages([]); setRecommendedCourses([]); }} className="cursor-pointer transition-colors hover:text-white" title="Clear chat">
              <RotateCcw className="size-3.5 text-text-secondary" />
            </button>
          )}
          <button className="cursor-pointer transition-colors hover:text-white"><Settings className="size-3.5 text-text-secondary" /></button>
          <button className="cursor-pointer transition-colors hover:text-white"><X className="size-3.5 text-text-secondary" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-accent-blue" />
                <span className="font-sans text-[12px] font-medium text-text-primary">Micro AI</span>
              </div>
              <p className="font-sans text-[11px] text-text-secondary leading-relaxed">
                Ask me anything about your courses, deadlines, or what to study next.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="rounded-xl border border-border-default px-3 py-2 text-left font-sans text-[11px] text-text-secondary transition-colors hover:bg-[#2a2a2e] hover:text-text-primary cursor-pointer">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} onAction={handleAction} />)}
            {loading && (
              <div className="flex items-center gap-2">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-blue/20">
                  <Sparkles className="size-3 text-accent-blue" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-[#2a2a2e] px-3 py-2">
                  <Loader2 className="size-3 animate-spin text-text-faint" />
                  <span className="font-sans text-[11px] text-text-faint">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 p-1.5 shrink-0">
        <div className="flex flex-col overflow-hidden rounded-[10px] border border-border-default bg-bg-primary">
          <div className="p-3">
            <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="Ask anything..." rows={3}
              className="w-full resize-none bg-transparent font-sans text-[13px] leading-4 text-text-primary outline-none placeholder:text-[#666]" />
          </div>
          <div className="flex h-[33.5px] items-center justify-between px-1.5">
            <div className="relative">
              <button onClick={() => setModeOpen(!modeOpen)}
                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-accent-pill px-1.5 py-0.5 transition-colors hover:bg-[#3a3a3a]">
                <Link2 className="size-3 text-[#a1a1a1]" />
                <span className="font-sans text-[11px] leading-[16.5px] text-[#a1a1a1]">{mode}</span>
                <ChevronDown className="size-3 text-[#a1a1a1]" />
              </button>
              {modeOpen && (
                <div className="absolute bottom-full left-0 mb-1 w-28 overflow-hidden rounded-md border border-border-default bg-[#2a2a2a] py-1 shadow-lg">
                  {["Ask", "Act", "Advise"].map((opt) => (
                    <button key={opt} onClick={() => { setMode(opt); setModeOpen(false); }}
                      className={"flex w-full cursor-pointer items-center px-3 py-1.5 text-left font-sans text-[12px] transition-colors hover:bg-[#393939] " + (mode === opt ? "text-white" : "text-text-secondary")}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => send()} disabled={!input.trim() || loading}
              className={"flex size-5 cursor-pointer items-center justify-center rounded-full transition-colors " + (input.trim() && !loading ? "bg-white hover:bg-gray-200" : "bg-[#555] cursor-not-allowed")}>
              <ArrowUp className={"size-3 " + (input.trim() && !loading ? "text-black" : "text-[#888]")} />
            </button>
          </div>
        </div>
        <button className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-text-primary">
          <div className="size-3 rounded-md border border-text-secondary" />
          <span className="font-sans text-[11px] leading-[16.5px] text-text-secondary">Local</span>
          <ChevronDown className="size-3 text-text-secondary" />
        </button>
      </div>
    </aside>
  );
}