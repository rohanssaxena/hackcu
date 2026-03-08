# Generate Course Outline

You are building a **structured course outline** from uploaded study materials (lecture notes, textbook excerpts, slides, etc.).

Your output is a **recursive tree** of nodes. There are exactly two node types:

## Node Types

### 1. Group
An organizational container. Groups can contain other groups or content nodes.

```json
{
  "title": "Limits",
  "type": "group",
  "nodes": [ /* child group or content nodes */ ]
}
```

### 2. Content
A leaf-level study unit. Content nodes do **not** contain child nodes. Instead they carry learning objectives, concept tags, and guidance for downstream content generation.

```json
{
  "title": "Evaluating Limits from Graphs",
  "type": "content",
  "objectives": [
    { "objective": "Interpret limits from graphs", "weight": 3 },
    { "objective": "Distinguish left-hand and right-hand limits", "weight": 2 }
  ],
  "concept_tags": ["limits", "graphical interpretation", "one-sided limits"],
  "learning_guidance": "Evaluate limits from graphs, compare left-hand and right-hand limits, identify discontinuities that prevent limits.",
  "practice_guidance": "Generate questions that require reading limit values from a graph, comparing one-sided limits, and identifying points where limits fail to exist."
}
```

## Rules

1. The root object has a `title` (the course name) and a `nodes` array.
2. Every node must have `"type": "group"` or `"type": "content"`.
3. Groups **must** have a `nodes` array (may be empty but prefer at least one child).
4. Content nodes **must not** have a `nodes` array.
5. Nest up to **4 levels deep** maximum (root → L1 group → L2 group → L3 group → L4 content only). At the deepest group level, children must be content nodes.
6. **Objectives:** Each content node should have 2–6 objectives. `weight` ranges 1–10 and indicates relative importance within that node.
7. **Concept tags:** Short keywords describing the main concepts (used for linking and retrieval).
8. **Learning guidance:** A concise sentence or two describing what the learner should be able to do after studying this node.
9. **Practice guidance:** A concise sentence or two describing the style of practice questions to generate for this node.
10. Return **only JSON** conforming to the provided schema. No commentary outside the JSON.

## Example Output (abbreviated)

```json
{
  "title": "Calculus 1",
  "nodes": [
    {
      "title": "Limits",
      "type": "group",
      "nodes": [
        {
          "title": "Conceptual Understanding of Limits",
          "type": "group",
          "nodes": [
            {
              "title": "Evaluating Limits from Graphs",
              "type": "content",
              "objectives": [
                { "objective": "Interpret limits from graphs", "weight": 3 },
                { "objective": "Understand limits as values approached by a function", "weight": 3 },
                { "objective": "Distinguish left-hand and right-hand limits", "weight": 2 },
                { "objective": "Recognize situations where limits do not exist", "weight": 2 }
              ],
              "concept_tags": ["limits", "graphical interpretation", "one-sided limits"],
              "learning_guidance": "Evaluate limits from graphs, compare left-hand and right-hand limits, identify discontinuities that prevent limits.",
              "practice_guidance": "Generate questions that require evaluating limits from graphs, comparing left-hand and right-hand limits, and identifying discontinuities that prevent limits."
            }
          ]
        },
        {
          "title": "Computational Techniques for Limits",
          "type": "group",
          "nodes": [
            {
              "title": "Algebraic Limit Evaluation",
              "type": "content",
              "objectives": [
                { "objective": "Apply direct substitution to evaluate limits", "weight": 3 },
                { "objective": "Use factoring and rationalization to resolve indeterminate forms", "weight": 4 }
              ],
              "concept_tags": ["limits", "algebra", "indeterminate forms"],
              "learning_guidance": "Evaluate limits algebraically using substitution, factoring, rationalization, and conjugate multiplication.",
              "practice_guidance": "Provide limit expressions requiring algebraic manipulation before evaluation."
            }
          ]
        }
      ]
    }
  ]
}
```
