# Market Minder Docs Site

A modern documentation website built with **Next.js 15**, **App Router**, **TailwindCSS**, and **TypeScript**. Automatically reads and renders all Markdown files from the `/docs` directory.

## Features

- Automatic route generation from `/docs` folder structure
- Left sidebar navigation (auto-generated, collapsible)
- Table of contents (right panel, scroll-aware)
- Full-text search (`⌘K` / `Ctrl+K`)
- Dark mode toggle
- Mobile responsive layout
- Syntax-highlighted code blocks with copy button
- Previous / Next page navigation
- Breadcrumb navigation
- SEO metadata per page
- Loading skeletons
- Static generation (37 pages pre-rendered at build time)

---

## Project Structure

```
docs-site/
├── public/
│   └── favicon.svg
├── src/
│   ├── app/
│   │   ├── globals.css          # Tailwind + CSS vars + prose styles
│   │   ├── layout.tsx           # Root layout with ThemeProvider
│   │   ├── page.tsx             # Homepage
│   │   ├── not-found.tsx        # 404 page
│   │   └── docs/
│   │       ├── layout.tsx       # Docs shell (sidebar data)
│   │       ├── page.tsx         # Redirects to first doc
│   │       └── [...slug]/
│   │           ├── page.tsx     # Dynamic doc renderer
│   │           └── loading.tsx  # Skeleton loader
│   ├── components/
│   │   ├── docs-layout-client.tsx  # Client shell: header + sidebar + mobile
│   │   ├── sidebar.tsx             # Collapsible nav tree
│   │   ├── table-of-contents.tsx   # Scroll-aware TOC
│   │   ├── doc-content.tsx         # HTML renderer + copy buttons
│   │   ├── breadcrumb.tsx          # Breadcrumb nav
│   │   ├── prev-next-nav.tsx       # Prev/Next footer links
│   │   ├── search-dialog.tsx       # ⌘K search modal
│   │   ├── theme-toggle.tsx        # Dark/light toggle
│   │   └── theme-provider.tsx      # next-themes wrapper
│   └── lib/
│       ├── docs.ts                 # All content parsing utilities
│       └── utils.ts                # cn() helper
├── next.config.ts
├── tailwind.config.js
├── tsconfig.json
├── postcss.config.js
└── package.json
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm

### Run locally

```bash
# From the repo root (MM_KT_BE/)
cd docs-site
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
cd docs-site
npm run build
npm start
```

---

## Docs Folder Convention

All Markdown files in `/docs` (and subfolders) are automatically picked up.

**Supported frontmatter:**

```yaml
---
title: "My Page Title"
description: "Brief description for SEO and search"
order: 1
category: "Getting Started"
---
```

- `title` — overrides the filename-derived title
- `description` — shown in search results and meta tags
- `order` — controls sidebar sort order (numeric prefix `01_` also works)
- `category` — optional grouping label

**File naming tips:**

| Pattern | Title generated |
|---|---|
| `01_executive_overview.md` | Executive Overview |
| `getting-started.md` | Getting Started |
| `README.md` | Readme |

---

## Deploy to Vercel

### Option 1 — Vercel dashboard (recommended)

1. Push the repo to GitHub
2. Import repo in [vercel.com/new](https://vercel.com/new)
3. Set **Root Directory** to `docs-site`
4. Framework preset: **Next.js** (auto-detected)
5. Click **Deploy**

The `vercel.json` at the repo root already sets `rootDirectory: docs-site`.

### Option 2 — Vercel CLI

```bash
npm i -g vercel
cd docs-site
vercel --prod
```

### Environment variables (optional)

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Used for OpenGraph metadata |

---

## Adding New Docs

1. Create a `.md` file anywhere inside `/docs`
2. Optionally add frontmatter (`title`, `description`, `order`)
3. Run `npm run build` — the new page is automatically included

No code changes needed.

---

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| next | 15.1 | Framework |
| react | 19 | UI |
| tailwindcss | 3.4 | Styling |
| next-themes | 0.4 | Dark mode |
| gray-matter | 4 | Frontmatter parsing |
| remark + rehype | latest | Markdown → HTML |
| rehype-highlight | 7 | Syntax highlighting |
| rehype-slug | 6 | Heading IDs for TOC |
| lucide-react | 0.468 | Icons |
