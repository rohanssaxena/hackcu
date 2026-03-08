# Generate Learning Content for a Lesson Node

You are generating **learning content for a terminal lesson node** (lowest-level section with `content = true` in the course outline).

**Goal:** produce the **simplest, clearest way to explain the concept** in multiple phases, with checkpoints after each phase.

---

## Phase Guidelines

1. Phases should be based on **logical groups of sub-concepts**. Each phase introduces **one core idea**.
2. Use **headings, bullet points, bold, and italics** for clarity:
   - Headings (`#` or `##`) for main concepts
   - Bold (`**`) for terminology
   - Italics (`*`) for emphasis or reminders
   - Bullets for examples, lists, or steps
3. Recommended phase length: 150–300 words.
4. All phases are displayed on the **same page**, no lesson-level wrapper is required.

---

## Checkpoints

1. Each phase must include **1–3 multiple-choice questions**.
2. Each question:
   - Has **2–4 options**, exactly one correct.
   - Includes a **difficulty level** (1–10) indicating conceptual difficulty.
   - Should test understanding of **the immediately preceding phase**.
   - Distractors must be **plausible but clearly wrong**.
3. Optionally include hints if it clarifies the question.

---

## Phase Metadata

Each phase may include:

- `estimated_time_minutes` — suggested time to complete the phase
- `concept_tags` — list of keywords describing the phase
- `prerequisites` — optional list of concepts a student should know first

---

## Rules & Requirements

1. Return **only JSON** that conforms to the provided schema.
2. Avoid explanations, commentary, or markdown outside the JSON object.
3. Explain concepts **intuitively first**, then optionally include formulas/examples.

---

## Example Output (abbreviated)

```json
{
  "phases": [
    {
      "content": "# Derivatives — The Simple Idea\n\nA **derivative** tells you **how fast something is changing at a specific moment**.\nThink of driving a car 🚗.\n\n- Your **speedometer** shows your speed **right now**.\n- That is basically a **derivative**.",
      "estimated_time_minutes": 5,
      "concept_tags": ["derivative", "rate of change", "velocity"],
      "prerequisites": ["limits"],
      "checks": [
        {
          "question": "Which of these best represents a derivative?",
          "difficulty": 3,
          "options": [
            { "key": "a", "text": "Your car's speedometer reading", "correct": true },
            { "key": "b", "text": "Total distance traveled", "correct": false },
            { "key": "c", "text": "The length of your road trip", "correct": false },
            { "key": "d", "text": "The time on a clock", "correct": false }
          ]
        }
      ]
    }
  ]
}