# RealityLayer — Digital Twin for Websites

> **See your website as a living system.**

RealityLayer transforms any publicly accessible website into an interactive **digital twin**. Rather than presenting a generic checklist, RealityLayer crawls and analyzes pages and relationships, evaluates technical health, SEO, performance, accessibility, and content structure, and visualizes everything as an interactive, living digital graph.

---

## 🌟 Core Highlights

- 🌐 **Living Digital Twin Canvas**: Interactive graph canvas powered by `@xyflow/react` (React Flow) with hierarchical BFS dagre layout, minimap, health indicator dots, link counts, and instant node inspection.
- ⚡ **Autonomous Crawler Engine**: Safe, respectful crawler equipped with SSRF defenses, robots.txt compliance, sitemap parsing, BFS queueing, canonical deduplication, and rate-limiting politeness delays.
- 🩺 **Multi-Vector Health Scoring (0–100)**: Transparent 6-category weighted scoring:
  - **SEO (25%)**: Title length, meta descriptions, H1 integrity, Open Graph tags, canonicals, robots meta.
  - **Technical (20%)**: Status codes, HTTPS enforcement, mobile viewport, redirect chain depth.
  - **Accessibility (20%)**: Image alt text coverage, form label associations, heading hierarchy sequence.
  - **Structure (15%)**: Orphan node detection, click depth penalties, internal link density.
  - **Content (10%)**: Word counts, content-to-code ratio, heading distribution.
  - **Performance (10%)**: Response times (TTFB) and HTML payload sizes.
- 🧭 **Information Architecture & Topology**: Click depth distribution, orphan node detection, high-degree hub/authority node discovery, and **Graph Fragility Simulation** (test what happens when a node is removed).
- 🔄 **Change Detection & Timeline**: Version comparison between crawl snapshots highlighting added, removed, or modified routes and title tag modifications.
- 📊 **Executive Reports & Public Share**: JSON package export, printable PDF-optimized views, and secret token-based public share links.
- 🤖 **RealityLayer AI Advisor**: Context-aware digital twin assistant providing recommendations, health optimization plans, and code remedies.
- ⚡ **Power-User Ergonomics**: Universal Command Palette (`Ctrl+K` / `Cmd+K`), keyboard shortcuts (`/` to search graph), and instant sample digital twin seeder.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 & Lucide Icons
- **Database & ORM**: SQLite (development) / PostgreSQL-ready via Prisma ORM
- **Authentication**: Auth.js (NextAuth v5 beta) with bcrypt credential encryption
- **Visualization**: `@xyflow/react` (React Flow 12)
- **Crawler & Scraping**: Cheerio & custom queue engine

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies
```bash
cd reality-layer
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Initialize & Seed the Database
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Account Credentials

A fully populated demo digital twin (`Acme Cloud Platform`) is pre-seeded with 14 pages, internal links, diagnostics, and graph topology:

- **Email**: `demo@realitylayer.dev`
- **Password**: `password123`
- **Or click "Explore Demo Twin"** directly from the dashboard!
- **Public Share View**: [http://localhost:3000/share/demo-share-acme](http://localhost:3000/share/demo-share-acme)

---

## 📁 Key Routes

| Route | Description |
|---|---|
| `/` | Marketing landing page with living system hero & feature overview |
| `/login` & `/signup` | Authentication views |
| `/dashboard` | Digital twin fleet overview & project launcher |
| `/projects/[id]` | Real-time crawl progress & project summary |
| `/projects/[id]/twin` | Interactive React Flow digital twin graph & page inspector |
| `/projects/[id]/pages` | Sortable, searchable route explorer |
| `/projects/[id]/issues` | Diagnostic issue center with severity filters |
| `/projects/[id]/seo` | SEO coverage scorecards and tag audit |
| `/projects/[id]/performance` | Response speed & HTML transfer weight analysis |
| `/projects/[id]/structure` | Click depth distribution, orphan node detection & fragility simulator |
| `/projects/[id]/changes` | Version comparison & crawl timeline |
| `/projects/[id]/reports` | JSON export, PDF print view, and public link generator |
| `/share/[token]` | Public read-only client snapshot |
| `/settings` | Account & crawler engine allocation settings |

---

## 🧪 Build & Typecheck Verification

Run the Next.js production build to verify full TypeScript correctness and page prerendering:
```bash
npm run build
```
