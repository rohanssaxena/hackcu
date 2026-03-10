/**
 * Safely parse JSON that may be wrapped in markdown code fences or contain trailing commas.
 * Use when parsing LLM output to avoid "Unexpected token" / comma/semicolon errors at line 1.
 * @param {string} raw - Raw string (e.g. LLM response)
 * @returns {object}
 */
export function safeJsonParse(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Empty or invalid input for JSON parse");
  }
  let text = raw.trim();

  // Strip ```json ... ``` or ``` ... ```
  const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlock) {
    text = jsonBlock[1].trim();
  }

  // Remove trailing commas before ] or } (invalid in JSON but some LLMs emit them)
  text = text.replace(/,(\s*[}\]])/g, "$1");

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(
      `JSON parse failed: ${e.message}. First 200 chars: ${text.slice(0, 200)}`
    );
  }
}
