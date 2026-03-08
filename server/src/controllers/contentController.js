import { runContentPipeline } from "../services/contentService.js";

export async function generateContent(req, res) {
  const { folder_id } = req.body;
  if (!folder_id) return res.status(400).json({ error: "Missing folder_id" });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await runContentPipeline(folder_id, send);
    res.end();
  } catch (err) {
    console.error("Content generation error:", err.message);
    send({ type: "error", error: err.message });
    res.end();
  }
}
