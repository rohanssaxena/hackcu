import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, ExternalLink, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

const STEPS = [
  { n: 1, text: "Go to canvas.colorado.edu and log in" },
  { n: 2, text: 'Click your profile picture → "Settings"' },
  { n: 3, text: 'Scroll to "Approved Integrations" → "New Access Token"' },
  { n: 4, text: 'Set purpose to "Micro", expiration to 120 days' },
  { n: 5, text: "Copy the token and paste it below" },
];

// Validate token looks like a Canvas token: digits~alphanumeric
function looksLikeCanvasToken(val) {
  return /^\d+~[A-Za-z0-9]{20,}$/.test(val.trim());
}

// Store token + domain in localStorage so canvasAPI.js can read it
function persistCredentials(token, domain) {
  localStorage.setItem("micro_canvas_token", token.trim());
  localStorage.setItem("micro_canvas_domain", domain.trim());
}

export default function Login() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [domain, setDomain] = useState("canvas.colorado.edu");
  const [showToken, setShowToken] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const tokenValid = looksLikeCanvasToken(token);

  async function handleConnect() {
    if (!tokenValid) return;
    setLoading(true);
    setError(null);

    try {
      // Verify the token works by hitting /api/v1/users/self
      const res = await fetch(`/canvas-api/users/self`, {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });

      if (!res.ok) {
        setError("Token rejected by Canvas. Double-check it and try again.");
        setLoading(false);
        return;
      }

      const user = await res.json();
      persistCredentials(token, domain);
      // Store user's display name for the sidebar
      localStorage.setItem("micro_user_name", user.short_name || user.name || "Student");
      localStorage.setItem("micro_user_email", user.primary_email || "");

      navigate("/");
    } catch {
      setError("Could not reach Canvas. Check your connection.");
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && tokenValid && !loading) handleConnect();
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg-primary overflow-hidden">
      {/* Subtle background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border-default) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-default) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow behind card */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-accent-blue opacity-[0.04] blur-[80px]" />

      {/* Card */}
      <div className="relative z-10 w-[420px] flex flex-col gap-6 rounded-xl border border-border-default bg-bg-sidebar p-8 shadow-2xl">

        {/* Logo + headline */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="size-4 text-accent-blue" />
            <span className="font-sans text-[11px] font-semibold uppercase tracking-widest text-text-label">
              Micro
            </span>
          </div>
          <h1 className="font-sans text-[22px] font-semibold leading-tight text-text-primary">
            Connect your Canvas
          </h1>
          <p className="font-sans text-[13px] leading-[19px] text-text-secondary">
            Micro syncs your courses, assignments, and deadlines to build your personalized study plan.
          </p>
        </div>

        {/* Domain field */}
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-[11px] font-medium text-text-muted uppercase tracking-wide">
            Canvas Domain
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="h-9 w-full rounded-md border border-border-default bg-bg-primary px-3 font-mono text-[13px] text-text-primary outline-none placeholder:text-text-faint focus:border-accent-blue transition-colors"
            placeholder="canvas.colorado.edu"
          />
        </div>

        {/* Token field */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="font-sans text-[11px] font-medium text-text-muted uppercase tracking-wide">
              Access Token
            </label>
            {token && (
              <span className={`font-sans text-[10px] ${tokenValid ? "text-accent-green" : "text-red-400"}`}>
                {tokenValid ? "✓ Looks valid" : "Invalid format"}
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 w-full rounded-md border border-border-default bg-bg-primary px-3 pr-9 font-mono text-[13px] text-text-primary outline-none placeholder:text-text-faint focus:border-accent-blue transition-colors"
              placeholder="10772~xxxxxxxxxxxxxxxxxxxx"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-text-secondary hover:text-text-primary transition-colors"
            >
              {showToken ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="font-sans text-[12px] text-red-400 -mt-2">{error}</p>
        )}

        {/* Connect button */}
        <button
          onClick={handleConnect}
          disabled={!tokenValid || loading}
          className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg font-sans text-[13px] font-medium transition-all cursor-pointer ${
            tokenValid && !loading
              ? "bg-accent-blue text-white hover:brightness-110"
              : "bg-bg-elevated text-text-faint cursor-not-allowed"
          }`}
        >
          {loading ? (
            <>
              <span className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              Connect Canvas
              <ArrowRight className="size-3.5" />
            </>
          )}
        </button>

        {/* Divider */}
        <div className="h-px w-full bg-border-default" />

        {/* How to get a token — collapsible guide */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setGuideOpen((v) => !v)}
            className="flex w-full cursor-pointer items-center justify-between text-left"
          >
            <span className="font-sans text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors">
              How do I get a token?
            </span>
            {guideOpen
              ? <ChevronUp className="size-3.5 text-text-faint" />
              : <ChevronDown className="size-3.5 text-text-faint" />
            }
          </button>

          {guideOpen && (
            <div className="flex flex-col gap-2.5">
              {STEPS.map((s) => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-bg-elevated font-mono text-[10px] text-text-secondary mt-0.5">
                    {s.n}
                  </span>
                  <span className="font-sans text-[12px] leading-[18px] text-text-secondary">
                    {s.text}
                  </span>
                </div>
              ))}

              <a
                href={`https://${domain}/profile/settings`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center gap-1.5 font-sans text-[12px] text-accent-blue hover:underline cursor-pointer w-fit"
              >
                Open Canvas Settings
                <ExternalLink className="size-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}