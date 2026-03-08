import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(__dirname, "../../../prompts");

const systemPrompt = readFileSync(resolve(PROMPTS_DIR, "outline-generation.md"), "utf-8");
const outputSchema = JSON.parse(
  readFileSync(resolve(PROMPTS_DIR, "outline-generation-schema.json"), "utf-8"),
);

const MAX_CONTENT_CHARS = 120_000;

function buildFileContents(files) {
  let combined = "";
  for (const f of files) {
    const header = `\n\n===== ${f.filename} =====\n\n`;
    if (combined.length + header.length + f.text.length > MAX_CONTENT_CHARS) {
      combined += header + f.text.slice(0, MAX_CONTENT_CHARS - combined.length - header.length);
      combined += "\n[... truncated ...]";
      break;
    }
    combined += header + f.text;
  }
  return combined;
}

export async function generateOutline(anthropic, folderName, files) {
  const fileContents = buildFileContents(files);

  const userMessage =
    `Generate a structured academic course outline for "${folderName}" ` +
    `based on the following study materials:\n\n${fileContents}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 16384,
    messages: [{ role: "user", content: userMessage }],
    system: systemPrompt,
    output_config: {
      format: {
        type: "json_schema",
        schema: outputSchema,
      },
    },
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return JSON.parse(text);
}
