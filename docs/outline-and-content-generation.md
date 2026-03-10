# Outline and Content Generation

This document explains how **outline generation** and **content generation** work in the Micro learning platform.

---

## Overview

| Pipeline | Purpose | Trigger | Output |
|----------|---------|---------|--------|
| **Outline Generation** | Build a structured course outline from uploaded study materials | User clicks "Generate Outline" in Outline modal | Recursive tree of groups and content nodes stored in `groups`, `content_nodes`, `objectives` |
| **Content Generation** | Generate phased learning content (phases + checkpoints) for each content node | User clicks "Generate Content" after outline exists | Phases, checkpoints, and options stored in `phases`, `checkpoints`, `options` |

---

## Outline Generation

### Pipeline Steps

| Step | Description | Implementation |
|------|-------------|----------------|
| 1. Fetch folder | Load folder metadata and verify outline not already generated | `supabase.from("folders").select(...).eq("id", folderId)` |
| 2. Fetch files | Load all course files for the folder | `supabase.from("course_files").select(...).eq("folder_id", folderId)` |
| 3. Extract text | Extract text from each file (PDF, MD, TXT, DOC, DOCX) | `extractFolderText()` — uses pdfjs for PDFs, UTF-8 for text files |
| 4. Build prompt | Combine file contents with headers, cap at 120K chars | `buildFileContents()` — truncates if over limit |
| 5. Call LLM | Generate structured outline from study materials | `generateOutline()` — Claude Sonnet 4.5, structured output |
| 6. Persist | Recursively insert groups and content nodes into DB | `persistOutline()` → `insertNode()` |
| 7. Mark complete | Set `outline_generated: true` on folder | `supabase.from("folders").update(...)` |

### Text Extraction

| File Type | Extraction Method | Max Size |
|-----------|-------------------|----------|
| PDF | pdfjs-dist: extract text from each page | 10 MB per file |
| MD, TXT, DOC, DOCX | UTF-8 decode | 10 MB per file |
| Other | Skipped (returns null) | — |

### LLM Configuration

| Setting | Value |
|---------|-------|
| Model | `claude-sonnet-4-5-20250929` |
| System prompt | `prompts/outline-generation.md` |
| Output schema | `prompts/outline-generation-schema.json` |
| Max input | 120,000 characters (across all files) |

### Outline Output Structure

| Node Type | Description | DB Tables | Required Fields |
|-----------|-------------|-----------|-----------------|
| **Group** | Organizational container; can nest other groups or content nodes | `groups` | `title`, `type`, `nodes` |
| **Content** | Leaf-level study unit; carries objectives and guidance | `content_nodes`, `objectives` | `title`, `type`, `objectives`, `concept_tags`, `learning_guidance`, `practice_guidance` |

### Content Node Fields (from outline)

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Topic title |
| `objectives` | array | 2–6 items: `{ objective, weight }` (weight 1–10) |
| `concept_tags` | string[] | Keywords for linking/retrieval |
| `learning_guidance` | string | What learner should be able to do after studying |
| `practice_guidance` | string | Style of practice questions to generate |

### Nesting Rules

| Rule | Constraint |
|------|------------|
| Max depth | 4 levels (root → L1 group → L2 group → L3 group → L4 content) |
| Groups | Must have `nodes` array (can be empty) |
| Content | Must not have `nodes` array |

---

## Content Generation

### Pipeline Steps

| Step | Description | Implementation |
|------|-------------|----------------|
| 1. Collect nodes | Fetch all content nodes for folder; exclude those with existing phases | `collectContentNodes()` — checks `phases` table |
| 2. Fetch objectives | Load objectives for pending nodes | `supabase.from("objectives").select(...)` |
| 3. Build prompt | Format topics with title, objectives, learning/practice guidance | `generateAllContent()` — numbered list per topic |
| 4. Call LLM | Generate phases + checkpoints for all pending topics in one pass | Claude Haiku 4.5, streaming, structured output |
| 5. Persist | For each topic, insert phases → checkpoints → options | `persistContentForNode()` |
| 6. Mark complete | Set `lc_generated: true` on folder | `supabase.from("folders").update(...)` |

### LLM Configuration

| Setting | Value |
|---------|-------|
| Model | `claude-haiku-4-5-20251001` |
| System prompt | `prompts/learning-content-gen.md` |
| Output schema | `prompts/learning-content-schema.json` |
| Max tokens | 64,000 |
| Streaming | Yes |

### Content Output Structure

| Entity | Description | DB Table | Fields |
|--------|-------------|----------|--------|
| **Phase** | One core idea; 150–400 words of Markdown | `phases` | `title`, `content`, `estimated_time_minutes`, `order` |
| **Checkpoint** | 1–3 multiple-choice questions per phase | `checkpoints` | `question`, `difficulty` |
| **Option** | Answer choice for a checkpoint | `options` | `text`, `correct`, `explanation` |

### Phase Guidelines

| Guideline | Requirement |
|-----------|-------------|
| Content length | 150–400 words per phase |
| Formatting | Markdown: headings, bold, italics, lists, code, LaTeX |
| Order | Phases build progressively; cover all objectives |
| Checkpoints | 1–3 per phase; 2–4 options each; exactly one correct |

### Checkpoint Schema

| Field | Type | Description |
|-------|------|-------------|
| `question` | string | Question text |
| `difficulty` | integer | 1–10 |
| `options` | array | Each: `{ text, correct, explanation }` |

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agents/outline/generate` | POST | Run outline pipeline (body: `{ folder_id }`) |
| `/api/agents/content/generate` | POST | Run content pipeline (body: `{ folder_id }`); streams SSE progress |

---

## Dependencies

| Outline | Content |
|---------|---------|
| Requires: folder with uploaded files | Requires: outline already generated |
| Blocks if `outline_generated` is true | Skips nodes that already have phases |
| Uses `extract.js` for text extraction | Uses outline's `content_nodes` + `objectives` |

---

## Data Flow Diagram

```
Outline Generation:
  course_files → extractFolderText → LLM (Sonnet) → groups, content_nodes, objectives

Content Generation:
  content_nodes + objectives → LLM (Haiku) → phases → checkpoints → options
```
