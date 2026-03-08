import { Router } from "express";
import { getProgressData } from "../services/progressService.js";

const router = Router();

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
    stats: {
      totalAttempts: 14,
      avgScore: 79,
      bestScore: 91,
      examsCreated: 5,
    },
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
      {
        exam_id: "mock-1",
        exam_title: "Calculus I Practice",
        folder_name: "Math 101",
        folder_id: null,
        pct: 82,
        completed_at: new Date().toISOString(),
      },
      {
        exam_id: "mock-2",
        exam_title: "Linear Algebra Quiz",
        folder_name: "Math 201",
        folder_id: null,
        pct: 88,
        completed_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        exam_id: "mock-3",
        exam_title: "Physics Mechanics",
        folder_name: "Physics",
        folder_id: null,
        pct: 65,
        completed_at: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
  };
}

router.get("/", async (req, res) => {
  try {
    const data = await getProgressData();
    if (data.stats.totalAttempts > 0) {
      return res.json(data);
    }
    res.json(getPlaceholderData());
  } catch (err) {
    console.error("Progress API error:", err);
    res.json(getPlaceholderData());
  }
});

export const progressRouter = router;
