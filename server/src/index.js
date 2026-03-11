import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { createServer as createViteServer } from "vite";
import { outlineRouter } from "./routes/outline.js";
import { contentRouter } from "./routes/content.js";
import { drillRouter } from "./routes/drill.js";
import { chatRouter } from "./routes/chat.js";
import objectivesRouter from "./routes/objectives.js";
import objectivesTableRouter from "./routes/objectivesTable.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const envPath = path.join(root, ".env.server");
const envResult = dotenv.config({ path: envPath });
if (envResult.error && process.env.NODE_ENV !== "production") {
  console.warn("Note: .env.server not loaded:", envPath, envResult.error.message);
}

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

app.use(cors());
app.use(express.json());

app.use("/api/agents/outline", outlineRouter);
app.use("/api/agents/content", contentRouter);
app.use("/api/agents/drill", drillRouter);
app.use("/api/chat", chatRouter);
app.use("/api/objectives", objectivesRouter);
app.use("/api/objectives-table", objectivesTableRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

if (isProd) {
  app.use(express.static(path.join(root, "dist")));
  app.get("{*path}", (_req, res) => {
    res.sendFile(path.join(root, "dist", "index.html"));
  });
} else {
  const vite = await createViteServer({
    root,
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}).on("error", (err) => {
  console.error("Server failed to start:", err.message);
  if (err.code === "EADDRINUSE") console.error(`Port ${PORT} is already in use. Stop the other process or set PORT in .env.server`);
});
