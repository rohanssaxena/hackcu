import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { createServer as createViteServer } from "vite";
import { outlineRouter } from "./routes/outline.js";
import { contentRouter } from "./routes/content.js";
import { chatRouter } from "./routes/chat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

dotenv.config({ path: path.join(root, ".env.server") });

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

app.use(cors());
app.use(express.json());

app.use("/api/agents/outline", outlineRouter);
app.use("/api/agents/content", contentRouter);
app.use("/api/chat", chatRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

if (isProd) {
  app.use(express.static(path.join(root, "dist")));
  app.get("{*path}", (_req, res) => {
    res.sendFile(path.join(root, "dist", "index.html"));
  });
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
