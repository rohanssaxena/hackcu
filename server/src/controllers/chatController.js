import { getSupabase } from "../utils/supabase.js";
import { getAnthropic } from "../utils/anthropic.js";
import { tools } from "../tools/definitions.js";
import { executeTool } from "../tools/executor.js";

const USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOOL_ROUNDS = 10;
const SYSTEM_PROMPT = `You are a study assistant with access to tools that manage folders, outlines, and learning content. Answer directly and concisely. No filler, no fluff, no emojis. Write like a knowledgeable friend texting back -- short sentences, plain language. Use LaTeX ($..$ inline, $$...$$ block) for math. Use markdown only when structure genuinely helps (lists, code blocks). Never use headings for short answers. Never say "Great question" or similar pleasantries.

When the user asks you to do something (create a folder, generate an outline, etc.), use the appropriate tool. If you need to look up a folder by name first, call list_folders. Always confirm what you did after a tool call.`;

export async function listConversations(req, res) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("chat_conversations")
      .select("id, title, mode, pinned, created_at, updated_at")
      .eq("user_id", USER_ID)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    res.json({ conversations: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createConversation(req, res) {
  try {
    const supabase = getSupabase();
    const { title, mode } = req.body;

    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({
        user_id: USER_ID,
        title: title || "New conversation",
        mode: mode || "ask",
      })
      .select("id, title, mode, pinned, created_at, updated_at")
      .single();

    if (error) throw error;
    res.json({ conversation: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteConversation(req, res) {
  try {
    const supabase = getSupabase();
    const { id } = req.params;

    const { error } = await supabase
      .from("chat_conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", USER_ID);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMessages(req, res) {
  try {
    const supabase = getSupabase();
    const { id } = req.params;

    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, role, content, tool_calls, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.json({ messages: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function sse(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export async function sendMessage(req, res) {
  try {
    const supabase = getSupabase();
    const anthropic = getAnthropic();
    const { id } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }

    await supabase
      .from("chat_messages")
      .insert({ conversation_id: id, role: "user", content });

    const { data: history, error: histErr } = await supabase
      .from("chat_messages")
      .select("role, content, tool_calls, tool_results")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (histErr) throw histErr;

    const messages = buildMessageHistory(history || []);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let fullText = "";
    let allToolCalls = [];
    let allToolResults = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await runStreamedResponse(
        anthropic,
        messages,
        res,
        (text) => { fullText += text; },
      );

      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

      if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
        break;
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults = [];
      for (const toolBlock of toolUseBlocks) {
        sse(res, { type: "tool_start", name: toolBlock.name, input: toolBlock.input });
        allToolCalls.push({ id: toolBlock.id, name: toolBlock.name, input: toolBlock.input });

        const result = await executeTool(toolBlock.name, toolBlock.input);

        sse(res, { type: "tool_done", name: toolBlock.name, result });
        if (result && result.navigate) {
          sse(res, {
            type: "navigate",
            path: result.navigate.path,
            hash: result.navigate.hash || null,
            label: result.navigate.label || null,
          });
        }
        const tr = {
          tool_use_id: toolBlock.id,
          content: JSON.stringify(result),
        };
        toolResults.push({ type: "tool_result", ...tr });
        allToolResults.push(tr);
      }

      messages.push({ role: "user", content: toolResults });
    }

    const assistantRow = {
      conversation_id: id,
      role: "assistant",
      content: fullText,
    };
    if (allToolCalls.length > 0) {
      assistantRow.tool_calls = allToolCalls;
      assistantRow.tool_results = allToolResults;
    }
    await supabase.from("chat_messages").insert(assistantRow);

    const isFirst = messages.filter((m) => m.role === "user" && typeof m.content === "string").length <= 1;
    if (isFirst && content) {
      const titleSnippet = content.length > 50 ? content.slice(0, 47) + "..." : content;
      await supabase
        .from("chat_conversations")
        .update({ title: titleSnippet, updated_at: new Date().toISOString() })
        .eq("id", id);
    } else {
      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", id);
    }

    sse(res, { type: "done" });
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      sse(res, { type: "error", error: err.message });
      res.end();
    }
  }
}

function buildMessageHistory(rows) {
  const messages = [];
  for (const row of rows) {
    if (row.role === "user") {
      messages.push({ role: "user", content: row.content });
    } else if (row.role === "assistant") {
      if (row.tool_calls && row.tool_calls.length > 0) {
        const contentBlocks = [];
        if (row.content) {
          contentBlocks.push({ type: "text", text: row.content });
        }
        for (const tc of row.tool_calls) {
          contentBlocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.input });
        }
        messages.push({ role: "assistant", content: contentBlocks });
        const results = row.tool_results && row.tool_results.length > 0
          ? row.tool_results
          : row.tool_calls.map((tc) => ({ tool_use_id: tc.id, content: JSON.stringify({ error: "Result not persisted" }) }));
        const resultBlocks = results.map((tr) => ({
          type: "tool_result",
          tool_use_id: tr.tool_use_id,
          content: typeof tr.content === "string" ? tr.content : JSON.stringify(tr.content),
        }));
        messages.push({ role: "user", content: resultBlocks });
      } else {
        messages.push({ role: "assistant", content: row.content });
      }
    }
  }
  return messages;
}

async function runStreamedResponse(anthropic, messages, res, onText) {
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools,
    messages,
  });

  return new Promise((resolve, reject) => {
    let response = null;

    stream.on("text", (text) => {
      onText(text);
      sse(res, { type: "delta", text });
    });

    stream.on("message", (msg) => {
      response = msg;
    });

    stream.on("error", (err) => reject(err));

    stream.on("end", () => {
      if (response) resolve(response);
      else reject(new Error("Stream ended without a message"));
    });
  });
}

export async function updateConversation(req, res) {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { title, pinned } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (pinned !== undefined) updates.pinned = pinned;

    const { data, error } = await supabase
      .from("chat_conversations")
      .update(updates)
      .eq("id", id)
      .eq("user_id", USER_ID)
      .select("id, title, mode, pinned, created_at, updated_at")
      .single();

    if (error) throw error;
    res.json({ conversation: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
