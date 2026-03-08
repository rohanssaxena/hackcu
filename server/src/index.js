import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { outlineRouter } from "./routes/outline.js";
import { contentRouter } from "./routes/content.js";
import { chatRouter } from "./routes/chat.js";

dotenv.config({ path: "../.env.server" });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/agents/outline", outlineRouter);
app.use("/api/agents/content", contentRouter);
app.use("/api/chat", chatRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
