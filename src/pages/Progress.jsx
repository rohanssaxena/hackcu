import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts";
import { TrendingUp, Award, Target, BookOpen, ArrowRight } from "lucide-react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";

const COLORS = ["#2b7fff", "#05df72", "#f59e0b", "#ef4444", "#8b5cf6"];

function getPlaceholderData() {
  const baseDate = new Date();
  const scoresOverTime = [];
  const studyActivity = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    scoresOverTime.push({
      date: dateStr,
      attempts: Math.floor(Math.random() * 3) + 1,
      avgScore: 60 + Math.floor(Math.random() * 35),
    });
    studyActivity.push({
      date: dateStr,
      count: Math.floor(Math.random() * 5) + (i < 7 ? 1 : 0),
    });
  }
  return {
    stats: { totalAttempts: 14, avgScore: 79, bestScore: 91, examsCreated: 5 },
    scoresOverTime,
    examPerformance: [
      { title: "Calculus I", folder: "Math 101", avgScore: 78, attempts: 3 },
      { title: "Linear Algebra", folder: "Math 201", avgScore: 85, attempts: 2 },
      { title: "Physics Mechanics", folder: "Physics", avgScore: 72, attempts: 4 },
      { title: "Organic Chemistry", folder: "Chem 301", avgScore: 91, attempts: 1 },
      { title: "Data Structures", folder: "CS 200", avgScore: 68, attempts: 5 },
    ],
    studyActivity,
    recentAttempts: [
      { exam_id: "mock-1", exam_title: "Calculus I Practice", folder_name: "Math 101", folder_id: null, pct: 82, completed_at: new Date().toISOString() },
      { exam_id: "mock-2", exam_title: "Linear Algebra Quiz", folder_name: "Math 201", folder_id: null, pct: 88, completed_at: new Date(Date.now() - 86400000).toISOString() },
      { exam_id: "mock-3", exam_title: "Physics Mechanics", folder_name: "Physics", folder_id: null, pct: 65, completed_at: new Date(Date.now() - 172800000).toISOString() },
    ],
  };
}

const PLACEHOLDER_DATA = getPlaceholderData();

export default function Progress() {
  const navigate = useNavigate();
  const [data, setData] = useState(PLACEHOLDER_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/progress`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && Array.isArray(d.scoresOverTime) ? d : PLACEHOLDER_DATA))
      .then(setData)
      .catch(() => setData(PLACEHOLDER_DATA))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="font-sans text-[13px] text-text-faint">Loading progress…</span>
      </div>
    );
  }

  const stats = data?.stats || PLACEHOLDER_DATA.stats;
  const scoresOverTime = data?.scoresOverTime || PLACEHOLDER_DATA.scoresOverTime;
  const examPerformance = data?.examPerformance || PLACEHOLDER_DATA.examPerformance;
  const studyActivity = data?.studyActivity || PLACEHOLDER_DATA.studyActivity;
  const recentAttempts = data?.recentAttempts || PLACEHOLDER_DATA.recentAttempts;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-8 pt-8 pb-12">
      <h1 className="mb-6 font-sans text-4xl font-semibold text-text-primary">
        Progress
      </h1>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={Target}
          label="Practice attempts"
          value={stats.totalAttempts ?? 0}
        />
        <StatCard
          icon={TrendingUp}
          label="Average score"
          value={stats.avgScore != null ? `${stats.avgScore}%` : "—"}
        />
        <StatCard
          icon={Award}
          label="Best score"
          value={stats.bestScore != null ? `${stats.bestScore}%` : "—"}
        />
        <StatCard
          icon={BookOpen}
          label="Exams created"
          value={stats.examsCreated ?? 0}
        />
      </div>

      {/* Charts row */}
      <div className="mb-8 grid gap-8 lg:grid-cols-2">
        <ChartCard title="Score trend (last 14 days)">
          {scoresOverTime.length > 0 ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoresOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#858585", fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#858585", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e1e1e",
                      border: "1px solid #2a2a2a",
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: "#ccc" }}
                    formatter={(value) => [`${value}%`, "Avg score"]}
                    labelFormatter={(label) => label}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    stroke="#2b7fff"
                    strokeWidth={2}
                    dot={{ fill: "#2b7fff", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="Study activity (last 14 days)">
          {studyActivity.length > 0 ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#858585", fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fill: "#858585", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e1e1e",
                      border: "1px solid #2a2a2a",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="#05df72" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState />
          )}
        </ChartCard>
      </div>

      {/* Exam performance */}
      <div className="mb-8">
        <ChartCard title="Exam performance (avg score per exam)">
          {examPerformance.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={examPerformance}
                  layout="vertical"
                  margin={{ left: 80, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "#858585", fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    tick={{ fill: "#858585", fontSize: 11 }}
                    width={75}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e1e1e",
                      border: "1px solid #2a2a2a",
                      borderRadius: 8,
                    }}
                    formatter={(value) => [`${value}%`, "Avg score"]}
                  />
                  <Bar dataKey="avgScore" radius={[0, 4, 4, 0]}>
                    {examPerformance.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState />
          )}
        </ChartCard>
      </div>

      {/* Recent attempts */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-sans text-[13px] font-medium text-text-primary">
            Recent practice exams
          </span>
          <button
            onClick={() => navigate("/workspace")}
            className="flex cursor-pointer items-center gap-1 font-sans text-[11px] text-text-secondary transition-colors hover:text-accent-blue"
          >
            Go to workspace
            <ArrowRight className="size-3" />
          </button>
        </div>
        <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d]">
          {recentAttempts.length > 0 ? (
            <div className="divide-y divide-[#1e1e1e]">
              {recentAttempts.map((a) => (
                <button
                  key={a.exam_id + a.completed_at}
                  onClick={() =>
                    a.folder_id && navigate(`/course/${a.folder_id}/practice/${a.exam_id}`)
                  }
                  className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#1a1a1a]"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-sans text-[13px] text-text-primary">
                      {a.exam_title}
                    </span>
                    <span className="font-sans text-[11px] text-text-faint">
                      {a.folder_name} • {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[14px] font-medium ${
                      a.pct >= 80 ? "text-accent-green" : a.pct >= 60 ? "text-accent-blue" : "text-amber-400"
                    }`}
                  >
                    {a.pct}%
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="font-sans text-[13px] text-text-faint">
                No practice exams yet. Create one from a course to see your progress here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-accent-blue" />
        <span className="font-sans text-[11px] text-text-muted">{label}</span>
      </div>
      <p className="mt-1 font-mono text-xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] p-4">
      <h3 className="mb-4 font-sans text-[13px] font-medium text-text-primary">
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[200px] items-center justify-center">
      <p className="font-sans text-[12px] text-text-faint">No data yet</p>
    </div>
  );
}
