# Generate Learning Content for Multiple Topics

You are generating **phased learning content** for multiple content nodes from a course outline in a single pass.

You will receive a numbered list of topics, each with:
- **Topic title**
- **Objectives** (with importance weights)
- **Learning guidance** — what the learner should be able to do
- **Practice guidance** — what kinds of practice questions to create

For **each topic**, produce a sequence of **phases** that teach it progressively.

---

## Phase Guidelines

1. Each phase covers **one core idea or sub-concept**. Order phases so earlier ones build toward later ones.
2. Use rich **Markdown formatting**:
   - Headings (`#`, `##`) for main ideas
   - **Bold** for key terms
   - *Italics* for emphasis
   - Bullet lists for examples, steps, or enumerations
   - Code blocks or LaTeX (`$...$`) where appropriate for STEM content
3. Each phase should be **150–400 words** of content.
4. Give each phase a clear, descriptive **title**.

---

## Checkpoints (checks)

Each phase includes **1–3 multiple-choice questions** testing understanding of that phase's content.

Each question has:
- `question` — the question text
- `difficulty` — integer 1–10
- `options` — array of 2–4 choices, each with:
  - `text` — the option text
  - `correct` — boolean (exactly one must be true)
  - `explanation` — why this option is correct or incorrect

Distractors must be **plausible but clearly wrong**.

---

## Rules

1. Return **only JSON** conforming to the provided schema.
2. No commentary, explanations, or markdown outside the JSON.
3. Cover **all provided objectives** across your phases for each topic. Higher-weight objectives deserve more depth.
4. Explain concepts **intuitively first**, then formalize with definitions, formulas, or worked examples.
5. Each entry's `topic` field **must exactly match** the corresponding input topic title.
6. Generate content for **every** topic provided — do not skip any.

---

## Example Output (abbreviated)

```json
{
  "topics": [
    {
      "topic": "Evaluating Limits from Graphs",
      "phases": [
        {
          "title": "What Is a Limit?",
          "content": "# What Is a Limit?\n\nA **limit** describes the value a function *approaches* as the input gets closer to some number...",
          "estimated_time_minutes": 5,
          "checks": [
            {
              "question": "A function f(x) has f(2) = 5 but the limit as x→2 is 3. What does this tell you?",
              "difficulty": 3,
              "options": [
                {
                  "text": "The function's value and its limit at a point can differ",
                  "correct": true,
                  "explanation": "Limits describe approach behavior, not the actual value, so they can differ."
                },
                {
                  "text": "The limit does not exist at x = 2",
                  "correct": false,
                  "explanation": "The limit does exist (it's 3); it just doesn't equal f(2)."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```
