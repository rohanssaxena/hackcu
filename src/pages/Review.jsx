import { useState, useEffect, useCallback } from "react";
import {
  Layers, ListChecks, Sparkles, Loader2, FileText,
  Check, X, ChevronLeft, ChevronRight, RotateCcw, AlertTriangle, Upload,
} from "lucide-react";
import { getFiles } from "../services/canvasAPI";
import { useCourse } from "../context/CourseContext";

// ── Helpers ────────────────────────────────────────────────────────────────
function getAnthropicKey() { return import.meta.env.VITE_ANTHROPIC_API_KEY; }

function storageKey(courseId) { return `micro_review_${courseId}`; }

// localStorage used as fast cache; Supabase is source of truth
function loadCached(courseId) {
  try { return JSON.parse(localStorage.getItem(storageKey(courseId)) || "null"); }
  catch { return null; }
}
function writeCache(courseId, data) {
  localStorage.setItem(storageKey(courseId), JSON.stringify(data));
}
function clearCache(courseId) {
  localStorage.removeItem(storageKey(courseId));
}

async function loadFromSupabase(supabase, courseId) {
  try {
    const userId = localStorage.getItem("micro_user_email") || "anonymous";
    const { data, error } = await supabase
      .from("study_sets")
      .select("terms, questions, generated_at")
      .eq("user_id", userId)
      .eq("course_id", String(courseId))
      .single();
    if (error || !data) return null;
    return { terms: data.terms, questions: data.questions, generatedAt: new Date(data.generated_at).getTime() };
  } catch { return null; }
}

async function saveToSupabase(supabase, courseId, result) {
  try {
    const userId = localStorage.getItem("micro_user_email") || "anonymous";
    await supabase.from("study_sets").upsert({
      user_id: userId,
      course_id: String(courseId),
      terms: result.terms,
      questions: result.questions,
      generated_at: new Date(result.generatedAt).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,course_id" });
  } catch { /* non-fatal */ }
}

async function deleteFromSupabase(supabase, courseId) {
  try {
    const userId = localStorage.getItem("micro_user_email") || "anonymous";
    await supabase.from("study_sets").delete()
      .eq("user_id", userId).eq("course_id", String(courseId));
  } catch { /* non-fatal */ }
}

async function pdfToBase64(canvasFile, token) {
  const sep = canvasFile.url.includes("?") ? "&" : "?";
  const url  = `${canvasFile.url}${sep}access_token=${token}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`PDF download failed: HTTP ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function localFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function extractFromLocalFile(file) {
  const key = getAnthropicKey();
  if (!key) throw new Error("VITE_ANTHROPIC_API_KEY not set");
  const base64 = await localFileToBase64(file);
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
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: `Extract study material from this lecture PDF.

Return ONLY a raw JSON object, no markdown fences:
{
  "terms": [
    { "term": "...", "definition": "1-3 sentence explanation", "category": "definition"|"person"|"event"|"equation"|"concept" }
  ],
  "questions": [
    { "question": "...", "answer": "explanation of correct answer", "options": ["plain string","plain string","plain string","plain string"], "correct": 0, "difficulty": "easy"|"medium"|"hard" }
  ]
}

Rules: min 10 terms, min 6 questions. options are plain strings (no A/B/C prefix). correct is 0-based index.` },
        ],
      }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const raw  = data.content?.[0]?.text ?? "{}";
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { throw new Error("Claude returned invalid JSON"); }
}

async function extractFromFile(file, token) {
  const key    = getAnthropicKey();
  if (!key) throw new Error("VITE_ANTHROPIC_API_KEY not set — restart dev server after adding to .env");
  const base64 = await pdfToBase64(file, token);
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
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: `Extract study material from this lecture PDF.

Return ONLY a raw JSON object, no markdown fences:
{
  "terms": [
    { "term": "...", "definition": "1-3 sentence explanation", "category": "definition"|"person"|"event"|"equation"|"concept" }
  ],
  "questions": [
    { "question": "...", "answer": "explanation of correct answer", "options": ["plain string","plain string","plain string","plain string"], "correct": 0, "difficulty": "easy"|"medium"|"hard" }
  ]
}

Rules: min 10 terms, min 6 questions. options are plain strings (no A/B/C prefix). correct is 0-based index.` },
        ],
      }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const raw  = data.content?.[0]?.text ?? "{}";
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { throw new Error("Claude returned invalid JSON"); }
}

// ── Supabase progress writes ───────────────────────────────────────────────
async function recordFlashcard(supabase, courseId, term, known) {
  try {
    const userId = localStorage.getItem("micro_user_email") || "anonymous";
    await supabase.from("flashcard_results").insert({
      user_id: userId, course_id: String(courseId), term, known,
    });
  } catch { /* non-fatal */ }
}

async function recordQuizAttempt(supabase, courseId, score, total) {
  try {
    const userId = localStorage.getItem("micro_user_email") || "anonymous";
    await supabase.from("quiz_results").insert({
      user_id: userId, course_id: String(courseId), score, total,
    });
  } catch { /* non-fatal */ }
}

// ── Category pill ──────────────────────────────────────────────────────────
const CAT = {
  definition: "text-accent-blue  border-accent-blue/30  bg-accent-blue/10",
  person:     "text-purple-400   border-purple-400/30   bg-purple-400/10",
  event:      "text-yellow-400   border-yellow-400/30   bg-yellow-400/10",
  equation:   "text-accent-green border-accent-green/30 bg-accent-green/10",
  concept:    "text-orange-400   border-orange-400/30   bg-orange-400/10",
};
function CategoryPill({ cat }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider ${CAT[cat] ?? CAT.concept}`}>
      {cat}
    </span>
  );
}

// ── Flashcards ─────────────────────────────────────────────────────────────
function Flashcards({ terms, courseId, supabase }) {
  // deck = indices into terms[], reshuffled with "still learning" cards added back
  const [deck,    setDeck]    = useState(() => terms.map((_, i) => i));
  const [pos,     setPos]     = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known,   setKnown]   = useState(new Set());   // term strings mastered this session
  const [unknown, setUnknown] = useState(new Set());   // term strings still learning
  const [done,    setDone]    = useState(false);

  const cardIdx = deck[pos];
  const card    = terms[cardIdx];
  const total   = terms.length;

  function advance() {
    setFlipped(false);
    setTimeout(() => {
      if (pos + 1 >= deck.length) {
        // end of current deck pass
        const remaining = deck.filter(i => unknown.has(terms[i].term));
        if (remaining.length === 0) {
          setDone(true);
        } else {
          // Re-queue only the "still learning" cards, shuffled
          const shuffled = [...remaining].sort(() => Math.random() - 0.5);
          setDeck(shuffled);
          setPos(0);
        }
      } else {
        setPos(p => p + 1);
      }
    }, 120);
  }

  function markKnown() {
    recordFlashcard(supabase, courseId, card.term, true);
    setKnown(s => new Set([...s, card.term]));
    setUnknown(s => { const n = new Set(s); n.delete(card.term); return n; });
    advance();
  }

  function markUnknown() {
    recordFlashcard(supabase, courseId, card.term, false);
    setUnknown(s => new Set([...s, card.term]));
    setKnown(s => { const n = new Set(s); n.delete(card.term); return n; });
    advance();
  }

  function reset() {
    setDeck(terms.map((_, i) => i));
    setPos(0);
    setFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());
    setDone(false);
  }

  const reviewed = known.size + unknown.size;
  const progress = total ? (known.size / total) * 100 : 0;

  // ── Done screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border-default bg-bg-elevated p-10 text-center">
          <span className="text-4xl">🎉</span>
          <p className="font-sans text-[20px] font-semibold text-text-primary">All cards mastered!</p>
          <p className="font-sans text-[13px] text-text-secondary">
            You got through all {total} terms. Nice work.
          </p>
          <button onClick={reset}
            className="flex items-center gap-2 cursor-pointer rounded-xl bg-accent-blue px-6 py-2.5 font-sans text-[13px] font-medium text-white hover:brightness-110 transition-all">
            <RotateCcw className="size-4" /> Study again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-text-secondary">{pos + 1} / {deck.length}</span>
          {unknown.size > 0 && (
            <span className="font-sans text-[10px] text-red-400/70 italic">
              +{unknown.size} still learning
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="font-sans text-[11px] text-accent-green">{known.size} known</span>
          <span className="font-sans text-[11px] text-red-400">{unknown.size} learning</span>
          <button onClick={reset} className="cursor-pointer text-text-secondary hover:text-text-primary transition-colors">
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar — fills based on mastered / total */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-bg-elevated">
        <div className="h-full rounded-full bg-accent-green transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Card */}
      <div onClick={() => setFlipped(v => !v)}
        className="relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-border-default bg-bg-elevated p-10 select-none transition-all hover:border-accent-blue/30 hover:bg-[#252528]">
        <CategoryPill cat={card.category} />
        {!flipped ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="font-sans text-[24px] font-semibold text-text-primary">{card.term}</p>
            <p className="font-sans text-[11px] text-text-faint">click to flip</p>
          </div>
        ) : (
          <p className="font-sans text-[15px] leading-[24px] text-text-primary text-center max-w-lg">{card.definition}</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => { setFlipped(false); setTimeout(() => setPos(p => Math.max(0, p - 1)), 120); }}
          disabled={pos === 0}
          className="flex items-center gap-1.5 cursor-pointer rounded-lg border border-border-default px-4 py-2 font-sans text-[12px] text-text-secondary hover:bg-[#2e2e2e] hover:text-text-primary transition-colors disabled:opacity-30">
          <ChevronLeft className="size-3.5" /> Prev
        </button>
        {flipped ? (
          <div className="flex items-center gap-2">
            <button onClick={markUnknown}
              className="flex items-center gap-1.5 cursor-pointer rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 font-sans text-[12px] text-red-400 hover:bg-red-400/20 transition-colors">
              <X className="size-3.5" /> Still learning
            </button>
            <button onClick={markKnown}
              className="flex items-center gap-1.5 cursor-pointer rounded-lg border border-accent-green/30 bg-accent-green/10 px-4 py-2 font-sans text-[12px] text-accent-green hover:bg-accent-green/20 transition-colors">
              <Check className="size-3.5" /> Got it
            </button>
          </div>
        ) : (
          <button onClick={() => setFlipped(true)}
            className="flex items-center gap-1.5 cursor-pointer rounded-lg border border-border-default px-4 py-2 font-sans text-[12px] text-text-secondary hover:bg-[#2e2e2e] hover:text-text-primary transition-colors">
            Flip card
          </button>
        )}
        <button onClick={() => { setFlipped(false); setTimeout(() => setPos(p => Math.min(deck.length - 1, p + 1)), 120); }}
          disabled={pos === deck.length - 1}
          className="flex items-center gap-1.5 cursor-pointer rounded-lg border border-border-default px-4 py-2 font-sans text-[12px] text-text-secondary hover:bg-[#2e2e2e] hover:text-text-primary transition-colors disabled:opacity-30">
          Next <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Quiz ───────────────────────────────────────────────────────────────────
const DIFF = {
  easy:   "border-accent-green/30 text-accent-green",
  medium: "border-yellow-400/30  text-yellow-400",
  hard:   "border-red-400/30     text-red-400",
};

function Quiz({ questions, courseId, supabase }) {
  const [idx,      setIdx]      = useState(0);
  const [selected, setSelected] = useState(null);
  const [log,      setLog]      = useState([]);
  const [done,     setDone]     = useState(false);
  const [saved,    setSaved]    = useState(false);

  const q     = questions[idx];
  const total = questions.length;

  function pick(i) {
    if (selected !== null) return;
    setSelected(i);
    setLog(l => [...l, { correct: i === q.correct }]);
  }
  function next() {
    if (idx < total - 1) { setIdx(i => i + 1); setSelected(null); }
    else setDone(true);
  }
  function reset() { setIdx(0); setSelected(null); setLog([]); setDone(false); setSaved(false); }

  // Save score to Supabase when quiz completes
  useEffect(() => {
    if (done && !saved) {
      const score = log.filter(l => l.correct).length;
      recordQuizAttempt(supabase, courseId, score, total);
      setSaved(true);
    }
  }, [done, saved, log, total, supabase, courseId]);

  if (done) {
    const score = log.filter(l => l.correct).length;
    const pct   = Math.round((score / total) * 100);
    const color = pct >= 80 ? "text-accent-green" : pct >= 60 ? "text-yellow-400" : "text-red-400";
    return (
      <div className="flex flex-col items-center gap-6 py-8 max-w-2xl">
        <div className="flex flex-col items-center gap-1">
          <span className={`font-sans text-[56px] font-bold leading-none ${color}`}>{pct}%</span>
          <p className="font-sans text-[13px] text-text-secondary">{score} of {total} correct</p>
        </div>
        <div className="flex w-full flex-col gap-2">
          {questions.map((q, i) => {
            const ok = log[i]?.correct;
            return (
              <div key={i} className={`flex items-start gap-3 rounded-xl border p-3 ${ok ? "border-accent-green/20 bg-accent-green/5" : "border-red-400/20 bg-red-400/5"}`}>
                {ok ? <Check className="size-4 shrink-0 text-accent-green mt-0.5" /> : <X className="size-4 shrink-0 text-red-400 mt-0.5" />}
                <div className="flex flex-col gap-0.5">
                  <p className="font-sans text-[12px] text-text-primary">{q.question}</p>
                  {!ok && <p className="font-sans text-[11px] text-accent-green">✓ {q.options[q.correct]}</p>}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={reset}
          className="flex items-center gap-2 cursor-pointer rounded-xl bg-accent-blue px-6 py-2.5 font-sans text-[13px] font-medium text-white hover:brightness-110 transition-all">
          <RotateCcw className="size-3.5" /> Retake
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-text-secondary">Question {idx + 1} / {total}</span>
        <span className={`rounded-full border px-2 py-0.5 font-sans text-[10px] ${DIFF[q.difficulty] ?? DIFF.medium}`}>{q.difficulty}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-bg-elevated">
        <div className="h-full rounded-full bg-accent-blue transition-all duration-300" style={{ width: `${(idx / total) * 100}%` }} />
      </div>
      <p className="font-sans text-[17px] font-medium leading-[26px] text-text-primary">{q.question}</p>
      <div className="flex flex-col gap-2">
        {q.options.map((opt, i) => {
          let cls = "border-border-default bg-bg-elevated hover:border-accent-blue/40 hover:bg-[#252528]";
          if (selected !== null) {
            if      (i === q.correct)                   cls = "border-accent-green/50 bg-accent-green/10";
            else if (i === selected && i !== q.correct)  cls = "border-red-400/50 bg-red-400/10";
            else                                         cls = "border-border-default bg-bg-elevated opacity-40";
          }
          return (
            <button key={i} onClick={() => pick(i)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left cursor-pointer transition-all ${cls}`}>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border-default font-mono text-[11px] text-text-secondary">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="font-sans text-[13px] text-text-primary flex-1">{opt}</span>
              {selected !== null && i === q.correct && <Check className="ml-auto size-4 shrink-0 text-accent-green" />}
              {selected !== null && i === selected && i !== q.correct && <X className="ml-auto size-4 shrink-0 text-red-400" />}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div className="flex flex-col gap-3">
          <div className={`rounded-xl border p-4 ${selected === q.correct ? "border-accent-green/20 bg-accent-green/5" : "border-red-400/20 bg-red-400/5"}`}>
            <p className="font-sans text-[12px] leading-[18px] text-text-secondary">
              <span className={`font-semibold ${selected === q.correct ? "text-accent-green" : "text-red-400"}`}>
                {selected === q.correct ? "Correct! " : "Not quite. "}
              </span>
              {q.answer}
            </p>
          </div>
          <button onClick={next}
            className="flex items-center justify-center gap-2 cursor-pointer rounded-xl bg-accent-blue px-4 py-2.5 font-sans text-[13px] font-medium text-white hover:brightness-110 transition-all">
            {idx < total - 1 ? <>Next question <ChevronRight className="size-3.5" /></> : "See results"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── File selector ──────────────────────────────────────────────────────────
function FileSelector({ files, selected, onToggle }) {
  return (
    <div className="flex flex-col gap-1.5">
      {files.map(f => {
        const on = selected.has(f.id);
        const mb = f.size ? `${(f.size / 1048576).toFixed(1)} MB` : "";
        return (
          <button key={f.id} onClick={() => onToggle(f.id)}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${on ? "border-accent-blue/40 bg-[#1e2a3a]" : "border-border-default bg-bg-elevated hover:bg-[#252528]"}`}>
            <div className={`flex size-5 shrink-0 items-center justify-center rounded border transition-all ${on ? "border-accent-blue bg-accent-blue" : "border-border-default"}`}>
              {on && <Check className="size-3 text-white" strokeWidth={3} />}
            </div>
            <FileText className="size-4 shrink-0 text-red-400" />
            <span className="font-sans text-[12px] text-text-primary truncate flex-1">{f.display_name || f.filename}</span>
            <span className="font-mono text-[10px] text-text-faint shrink-0">{mb}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Regenerate confirm dialog ──────────────────────────────────────────────
function RegenerateWarning({ onConfirm, onCancel }) {
  return (
    <div className="flex flex-col gap-4 max-w-md rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 shrink-0 text-yellow-400 mt-0.5" />
        <div className="flex flex-col gap-1">
          <p className="font-sans text-[13px] font-medium text-text-primary">Regenerate flashcards?</p>
          <p className="font-sans text-[12px] text-text-secondary leading-[18px]">
            This will replace your existing {" "}set and cost API credits (a few cents). Your progress history is preserved.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onConfirm}
          className="flex items-center gap-1.5 cursor-pointer rounded-lg bg-accent-blue px-4 py-2 font-sans text-[12px] font-medium text-white hover:brightness-110 transition-all">
          <Sparkles className="size-3.5" /> Yes, regenerate
        </button>
        <button onClick={onCancel}
          className="cursor-pointer rounded-lg border border-border-default px-4 py-2 font-sans text-[12px] text-text-secondary hover:bg-[#2e2e2e] hover:text-text-primary transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Review() {
  const { activeCourse, shortCode, supabase } = useCourse();
  const token = localStorage.getItem("micro_canvas_token") || import.meta.env.VITE_CANVAS_TOKEN;

  const courseId = activeCourse?.id;

  const [files,        setFiles]        = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selected,     setSelected]     = useState(new Set());
  const [generating,   setGenerating]   = useState(false);
  const [progress,     setProgress]     = useState("");
  const [data,         setData]         = useState(null);
  const [mode,         setMode]         = useState("flashcards");
  const [error,        setError]        = useState(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [addingMore,   setAddingMore]   = useState(false);
  const [moreSelected, setMoreSelected] = useState(new Set());
  const [moreLocalFiles, setMoreLocalFiles] = useState([]);
  const [localUploadFiles, setLocalUploadFiles] = useState([]); // File objects from disk

  // Load saved data + files whenever course changes
  useEffect(() => {
    if (!courseId) return;
    setError(null);
    setConfirmRegen(false);
    setMode("flashcards");

    // Load from localStorage cache immediately for fast render
    const cached = loadCached(courseId);
    setData(cached);

    // Then fetch from Supabase as source of truth
    loadFromSupabase(supabase, courseId).then(remote => {
      if (remote) {
        setData(remote);
        writeCache(courseId, remote); // keep cache in sync
      }
    });

    setFilesLoading(true);
    getFiles(courseId)
      .then(all => {
        const pdfs = all.filter(f =>
          (f["content-type"] || "").includes("pdf") || (f.filename || "").endsWith(".pdf")
        );
        setFiles(pdfs);
        setSelected(new Set(pdfs.slice(0, 3).map(f => f.id)));
      })
      .catch(() => setFiles([]))
      .finally(() => setFilesLoading(false));
  }, [courseId]);

  function toggleFile(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function generate() {
    const key = getAnthropicKey();
    if (!key) { setError("Add VITE_ANTHROPIC_API_KEY to .env and restart dev server."); return; }
    if (!selected.size && !localUploadFiles.length) { setError("Select at least one file or upload a PDF."); return; }

    setGenerating(true);
    setError(null);
    setConfirmRegen(false);

    const canvasFiles = files.filter(f => selected.has(f.id));
    const totalCount = canvasFiles.length + localUploadFiles.length;
    const allTerms = [], allQs = [];

    try {
      // Process Canvas files
      for (let i = 0; i < canvasFiles.length; i++) {
        const f = canvasFiles[i];
        setProgress(`Analyzing ${f.display_name || f.filename} (${i + 1}/${totalCount})…`);
        const extracted = await extractFromFile(f, token);
        const src = f.display_name || f.filename;
        (extracted.terms     || []).forEach(t => allTerms.push({ ...t, source: src }));
        (extracted.questions || []).forEach(q => allQs.push({   ...q, source: src }));
      }
      // Process locally uploaded files
      for (let i = 0; i < localUploadFiles.length; i++) {
        const f = localUploadFiles[i];
        setProgress(`Analyzing ${f.name} (${canvasFiles.length + i + 1}/${totalCount})…`);
        const extracted = await extractFromLocalFile(f);
        const src = f.name;
        (extracted.terms     || []).forEach(t => allTerms.push({ ...t, source: src }));
        (extracted.questions || []).forEach(q => allQs.push({   ...q, source: src }));
      }
      if (!allTerms.length) throw new Error("Nothing extracted — the PDFs may be image-only or locked.");
      const result = { terms: allTerms, questions: allQs, generatedAt: Date.now() };
      writeCache(courseId, result);
      await saveToSupabase(supabase, courseId, result);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
      setProgress("");
    }
  }

  function handleRegenClick() { setConfirmRegen(true); }
  function handleClear() { clearCache(courseId); deleteFromSupabase(supabase, courseId); setData(null); setConfirmRegen(false); }

  const ingestedSources = new Set((data?.terms || []).map(t => t.source));

  async function generateMore() {
    const key = getAnthropicKey();
    if (!key) { setError("Add VITE_ANTHROPIC_API_KEY to .env and restart dev server."); return; }
    if (!moreSelected.size && !moreLocalFiles.length) { setError("Select at least one file or upload a PDF."); return; }
    setGenerating(true);
    setError(null);
    const canvasMore = files.filter(f => moreSelected.has(f.id));
    const totalMore = canvasMore.length + moreLocalFiles.length;
    const newTerms = [], newQs = [];
    try {
      for (let i = 0; i < canvasMore.length; i++) {
        const f = canvasMore[i];
        setProgress(`Analyzing ${f.display_name || f.filename} (${i + 1}/${totalMore})...`);
        const extracted = await extractFromFile(f, token);
        const src = f.display_name || f.filename;
        (extracted.terms     || []).forEach(t => newTerms.push({ ...t, source: src }));
        (extracted.questions || []).forEach(q => newQs.push({   ...q, source: src }));
      }
      for (let i = 0; i < moreLocalFiles.length; i++) {
        const f = moreLocalFiles[i];
        setProgress(`Analyzing ${f.name} (${canvasMore.length + i + 1}/${totalMore})...`);
        const extracted = await extractFromLocalFile(f);
        const src = f.name;
        (extracted.terms     || []).forEach(t => newTerms.push({ ...t, source: src }));
        (extracted.questions || []).forEach(q => newQs.push({   ...q, source: src }));
      }
      if (!newTerms.length) throw new Error("Nothing extracted from the selected files.");
      const result = {
        terms:       [...(data?.terms || []),     ...newTerms],
        questions:   [...(data?.questions || []), ...newQs],
        generatedAt: data?.generatedAt ?? Date.now(),
      };
      writeCache(courseId, result);
      await saveToSupabase(supabase, courseId, result);
      setData(result);
      setAddingMore(false);
      setMoreSelected(new Set());
      setMoreLocalFiles([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
      setProgress("");
    }
  }

  if (!activeCourse) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-sans text-[14px] text-text-secondary">Select a course from the dropdown to get started.</p>
      </div>
    );
  }

  const courseName = activeCourse.name.includes(":")
    ? activeCourse.name.split(":")[1].trim()
    : activeCourse.name;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-8 pt-10 pb-10">
      <div className="mb-7 flex items-start justify-between">
        <div>
          <h1 className="font-sans text-4xl font-semibold text-text-primary">Review</h1>
          <p className="mt-1 font-sans text-[13px] text-text-secondary">
            {shortCode(activeCourse)} — {courseName}
          </p>
        </div>
        {data && !confirmRegen && (
          <div className="flex items-center gap-3 pt-2">
            <span className="font-mono text-[11px] text-text-faint">
              {data.terms?.length} terms · {data.questions?.length} questions
            </span>
            <button onClick={handleRegenClick}
              className="font-sans text-[11px] text-text-secondary hover:text-yellow-400 cursor-pointer transition-colors">
              Regenerate
            </button>
          </div>
        )}
      </div>

      {/* Regenerate warning */}
      {confirmRegen && (
        <div className="mb-6">
          <RegenerateWarning onConfirm={handleClear} onCancel={() => setConfirmRegen(false)} />
        </div>
      )}

      {/* Setup */}
      {!data && (
        <div className="flex flex-col gap-5 max-w-2xl">
          <div className="rounded-2xl border border-border-default bg-bg-sidebar p-5 flex flex-col gap-4">
            <p className="font-sans text-[13px] font-medium text-text-primary">Choose lecture PDFs to generate from</p>
            {filesLoading && (
              <div className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin text-text-secondary" />
                <span className="font-sans text-[12px] text-text-secondary">Loading files…</span>
              </div>
            )}
            {!filesLoading && !files.length && (
              <p className="font-sans text-[12px] text-text-secondary">
                No PDFs found for {shortCode(activeCourse)}. Upload your notes below.
              </p>
            )}

            {/* Local file upload — always shown */}
            <div className="flex flex-col gap-2 border-t border-border-default pt-3">
              <p className="font-sans text-[12px] font-medium text-text-secondary">
                {files.length ? "Also upload your own notes" : "Upload your own notes"}
              </p>
              <label className="flex w-fit items-center gap-2 cursor-pointer rounded-lg border border-border-default px-4 py-2 font-sans text-[12px] text-text-secondary hover:bg-[#2e2e2e] hover:text-text-primary transition-colors">
                <Upload className="size-3.5" />
                Choose PDFs from your computer
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const picked = [...e.target.files];
                    setLocalUploadFiles(prev => {
                      const existing = new Set(prev.map(f => f.name));
                      return [...prev, ...picked.filter(f => !existing.has(f.name))];
                    });
                  }}
                />
              </label>
              {localUploadFiles.length > 0 && (
                <div className="flex flex-col gap-1">
                  {localUploadFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded px-2 py-1 bg-[#2a2a2e]">
                      <FileText className="size-3.5 shrink-0 text-red-400" />
                      <span className="flex-1 truncate font-sans text-[12px] text-text-primary">{f.name}</span>
                      <button onClick={() => setLocalUploadFiles(prev => prev.filter((_, j) => j !== i))}
                        className="cursor-pointer text-text-faint hover:text-red-400 transition-colors">
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!filesLoading && !!files.length && (
              <FileSelector files={files} selected={selected} onToggle={toggleFile} />
            )}
          </div>
          {error && <p className="font-sans text-[12px] text-red-400 leading-[18px]">{error}</p>}
          <button onClick={generate}
            disabled={generating || !selected.size || filesLoading}
            className="flex w-fit items-center gap-2 cursor-pointer rounded-xl bg-accent-blue px-6 py-3 font-sans text-[14px] font-medium text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {generating
              ? <><Loader2 className="size-4 animate-spin" /><span className="ml-1">{progress || "Generating…"}</span></>
              : <><Sparkles className="size-4" /> Generate Flashcards &amp; Quiz</>
            }
          </button>
          {generating && <p className="font-sans text-[11px] text-text-faint">Takes 30–90 s per file. Keep this tab open.</p>}
        </div>
      )}

      {/* Study */}
      {data && !confirmRegen && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center border-b border-border-default">
            {[
              { id: "flashcards", label: "Flashcards",    icon: Layers,     count: data.terms?.length },
              { id: "quiz",       label: "Practice Quiz", icon: ListChecks, count: data.questions?.length },
            ].map(({ id, label, icon: Icon, count }) => (
              <button key={id} onClick={() => setMode(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 font-sans text-[12px] cursor-pointer transition-colors border-b-2 -mb-px ${mode === id ? "border-accent-blue text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
                <Icon className="size-3.5" />{label}
                <span className="font-mono text-[10px] text-text-faint ml-1">({count})</span>
              </button>
            ))}
          </div>
          {mode === "flashcards" && data.terms?.length > 0 && (
            <Flashcards terms={data.terms} courseId={courseId} supabase={supabase} />
          )}
          {mode === "quiz" && data.questions?.length > 0 && (
            <Quiz questions={data.questions} courseId={courseId} supabase={supabase} />
          )}

          {/* Add more files */}
          {!addingMore ? (
            <button
              onClick={() => { setAddingMore(true); setMoreSelected(new Set()); setError(null); }}
              className="flex w-fit items-center gap-2 cursor-pointer rounded-xl border border-border-default px-5 py-2.5 font-sans text-[13px] text-text-secondary hover:bg-[#2e2e2e] hover:text-text-primary transition-colors mt-2">
              <Sparkles className="size-4 text-accent-blue" /> Add more files
            </button>
          ) : (
            <div className="flex flex-col gap-4 max-w-2xl rounded-2xl border border-border-default bg-bg-sidebar p-5 mt-2">
              <div className="flex items-center justify-between">
                <p className="font-sans text-[13px] font-medium text-text-primary">Add more PDFs to this set</p>
                <button onClick={() => { setAddingMore(false); setError(null); }}
                  className="cursor-pointer text-text-faint hover:text-text-primary transition-colors">
                  <X className="size-4" />
                </button>
              </div>
              {filesLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin text-text-secondary" />
                  <span className="font-sans text-[12px] text-text-secondary">Loading files...</span>
                </div>
              ) : (
                <FileSelector
                  files={files.filter(f => !ingestedSources.has(f.display_name || f.filename))}
                  selected={moreSelected}
                  onToggle={id => setMoreSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                />
              )}
              {!filesLoading && files.filter(f => !ingestedSources.has(f.display_name || f.filename)).length === 0 && (
                <p className="font-sans text-[12px] text-text-secondary">All Canvas PDFs have already been added. Upload more below.</p>
              )}

              {/* Local upload for add-more */}
              <div className="flex flex-col gap-2 border-t border-border-default pt-3">
                <p className="font-sans text-[11px] text-text-faint uppercase tracking-wide">Or upload from your computer</p>
                <label className="flex w-fit items-center gap-2 cursor-pointer rounded-lg border border-border-default px-3 py-1.5 font-sans text-[12px] text-text-secondary hover:bg-[#2e2e2e] hover:text-text-primary transition-colors">
                  <Upload className="size-3.5" />
                  Choose PDFs
                  <input type="file" accept=".pdf" multiple className="hidden"
                    onChange={(e) => {
                      const picked = [...e.target.files];
                      setMoreLocalFiles(prev => {
                        const existing = new Set(prev.map(f => f.name));
                        return [...prev, ...picked.filter(f => !existing.has(f.name))];
                      });
                    }}
                  />
                </label>
                {moreLocalFiles.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {moreLocalFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 rounded px-2 py-1 bg-[#2a2a2e]">
                        <FileText className="size-3.5 shrink-0 text-red-400" />
                        <span className="flex-1 truncate font-sans text-[12px] text-text-primary">{f.name}</span>
                        <button onClick={() => setMoreLocalFiles(prev => prev.filter((_, j) => j !== i))}
                          className="cursor-pointer text-text-faint hover:text-red-400 transition-colors">
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="font-sans text-[12px] text-red-400">{error}</p>}
              <button onClick={generateMore}
                disabled={generating || (!moreSelected.size && !moreLocalFiles.length)}
                className="flex w-fit items-center gap-2 cursor-pointer rounded-xl bg-accent-blue px-5 py-2.5 font-sans text-[13px] font-medium text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {generating
                  ? <><Loader2 className="size-4 animate-spin" /><span className="ml-1">{progress || "Generating..."}</span></>
                  : <><Sparkles className="size-4" /> Add to set</>
                }
              </button>
              {generating && <p className="font-sans text-[11px] text-text-faint">Keep this tab open.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}