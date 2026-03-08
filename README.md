# Micro

Adaptive AI study platform that transforms unstructured course material into a personalized, continuously adapting study system.

Upload PDFs, lecture slides, and notes. Micro ingests them, builds a structured topic tree, models what you know using a Bayesian belief system, and drives every subsequent decision — what to study, in what order, for how long, and how.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS 4 |
| Routing | React Router 7 |
| Charts | Recharts |
| Icons | Lucide React |
| Database | Supabase (PostgreSQL + pgvector + Realtime) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| AI | Claude Sonnet, GPT-4o, Qwen 2.5 14B (local), Llama 3.1 8B (local) |

## Getting Started

```bash
# Install dependencies (root + server)
npm install
cd server && npm install && cd ..

# Start dev server (single server: API + frontend with HMR)
npm run dev

# Build for production
npm run build

# Run production server (serves built frontend from dist/)
npm run start
```

The dev server runs at `http://localhost:3001` — one server serves both the React app and the API.

## Project Structure

```
src/
├── main.jsx                  # Entry point, router config
├── index.css                 # Tailwind imports, theme tokens, animations
├── layouts/
│   └── AppLayout.jsx         # Shared shell (sidebar + tab bar + AI panel)
├── pages/
│   ├── Dashboard.jsx         # Home — recently studied, active courses, suggested plan
│   ├── Workspace.jsx         # File manager — folders, files, breadcrumbs, list/grid view
│   ├── Course.jsx            # Course view — overview, content, files, about tabs + mindmap
│   └── ComingSoon.jsx        # Placeholder for Progress, Academics, Review
├── components/
│   ├── Sidebar.jsx           # Nav, folder selector, collapsible sections, theme toggle, profile
│   ├── TabBar.jsx            # Clickable tabs with active/modified state
│   ├── AIPanel.jsx           # Chat window with Ask/Act/Advise modes, textarea, send
│   ├── RecentlyStudied.jsx   # Recent study items list
│   ├── ActiveCourses.jsx     # Course progress bars
│   ├── SuggestedPlan.jsx     # AI-generated study action cards
│   └── GuidedModeModal.jsx   # Guided Learning Mode confirmation modal
├── data/
│   └── fileSystem.js         # Shared placeholder file tree data
docs/
├── detailed-specs.md         # Full product spec (architecture, agents, features, API)
└── DDL.sql                   # Supabase PostgreSQL schema (28 tables, RLS, triggers)
```

## Pages

**Dashboard** (`/`) — Landing page with recently studied items, active course progress bars, and an AI-generated suggested study plan.

**My Workspace** (`/workspace`) — File manager with nested folder navigation, breadcrumbs, list/grid view toggle, sortable columns, search bar, and a Launch button to open courses.

**Course** (`/course/:name`) — Four-tab course view:
- **Overview** — Next Up card, progress stats, interactive knowledge mindmap with map/linear toggle
- **Content** — Chapter list with per-chapter progress bars
- **Files** — Expand-only file browser (no folder diving)
- **About** — Course metadata and description

Side cards show Upcoming Exam, flashcard Sets with mastery progress, and Recent Activity.

## Database

**Migration required:** Before using folder-only mode, run `docs/migrations/001_folder_only_course_files.sql` in the Supabase SQL editor. This makes `course_id` nullable on `course_files` and updates RLS to allow access via `folder_id`.

The full schema is in `docs/DDL.sql` — 28 tables covering:

- User profiles and preferences
- Workspace folders and file hierarchy
- Courses, exams, and course files
- Topic tree with pgvector embeddings
- Bayesian mastery beliefs and question attempts
- FSRS spaced repetition state
- Study sets with per-card progress tracking
- Study sessions and scheduled sessions
- Chat conversations and messages
- Agent run observability logs
- UI state (tabs, favorites, shortcuts, workspace state)
- Notifications and study pattern analytics

All tables have Row Level Security policies. A trigger auto-creates profile, preferences, and workspace state on Supabase Auth signup.

## Design

Dark theme inspired by VS Code. Key colors:

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#1e1e1e` | Main background |
| `bg-sidebar` | `#252526` | Sidebar, panels |
| `accent-blue` | `#2b7fff` | Active states, progress bars, CTAs |
| `accent-green` | `#05df72` | Success, mastery indicators |
| `text-primary` | `#cccccc` | Primary text |
| `text-secondary` | `#858585` | Muted text |

Typography uses the Geist font family (sans + mono).

## License

Private — HackCU 2026.
