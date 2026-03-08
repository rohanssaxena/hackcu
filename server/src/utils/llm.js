import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getAnthropic } from "./anthropic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(__dirname, "../../../prompts");

/**
 * Load a prompt file from the prompts/ directory.
 * @param {string} filename  e.g. "outline-generation.md"
 * @returns {string}
 */
export function loadPrompt(filename) {
  return readFileSync(resolve(PROMPTS_DIR, filename), "utf-8");
}

/**
 * Load and parse a JSON schema file from the prompts/ directory.
 * @param {string} filename  e.g. "outline-generation-schema.json"
 * @returns {object}
 */
export function loadSchema(filename) {
  return JSON.parse(readFileSync(resolve(PROMPTS_DIR, filename), "utf-8"));
}

/**
 * Call an Anthropic model and return parsed JSON.
 *
 * @param {object} opts
 * @param {string}  opts.model           Model ID
 * @param {string}  opts.system          System prompt text
 * @param {string}  opts.user            User message text
 * @param {object}  opts.schema          JSON Schema for structured output
 * @param {number}  [opts.maxTokens=16384]
 * @param {boolean} [opts.stream=false]  Use streaming (required for long responses)
 * @returns {Promise<object>}            Parsed JSON from the model response
 */
export async function callLLM({
  model,
  system,
  user,
  schema,
  maxTokens = 16384,
  stream = false,
}) {
  const anthropic = getAnthropic();

  const params = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: user }],
    system,
    output_config: {
      format: { type: "json_schema", schema },
    },
  };

  let message;
  if (stream) {
    const s = anthropic.messages.stream(params);
    message = await s.finalMessage();
  } else {
    message = await anthropic.messages.create(params);
  }

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return JSON.parse(text);
}
