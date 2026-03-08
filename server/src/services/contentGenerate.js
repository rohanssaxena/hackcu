import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(__dirname, "../../../prompts");

const systemPrompt = readFileSync(resolve(PROMPTS_DIR, "learning-content-gen.md"), "utf-8");
const outputSchema = JSON.parse(
  readFileSync(resolve(PROMPTS_DIR, "learning-content-schema.json"), "utf-8"),
);

export async function generateContentForNode(anthropic, node) {
  const objectivesList = (node.objectives || []).map((o) => `- ${o}`).join("\n");

  const userMessage =
    `Generate learning content for the following lesson node.\n\n` +
    `**Topic:** ${node.title}\n\n` +
    (objectivesList ? `**Objectives:**\n${objectivesList}\n\n` : "") +
    `Produce phased learning content with checkpoints as described in the system prompt.`;

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
