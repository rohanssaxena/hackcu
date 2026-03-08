const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";

export async function listConversations() {
  const res = await fetch(`${SERVER_URL}/api/chat/conversations`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Failed to list conversations");
  return body.conversations;
}

export async function createConversation(title) {
  const res = await fetch(`${SERVER_URL}/api/chat/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Failed to create conversation");
  return body.conversation;
}

export async function updateConversation(id, updates) {
  const res = await fetch(`${SERVER_URL}/api/chat/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Failed to update conversation");
  return body.conversation;
}

export async function deleteConversation(id) {
  const res = await fetch(`${SERVER_URL}/api/chat/conversations/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || "Failed to delete conversation");
  }
}

export async function getMessages(conversationId) {
  const res = await fetch(
    `${SERVER_URL}/api/chat/conversations/${conversationId}/messages`,
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Failed to get messages");
  return body.messages;
}

/**
 * Send a message and stream the AI response (supports tool calls).
 * @param {string} conversationId
 * @param {string} content
 * @param {(event: object) => void} onEvent - called with each SSE event
 * @returns {Promise<void>}
 *
 * Event types:
 *   { type: "delta", text }
 *   { type: "tool_start", name, input }
 *   { type: "tool_done", name, result }
 *   { type: "navigate", path, hash?, label? }  - client should open this route
 *   { type: "done" }
 *   { type: "error", error }
 */
export async function sendMessage(conversationId, content, onEvent) {
  const res = await fetch(
    `${SERVER_URL}/api/chat/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    onEvent({ type: "error", error: body.error || "Failed to send message" });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event = JSON.parse(line.slice(6));
          onEvent(event);
        } catch {
          // ignore parse errors from partial chunks
        }
      }
    }
  }
}
