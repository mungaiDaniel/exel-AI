# ExcelAI Dashboard — Complete Project Blueprint
> A full-stack Excel intelligence platform with AI-powered analytics, beautiful dashboards, and natural language querying.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Typography & Design System](#2-typography--design-system)
3. [Tech Stack](#3-tech-stack)
4. [Project Folder Structure](#4-project-folder-structure)
5. [Database Schema](#5-database-schema)
6. [Backend — FastAPI](#6-backend--fastapi)
7. [Frontend — React + Vite](#7-frontend--react--vite)
8. [Excel Formula Engine](#8-excel-formula-engine)
9. [AI Integration](#9-ai-integration)
10. [Docker & DevOps Setup](#10-docker--devops-setup)
11. [Environment Variables](#11-environment-variables)
12. [API Endpoints Reference](#12-api-endpoints-reference)
13. [Feature Roadmap](#13-feature-roadmap)
14. [Getting Started](#14-getting-started)

---

## 1. Project Overview

### What Is This?

**ExcelAI Dashboard** is a web application that lets users upload Excel files (`.xlsx`, `.xls`, `.csv`) and instantly get:

- Beautiful, interactive charts and graphs
- Filterable, sortable data tables
- A built-in formula engine (VLOOKUP, SUMIF, PIVOT, etc.)
- An AI assistant that answers questions about their data in plain English
- Export capabilities (PDF, PNG, CSV)

### Who Is It For?

- Business analysts who work with Excel but want better visualisations
- Teams that need to share data insights without Power BI or Tableau licences
- Developers building internal tools on top of spreadsheet data
- Anyone who has ever asked "what does this formula actually do?"

### Core Value Propositions

| Feature | What it does |
|---|---|
| Upload & Parse | Drag-and-drop Excel files; multi-sheet support |
| Auto Dashboard | Detects column types and auto-generates relevant charts |
| Formula Engine | Run Excel formulas (SUM, IF, VLOOKUP, PIVOT, etc.) directly in the browser |
| AI Chat | Ask questions like "which region had the highest Q3 sales?" |
| Export | Download charts as PNG, full report as PDF, data as CSV |
| Sharing | Generate shareable dashboard links |

---

## 2. Typography & Design System

### Recommended Font Pairing

The app deals with data, tables, and numbers — so the typography needs to be **precise, modern, and highly legible**, while still feeling premium. Here is the recommended pairing:

#### Primary Display Font — `Syne`
- Use for: App name, dashboard titles, section headings, hero text
- Why: Syne has a distinctive, geometric personality that feels "data-intelligent" without being sterile. Its wide letterforms command authority on a dashboard header.
- Weight used: `700` (Bold) for display, `600` for large headings

```css
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&display=swap');
```

#### Body & UI Font — `DM Sans`
- Use for: Labels, body text, table content, nav items, form inputs, buttons
- Why: DM Sans is clean and humanist — it reads perfectly at small sizes in data tables, and its numbers are well-balanced. It pairs perfectly with Syne without competing.
- Weight used: `400` (Regular), `500` (Medium), `600` (Semibold for emphasis)

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
```

#### Monospace Font — `JetBrains Mono`
- Use for: Formula bar, code snippets, cell references, AI code output
- Why: Designed specifically for data and code — exceptional legibility for formulas like `=VLOOKUP(A2,$D$1:$E$100,2,FALSE)`

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
```

### Full CSS Design System

```css
/* =============================
   EXCELAI — DESIGN SYSTEM
   globals.css
   ============================= */

@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  /* ── Fonts ── */
  --font-display:  'Syne', sans-serif;
  --font-body:     'DM Sans', sans-serif;
  --font-mono:     'JetBrains Mono', monospace;

  /* ── Brand Colors ── */
  --color-brand-primary:    #1A56DB;   /* Electric blue — primary actions */
  --color-brand-secondary:  #0E9F6E;   /* Emerald green — success, positive data */
  --color-brand-accent:     #FF6B35;   /* Vivid orange — highlights, alerts */
  --color-brand-purple:     #7C3AED;   /* Purple — AI assistant accents */

  /* ── Neutral Palette ── */
  --color-bg-base:          #0F1117;   /* Dark background (primary surface) */
  --color-bg-surface:       #1A1D27;   /* Cards, panels */
  --color-bg-elevated:      #22263A;   /* Modals, dropdowns */
  --color-bg-hover:         #2A2E42;   /* Hover states */
  --color-border:           #2E3248;   /* Dividers, card borders */
  --color-border-subtle:    #1E2133;   /* Very subtle dividers */

  /* ── Text ── */
  --color-text-primary:     #F1F3F9;   /* Main text */
  --color-text-secondary:   #8B90A7;   /* Labels, muted */
  --color-text-tertiary:    #4E5370;   /* Hints, placeholders */
  --color-text-on-brand:    #FFFFFF;

  /* ── Chart Colors (ordered by priority) ── */
  --chart-1:   #1A56DB;
  --chart-2:   #0E9F6E;
  --chart-3:   #FF6B35;
  --chart-4:   #7C3AED;
  --chart-5:   #F05252;
  --chart-6:   #FBBF24;
  --chart-7:   #3B82F6;
  --chart-8:   #10B981;

  /* ── Semantic States ── */
  --color-success:   #0E9F6E;
  --color-warning:   #FBBF24;
  --color-error:     #F05252;
  --color-info:      #3B82F6;

  /* ── Spacing Scale ── */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* ── Border Radius ── */
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  14px;
  --radius-xl:  20px;
  --radius-full: 9999px;

  /* ── Shadows ── */
  --shadow-sm:  0 1px 3px rgba(0,0,0,0.4);
  --shadow-md:  0 4px 12px rgba(0,0,0,0.5);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.6);
  --shadow-glow-brand: 0 0 24px rgba(26,86,219,0.3);

  /* ── Transitions ── */
  --transition-fast:   150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow:   400ms ease;
}

/* Light Mode Override (optional) */
[data-theme="light"] {
  --color-bg-base:        #F8FAFF;
  --color-bg-surface:     #FFFFFF;
  --color-bg-elevated:    #F1F5FF;
  --color-bg-hover:       #E8EEFF;
  --color-border:         #DDE2F0;
  --color-text-primary:   #0D1117;
  --color-text-secondary: #4B5563;
  --color-text-tertiary:  #9CA3AF;
}

/* ── Base Styles ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; scroll-behavior: smooth; }
body {
  font-family: var(--font-body);
  font-weight: 400;
  background: var(--color-bg-base);
  color: var(--color-text-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* ── Typography Scale ── */
h1, h2, h3 { font-family: var(--font-display); line-height: 1.2; }
h4, h5, h6 { font-family: var(--font-body); font-weight: 600; }

h1 { font-size: clamp(2rem, 4vw, 3rem);   font-weight: 800; }
h2 { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 700; }
h3 { font-size: 1.25rem;                  font-weight: 600; }
h4 { font-size: 1.1rem; }
p  { font-size: 1rem; line-height: 1.7; }

.label  { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-secondary); }
.caption{ font-size: 0.8rem; color: var(--color-text-tertiary); }
.code   { font-family: var(--font-mono); font-size: 0.875rem; }

/* ── Metric Numbers ── */
.stat-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 2rem;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}
```

### Color Usage Guide

| Color | Token | Use Case |
|---|---|---|
| Electric Blue | `--color-brand-primary` | Primary buttons, links, active nav |
| Emerald Green | `--color-brand-secondary` | Positive metrics, success states |
| Vivid Orange | `--color-brand-accent` | Alerts, warnings, call-to-action |
| Purple | `--color-brand-purple` | AI chat panel, AI-generated content |
| Dark base | `--color-bg-base` | Main app background |

---

## 3. Tech Stack

### Full Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                     │
│  Vite · TypeScript · Tailwind CSS · shadcn/ui          │
│  Recharts · TanStack Table · Zustand · Axios           │
└────────────────────┬────────────────────────────────────┘
                     │ REST + WebSocket
┌────────────────────▼────────────────────────────────────┐
│                  BACKEND (Python)                       │
│  FastAPI · Pydantic v2 · SQLAlchemy 2 · Alembic        │
│  Celery · openpyxl · pandas · formulas lib             │
└──────────┬─────────────────┬───────────────────────────┘
           │                 │
┌──────────▼──────┐  ┌───────▼──────────────────────────┐
│  PostgreSQL     │  │  Redis (cache + job queue)        │
│  + pgvector     │  └───────────────────────────────────┘
└─────────────────┘
           │
┌──────────▼──────────────────────────────────────────────┐
│  AI Layer                                               │
│  Claude API (Anthropic) · LangChain · pgvector          │
└─────────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────┐
│  File Storage                                           │
│  MinIO (local) → AWS S3 (production)                   │
└─────────────────────────────────────────────────────────┘
```

### Package Versions (Pinned)

#### Backend (`requirements.txt`)

```txt
# Web Framework
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.12

# Database
sqlalchemy==2.0.36
alembic==1.14.0
asyncpg==0.30.0
psycopg2-binary==2.9.10
pgvector==0.3.6

# Validation
pydantic==2.9.2
pydantic-settings==2.6.1
email-validator==2.2.0

# Excel Processing
openpyxl==3.1.5
pandas==2.2.3
xlrd==2.0.1
formulas==1.2.7

# Background Tasks
celery==5.4.0
redis==5.1.1
flower==2.0.1

# AI
anthropic==0.37.1
langchain==0.3.7
langchain-anthropic==0.3.0
langchain-community==0.3.7
openai==1.52.0

# File Storage
boto3==1.35.51
minio==7.2.10

# Export
reportlab==4.2.5
matplotlib==3.9.2
plotly==5.24.1

# Utilities
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
httpx==0.27.2
python-dotenv==1.0.1
tenacity==9.0.0
```

#### Frontend (`package.json`)

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "axios": "^1.7.7",
    "zustand": "^5.0.1",
    "recharts": "^2.13.3",
    "@tanstack/react-table": "^8.20.5",
    "@tanstack/react-query": "^5.59.20",
    "react-dropzone": "^14.2.10",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.454.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4",
    "date-fns": "^4.1.0",
    "papaparse": "^5.4.1",
    "xlsx": "^0.18.5",
    "framer-motion": "^11.11.11"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.3",
    "vite": "^5.4.10",
    "typescript": "^5.6.3",
    "tailwindcss": "^3.4.14",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1"
  }
}
```

---

## 4. Project Folder Structure

```
excelai-dashboard/
│
├── 📁 backend/
│   ├── 📁 app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app entry point
│   │   ├── config.py                  # Settings with pydantic-settings
│   │   │
│   │   ├── 📁 api/                    # Route handlers
│   │   │   ├── __init__.py
│   │   │   ├── deps.py                # Shared dependencies (auth, db)
│   │   │   └── 📁 v1/
│   │   │       ├── __init__.py
│   │   │       ├── router.py          # v1 API router aggregator
│   │   │       ├── auth.py            # /auth/login, /auth/register, /auth/refresh
│   │   │       ├── workbooks.py       # /workbooks CRUD + upload
│   │   │       ├── sheets.py          # /sheets — individual sheet data
│   │   │       ├── dashboards.py      # /dashboards — saved layouts
│   │   │       ├── formulas.py        # /formulas — evaluate + explain
│   │   │       ├── charts.py          # /charts — config generation
│   │   │       ├── chat.py            # /chat — AI conversation (WebSocket)
│   │   │       └── export.py          # /export — PDF, CSV, PNG
│   │   │
│   │   ├── 📁 models/                 # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── base.py                # Base model, timestamps
│   │   │   ├── user.py
│   │   │   ├── workbook.py
│   │   │   ├── sheet.py
│   │   │   ├── dashboard.py
│   │   │   ├── chart.py
│   │   │   ├── formula.py
│   │   │   └── chat_message.py
│   │   │
│   │   ├── 📁 schemas/                # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── workbook.py
│   │   │   ├── sheet.py
│   │   │   ├── dashboard.py
│   │   │   ├── chart.py
│   │   │   ├── formula.py
│   │   │   └── chat.py
│   │   │
│   │   ├── 📁 services/               # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── 📁 excel/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── parser.py          # openpyxl + pandas parsing
│   │   │   │   ├── formula_engine.py  # Formula evaluation
│   │   │   │   ├── type_detector.py   # Detect column types
│   │   │   │   └── chart_advisor.py   # Auto-suggest chart types
│   │   │   ├── 📁 ai/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── claude_service.py  # Claude API integration
│   │   │   │   ├── context_builder.py # Build spreadsheet context for AI
│   │   │   │   ├── embeddings.py      # pgvector embeddings
│   │   │   │   └── prompt_templates.py
│   │   │   ├── 📁 export/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── pdf_exporter.py
│   │   │   │   ├── csv_exporter.py
│   │   │   │   └── image_exporter.py
│   │   │   ├── storage_service.py     # S3/MinIO file operations
│   │   │   └── auth_service.py        # JWT auth logic
│   │   │
│   │   ├── 📁 workers/                # Celery async tasks
│   │   │   ├── __init__.py
│   │   │   ├── celery_app.py
│   │   │   ├── parse_tasks.py         # Async Excel parsing
│   │   │   ├── export_tasks.py        # Async report generation
│   │   │   └── embed_tasks.py         # Background embedding generation
│   │   │
│   │   ├── 📁 core/
│   │   │   ├── __init__.py
│   │   │   ├── database.py            # Async DB session factory
│   │   │   ├── security.py            # Password hashing, JWT
│   │   │   ├── cache.py               # Redis client
│   │   │   └── exceptions.py          # Custom exception handlers
│   │   │
│   │   └── 📁 utils/
│   │       ├── __init__.py
│   │       ├── pagination.py
│   │       ├── validators.py
│   │       └── formatters.py
│   │
│   ├── 📁 alembic/                    # Database migrations
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── 📁 versions/
│   │       └── 001_initial_schema.py
│   │
│   ├── 📁 tests/
│   │   ├── conftest.py
│   │   ├── 📁 unit/
│   │   │   ├── test_parser.py
│   │   │   ├── test_formula_engine.py
│   │   │   └── test_ai_service.py
│   │   └── 📁 integration/
│   │       ├── test_upload.py
│   │       └── test_chat.py
│   │
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── Dockerfile
│
├── 📁 frontend/
│   ├── 📁 public/
│   │   └── favicon.ico
│   │
│   ├── 📁 src/
│   │   ├── main.tsx                   # React entry point
│   │   ├── App.tsx                    # Root component + router
│   │   ├── vite-env.d.ts
│   │   │
│   │   ├── 📁 pages/
│   │   │   ├── Landing.tsx            # Public marketing page
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx          # Main app dashboard
│   │   │   ├── WorkbookView.tsx       # Single workbook view
│   │   │   ├── SheetView.tsx          # Individual sheet + charts
│   │   │   ├── FormulaLab.tsx         # Formula playground
│   │   │   ├── AiChat.tsx             # AI conversation page
│   │   │   └── Settings.tsx
│   │   │
│   │   ├── 📁 components/
│   │   │   ├── 📁 layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Topbar.tsx
│   │   │   │   └── AppShell.tsx
│   │   │   │
│   │   │   ├── 📁 upload/
│   │   │   │   ├── DropZone.tsx       # Drag-and-drop file uploader
│   │   │   │   ├── UploadProgress.tsx
│   │   │   │   └── FilePreview.tsx
│   │   │   │
│   │   │   ├── 📁 charts/
│   │   │   │   ├── LineChart.tsx
│   │   │   │   ├── BarChart.tsx
│   │   │   │   ├── PieChart.tsx
│   │   │   │   ├── ScatterChart.tsx
│   │   │   │   ├── AreaChart.tsx
│   │   │   │   ├── HeatmapChart.tsx
│   │   │   │   └── ChartWrapper.tsx   # Common chart container
│   │   │   │
│   │   │   ├── 📁 table/
│   │   │   │   ├── DataTable.tsx      # TanStack Table
│   │   │   │   ├── PivotTable.tsx
│   │   │   │   ├── TableFilters.tsx
│   │   │   │   └── ColumnSelector.tsx
│   │   │   │
│   │   │   ├── 📁 formula/
│   │   │   │   ├── FormulaBar.tsx     # Excel-style formula input
│   │   │   │   ├── FormulaResult.tsx
│   │   │   │   └── FunctionLibrary.tsx
│   │   │   │
│   │   │   ├── 📁 ai/
│   │   │   │   ├── ChatPanel.tsx      # AI chat sidebar
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   └── InsightCard.tsx    # Auto-generated AI insight
│   │   │   │
│   │   │   └── 📁 ui/                 # Primitive UI components
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Tooltip.tsx
│   │   │       ├── Skeleton.tsx
│   │   │       └── Select.tsx
│   │   │
│   │   ├── 📁 hooks/
│   │   │   ├── useWorkbook.ts         # Workbook data fetching
│   │   │   ├── useCharts.ts           # Chart config management
│   │   │   ├── useFormula.ts          # Formula evaluation
│   │   │   ├── useAiChat.ts           # WebSocket AI chat
│   │   │   ├── useUpload.ts           # File upload + progress
│   │   │   └── useExport.ts           # Export actions
│   │   │
│   │   ├── 📁 store/                  # Zustand state management
│   │   │   ├── authStore.ts
│   │   │   ├── workbookStore.ts
│   │   │   └── uiStore.ts
│   │   │
│   │   ├── 📁 api/                    # Axios API client layer
│   │   │   ├── client.ts              # Axios instance + interceptors
│   │   │   ├── auth.api.ts
│   │   │   ├── workbooks.api.ts
│   │   │   ├── formulas.api.ts
│   │   │   ├── charts.api.ts
│   │   │   └── chat.api.ts
│   │   │
│   │   ├── 📁 types/                  # TypeScript interfaces
│   │   │   ├── workbook.types.ts
│   │   │   ├── chart.types.ts
│   │   │   ├── formula.types.ts
│   │   │   └── ai.types.ts
│   │   │
│   │   └── 📁 utils/
│   │       ├── formatters.ts          # Number, date, currency formatting
│   │       ├── chartHelpers.ts        # Data → chart config transformers
│   │       └── colorUtils.ts          # Chart color assignment
│   │
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── Dockerfile
│
├── 📁 nginx/
│   └── nginx.conf                     # Reverse proxy config
│
├── 📁 scripts/
│   ├── seed_db.py                     # Seed test data
│   └── create_admin.py
│
├── docker-compose.yml                 # Full stack dev environment
├── docker-compose.prod.yml            # Production overrides
├── .env.example                       # Environment variable template
├── .gitignore
└── README.md
```

---

## 5. Database Schema

### Tables Overview

```sql
-- Users table
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    password    VARCHAR(255),             -- NULL if OAuth
    provider    VARCHAR(50) DEFAULT 'local', -- 'local' | 'google' | 'github'
    avatar_url  TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Workbooks (uploaded Excel files)
CREATE TABLE workbooks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(500) NOT NULL,
    file_name   VARCHAR(500) NOT NULL,
    file_size   BIGINT NOT NULL,          -- bytes
    file_url    TEXT NOT NULL,            -- S3/MinIO path
    status      VARCHAR(50) DEFAULT 'processing', -- processing | ready | error
    sheet_count INTEGER DEFAULT 0,
    row_count   BIGINT DEFAULT 0,
    meta        JSONB DEFAULT '{}',       -- raw file metadata
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Sheets (individual worksheets within a workbook)
CREATE TABLE sheets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbook_id UUID NOT NULL REFERENCES workbooks(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    index       INTEGER NOT NULL,
    row_count   INTEGER DEFAULT 0,
    col_count   INTEGER DEFAULT 0,
    columns     JSONB NOT NULL DEFAULT '[]',  -- [{name, type, sample_values}]
    data        JSONB,                        -- Parsed cell data (paginated from API)
    summary     TEXT,                         -- AI-generated summary
    embedding   vector(1536),                 -- pgvector for semantic search
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboards (saved chart + widget layouts)
CREATE TABLE dashboards (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbook_id UUID NOT NULL REFERENCES workbooks(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id),
    name        VARCHAR(255) NOT NULL,
    layout      JSONB NOT NULL DEFAULT '[]',  -- Grid layout config
    is_public   BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(64),                  -- For shareable links
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Charts (chart configurations saved to a dashboard)
CREATE TABLE charts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    sheet_id    UUID REFERENCES sheets(id),
    title       VARCHAR(255),
    chart_type  VARCHAR(50) NOT NULL,         -- line | bar | pie | scatter | area | heatmap
    config      JSONB NOT NULL,               -- Full Recharts config
    position    JSONB DEFAULT '{}',           -- {x, y, w, h} grid position
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Formulas (saved formula history)
CREATE TABLE formulas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    sheet_id    UUID REFERENCES sheets(id),
    expression  TEXT NOT NULL,               -- =VLOOKUP(A1, B:C, 2, FALSE)
    result      JSONB,                        -- Computed result
    explanation TEXT,                         -- AI plain-English explanation
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages (AI conversation history)
CREATE TABLE chat_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    workbook_id UUID REFERENCES workbooks(id),
    role        VARCHAR(20) NOT NULL,         -- 'user' | 'assistant'
    content     TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}',           -- chart refs, cell refs, etc.
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workbooks_user_id      ON workbooks(user_id);
CREATE INDEX idx_sheets_workbook_id     ON sheets(workbook_id);
CREATE INDEX idx_dashboards_workbook_id ON dashboards(workbook_id);
CREATE INDEX idx_charts_dashboard_id    ON charts(dashboard_id);
CREATE INDEX idx_chat_messages_user     ON chat_messages(user_id, workbook_id);
CREATE INDEX idx_sheets_embedding       ON sheets USING ivfflat (embedding vector_cosine_ops);
```

---

## 6. Backend — FastAPI

### `main.py` — App Entry Point

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.database import engine
from app.config import settings

app = FastAPI(
    title="ExcelAI Dashboard API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
```

### `config.py` — Settings

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    # App
    APP_NAME: str = "ExcelAI Dashboard"
    DEBUG: bool = False
    SECRET_KEY: str
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # Database
    DATABASE_URL: str
    ASYNC_DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET: str = "excelai-files"

    # AI
    ANTHROPIC_API_KEY: str
    AI_MODEL: str = "claude-opus-4-5"

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

settings = Settings()
```

### `services/excel/parser.py` — Excel Parser

```python
import openpyxl
import pandas as pd
from typing import Any

class ExcelParser:
    """Parse Excel files into structured JSON data."""

    SUPPORTED_TYPES = [".xlsx", ".xls", ".xlsm", ".csv"]

    def parse_workbook(self, file_path: str) -> dict:
        """Parse all sheets from a workbook."""
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheets = []
        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            sheet_data = self._parse_sheet(ws)
            sheets.append(sheet_data)
        return {"sheet_count": len(sheets), "sheets": sheets}

    def _parse_sheet(self, ws) -> dict:
        """Parse a single worksheet."""
        df = pd.DataFrame(ws.values)
        df.columns = df.iloc[0]       # First row as headers
        df = df.iloc[1:].reset_index(drop=True)

        columns = self._detect_columns(df)
        data = df.to_dict(orient="records")

        return {
            "name": ws.title,
            "row_count": len(df),
            "col_count": len(df.columns),
            "columns": columns,
            "data": data[:1000],      # First 1000 rows inline
            "has_more": len(df) > 1000,
        }

    def _detect_columns(self, df: pd.DataFrame) -> list[dict]:
        """Auto-detect column types."""
        columns = []
        for col in df.columns:
            col_data = df[col].dropna()
            col_type = self._infer_type(col_data)
            columns.append({
                "name": str(col),
                "type": col_type,
                "nullable": df[col].isna().any(),
                "unique_count": df[col].nunique(),
                "sample_values": col_data.head(5).tolist(),
            })
        return columns

    def _infer_type(self, series: pd.Series) -> str:
        if pd.api.types.is_datetime64_any_dtype(series):
            return "datetime"
        if pd.api.types.is_numeric_dtype(series):
            return "currency" if series.name and any(
                k in str(series.name).lower()
                for k in ["price", "cost", "revenue", "salary", "amount"]
            ) else "number"
        return "text"
```

---

## 7. Frontend — React + Vite

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

### `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          primary:   '#1A56DB',
          secondary: '#0E9F6E',
          accent:    '#FF6B35',
          purple:    '#7C3AED',
        },
        surface: {
          base:     '#0F1117',
          card:     '#1A1D27',
          elevated: '#22263A',
          hover:    '#2A2E42',
        },
        border: '#2E3248',
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '14px',
        xl: '20px',
      },
    },
  },
  plugins: [],
} satisfies Config
```

### `store/workbookStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkbookStore {
  currentWorkbookId: string | null
  currentSheetIndex: number
  selectedColumns: string[]
  setWorkbook: (id: string) => void
  setSheet: (index: number) => void
  toggleColumn: (col: string) => void
}

export const useWorkbookStore = create<WorkbookStore>()(
  persist(
    (set, get) => ({
      currentWorkbookId: null,
      currentSheetIndex: 0,
      selectedColumns: [],
      setWorkbook: (id) => set({ currentWorkbookId: id, currentSheetIndex: 0 }),
      setSheet: (index) => set({ currentSheetIndex: index }),
      toggleColumn: (col) => {
        const cols = get().selectedColumns
        set({ selectedColumns: cols.includes(col)
          ? cols.filter(c => c !== col)
          : [...cols, col]
        })
      },
    }),
    { name: 'workbook-store' }
  )
)
```

---

## 8. Excel Formula Engine

### Supported Formulas (Phase 1)

| Category | Functions |
|---|---|
| Math | `SUM`, `SUMIF`, `SUMIFS`, `AVERAGE`, `AVERAGEIF`, `MIN`, `MAX`, `COUNT`, `COUNTIF`, `ROUND`, `ABS`, `MOD`, `POWER`, `SQRT` |
| Logic | `IF`, `IFS`, `AND`, `OR`, `NOT`, `IFERROR`, `IFNA` |
| Lookup | `VLOOKUP`, `HLOOKUP`, `XLOOKUP`, `INDEX`, `MATCH`, `OFFSET` |
| Text | `CONCAT`, `LEFT`, `RIGHT`, `MID`, `LEN`, `TRIM`, `UPPER`, `LOWER`, `SUBSTITUTE`, `FIND`, `TEXT` |
| Date | `TODAY`, `NOW`, `YEAR`, `MONTH`, `DAY`, `DATEDIF`, `NETWORKDAYS`, `EDATE` |
| Statistical | `MEDIAN`, `STDEV`, `VAR`, `PERCENTILE`, `RANK`, `CORREL` |
| Financial | `PMT`, `PV`, `FV`, `NPV`, `IRR`, `RATE` |

### `services/excel/formula_engine.py`

```python
import formulas
import pandas as pd

class FormulaEngine:
    def evaluate(self, expression: str, context: dict) -> dict:
        """
        Evaluate an Excel formula.
        context: { "A1": 10, "B1": 20, "sheet_df": DataFrame }
        """
        try:
            func = formulas.Parser().ast(expression)[1].compile()
            result = func(**context)
            return {
                "success": True,
                "result": result,
                "type": type(result).__name__
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def explain_formula(self, expression: str) -> str:
        """Return a plain-English breakdown of a formula."""
        # Delegated to AI service — see claude_service.py
        pass
```

---

## 9. AI Integration

### `services/ai/claude_service.py`

```python
import anthropic
from app.config import settings

class ClaudeService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.AI_MODEL

    def build_context(self, sheet_data: dict) -> str:
        """Build a compact data context for the AI."""
        cols = [f"{c['name']} ({c['type']})" for c in sheet_data["columns"]]
        sample = sheet_data["data"][:10]
        return f"""
You are analysing a spreadsheet called "{sheet_data['name']}".
Columns: {', '.join(cols)}
Row count: {sheet_data['row_count']}
Sample data (first 10 rows):
{sample}
"""

    async def chat(self, messages: list, context: str) -> str:
        """Send a chat message with spreadsheet context."""
        system_prompt = f"""
You are ExcelAI, an expert data analyst assistant.
{context}
Answer questions about this data concisely and accurately.
When referencing specific numbers, always cite the column name.
If asked to suggest a chart, respond with JSON: {{"chart_type": "bar", "x": "Month", "y": "Revenue"}}
"""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=system_prompt,
            messages=messages,
        )
        return response.content[0].text

    async def explain_formula(self, formula: str) -> str:
        """Explain an Excel formula in plain English."""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"Explain this Excel formula in plain English, step by step: {formula}"
            }]
        )
        return response.content[0].text

    async def generate_insights(self, sheet_data: dict) -> list[str]:
        """Auto-generate insights when a file is uploaded."""
        context = self.build_context(sheet_data)
        response = self.client.messages.create(
            model=self.model,
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"{context}\n\nGenerate 3 key insights from this data. Return JSON array of strings."
            }]
        )
        return response.content[0].text
```

---

## 10. Docker & DevOps Setup

### `docker-compose.yml`

```yaml
version: '3.9'

services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: excelai
      POSTGRES_PASSWORD: excelai_secret
      POSTGRES_DB: excelai_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U excelai -d excelai_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio_admin
      MINIO_ROOT_PASSWORD: minio_secret
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://excelai:excelai_secret@db:5432/excelai_db
      - REDIS_URL=redis://redis:6379/0
    volumes:
      - ./backend:/app
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  worker:
    build: ./backend
    command: celery -A app.workers.celery_app worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://excelai:excelai_secret@db:5432/excelai_db
      - REDIS_URL=redis://redis:6379/0
    volumes:
      - ./backend:/app
    depends_on:
      - backend
      - redis

  frontend:
    build: ./frontend
    command: npm run dev -- --host
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## 11. Environment Variables

### `.env.example`

```bash
# ── App ──────────────────────────────────────
APP_NAME="ExcelAI Dashboard"
DEBUG=true
SECRET_KEY=your-secret-key-change-in-production
CORS_ORIGINS=["http://localhost:5173"]

# ── Database ─────────────────────────────────
DATABASE_URL=postgresql://excelai:excelai_secret@localhost:5432/excelai_db
ASYNC_DATABASE_URL=postgresql+asyncpg://excelai:excelai_secret@localhost:5432/excelai_db

# ── Redis ────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── File Storage (MinIO local / S3 production) ──
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minio_admin
MINIO_SECRET_KEY=minio_secret
MINIO_BUCKET=excelai-files
MINIO_SECURE=false

# ── AI ───────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-your-key-here
AI_MODEL=claude-opus-4-5

# ── JWT Auth ─────────────────────────────────
JWT_SECRET_KEY=your-jwt-secret-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# ── Frontend (Vite) ──────────────────────────
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/api/v1/chat/ws
```

---

## 12. API Endpoints Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create new account |
| `POST` | `/auth/login` | Login, returns JWT |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/auth/me` | Current user profile |

### Workbooks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/workbooks` | List user's workbooks |
| `POST` | `/workbooks/upload` | Upload Excel file (multipart) |
| `GET` | `/workbooks/{id}` | Get workbook metadata |
| `DELETE` | `/workbooks/{id}` | Delete workbook |
| `GET` | `/workbooks/{id}/sheets` | List sheets |

### Sheets & Data

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/sheets/{id}` | Sheet metadata + columns |
| `GET` | `/sheets/{id}/data` | Paginated row data |
| `GET` | `/sheets/{id}/summary` | AI-generated summary |

### Formulas

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/formulas/evaluate` | Evaluate a formula |
| `POST` | `/formulas/explain` | AI plain-English explanation |
| `GET` | `/formulas/history` | User formula history |

### Charts & Dashboards

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/charts/suggest` | AI chart type recommendation |
| `GET` | `/dashboards` | List dashboards |
| `POST` | `/dashboards` | Create dashboard |
| `PUT` | `/dashboards/{id}` | Update layout |
| `GET` | `/dashboards/{id}/share` | Get shareable link |

### AI Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat/message` | Send chat message (REST) |
| `WS` | `/chat/ws/{workbook_id}` | WebSocket streaming chat |
| `GET` | `/chat/history/{workbook_id}` | Conversation history |

### Export

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/export/pdf` | Export dashboard as PDF |
| `POST` | `/export/csv/{sheet_id}` | Export sheet as CSV |
| `POST` | `/export/image/{chart_id}` | Export chart as PNG |

---

## 13. Feature Roadmap

### Phase 1 — MVP (Weeks 1–4)
- [ ] User auth (register, login, JWT)
- [ ] File upload (drag-drop, `.xlsx`, `.csv`)
- [ ] Excel parser (openpyxl + pandas)
- [ ] Auto-generated bar, line, and pie charts
- [ ] Sortable, filterable data table
- [ ] Basic formula evaluation (SUM, AVERAGE, COUNT, IF)
- [ ] Docker dev environment

### Phase 2 — Power Features (Weeks 5–8)
- [ ] Multi-sheet support
- [ ] Pivot table UI
- [ ] All formula categories (see section 8)
- [ ] Dashboard builder (drag-and-drop chart layout)
- [ ] Shareable dashboard links
- [ ] Dark / light mode toggle
- [ ] Export to PDF and CSV

### Phase 3 — AI Layer (Weeks 9–12)
- [ ] AI chat panel (Claude API)
- [ ] Streaming WebSocket responses
- [ ] Formula explainer
- [ ] Auto-insights on upload
- [ ] Semantic search (pgvector)
- [ ] Anomaly detection
- [ ] AI-recommended chart types

### Phase 4 — Scale & Polish (Weeks 13–16)
- [ ] Google OAuth
- [ ] Team workspaces
- [ ] Version history for workbooks
- [ ] Scheduled email reports
- [ ] Public API with API keys
- [ ] Performance: virtual scroll for large datasets (100k+ rows)

---

## 14. Getting Started

### Prerequisites

Make sure these are installed before starting:

- **Docker Desktop** (includes Docker Compose)
- **Node.js** v20+
- **Python** 3.12+
- **VS Code** with recommended extensions (below)

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "charliermarsh.ruff",
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-azuretools.vscode-docker",
    "rangav.vscode-thunder-client",
    "mtxr.sqltools",
    "mtxr.sqltools-driver-pg"
  ]
}
```

### Step-by-Step Setup

```bash
# 1. Clone or create the project
mkdir excelai-dashboard && cd excelai-dashboard

# 2. Copy environment variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Start all services with Docker
docker compose up -d

# 4. Run database migrations
docker compose exec backend alembic upgrade head

# 5. Install frontend dependencies (for local dev without Docker)
cd frontend && npm install

# 6. Open the app
# Frontend:   http://localhost:5173
# API docs:   http://localhost:8000/api/docs
# MinIO UI:   http://localhost:9001
# Flower:     http://localhost:5555  (Celery job monitor)
```

### Development Workflow

```bash
# Watch backend logs
docker compose logs -f backend

# Watch worker logs
docker compose logs -f worker

# Run backend tests
docker compose exec backend pytest tests/ -v

# Create a new migration after model changes
docker compose exec backend alembic revision --autogenerate -m "add_new_table"

# Reset database (caution!)
docker compose down -v && docker compose up -d
docker compose exec backend alembic upgrade head
```

---

*Last updated: June 2026 — ExcelAI Dashboard v1.0 Blueprint*
