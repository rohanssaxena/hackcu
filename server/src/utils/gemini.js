import { GoogleGenAI } from "@google/genai";
import { safeJsonParse } from "./safeJsonParse.js";

let _client;

export function getGemini() {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

/**
 * Call Gemini with structured JSON output. Uses the same JSON schema for deterministic shape.
 * @param {object} opts
 * @param {string} opts.model - Model ID (e.g. 'gemini-2.0-flash')
 * @param {string} opts.systemInstruction - System prompt
 * @param {string} opts.contents - User message
 * @param {object} opts.responseSchema - JSON Schema for the response (same as drill-generation-schema.json)
 * @returns {Promise<object>} Parsed JSON matching the schema
 */
export async function generateStructured({
  model = "gemini-2.0-flash",
  systemInstruction,
  contents,
  responseSchema,
}) {
  const ai = getGemini();
  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseJsonSchema: responseSchema,
    },
  });

  const text = response?.text;
  if (text == null || text === "") {
    throw new Error("Gemini returned no text");
  }
  return safeJsonParse(text);
}
