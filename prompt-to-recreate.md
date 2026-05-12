# Prompt to Recreate This Docs Site

Use the following prompt in an AI coding agent to recreate this project from scratch.

---

## Agent Prompt

You are building a **static documentation website** from a folder of Markdown files. The site is a Next.js 15 app (App Router) inside a `docs-site/` subdirectory of a repo. The Markdown files live in a sibling `docs/` folder at the repo root. Deploy target is Vercel.

---

### Repo structure to create

```
<repo-root>/
  vercel.json
  docs/                  ← existing Markdown files (do NOT create these, they already exist)
  docs-site/             ← the Next.js app you will build
    package.json
    next.config.ts
    tsconfig.json
    tailwind.config.js
    postcss.config.js
    src/
      app/
        globals.css
        layout.tsx
        page.tsx
        docs/
          layout.tsx
          page.tsx
          [...slug]/
            page.tsx
            loading.tsx
      components/
        breadcrumb.tsx
        doc-content.tsx
        docs-layout-client.tsx
        navigation-progress.tsx
        prev-next-nav.tsx
        search-dialog.tsx
        sidebar.tsx
        table-of-contents.tsx
        theme-provider.tsx
        theme-toggle.tsx
      lib/
        docs.ts
        utils.ts
```

---

### `vercel.json` (repo root)

```json
{
  "framework": "nextjs",
  "rootDirectory": "docs-site"
}
```

---

### `docs-site/package.json`

```json
{
  "name": "mm-kt-docs",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.1.11",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "gray-matter": "^4.0.3",
    "remark": "^15.0.1",
    "remark-gfm": "^4.0.0",
    "remark-rehype": "^11.1.0",
    "rehype-stringify": "^10.0.0",
    "rehype-highlight": "^7.0.0",
    "rehype-slug": "^6.0.0",
    "rehype-autolink-headings": "^7.1.0",
    "highlight.js": "^11.10.0",
    "lucide-react": "^0.468.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4",
    "next-themes": "^0.4.4",
    "class-variance-authority": "^0.7.1",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-scroll-area": "^1.2.2",
    "@radix-ui/react-tooltip": "^1.1.6",
    "@radix-ui/react-separator": "^1.1.1",
    "@radix-ui/react-slot": "^1.1.1"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^3.4.17",
    "postcss": "^8.4.47",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.0.0",
    "eslint-config-next": "15.1.0"
  }
}
```

---

### Design system & styling requirements

- Use **Tailwind CSS v3** with CSS custom properties for theming (no `@tailwindcss/typography` plugin — write all prose styles manually).
- Fonts: **Inter** (body) and **JetBrains Mono** (code) loaded via Google Fonts.
- Light/dark mode via `next-themes` with `attribute="class"`. Default to system preference.
- Color palette uses HSL CSS variables (`--background`, `--foreground`, `--primary`, `--muted`, `--card`, `--border`, `--ring`, etc.) defined in `:root` and `.dark`.
- Primary color: blue (`221.2 83.2% 53.3%` light / `217.2 91.2% 59.8%` dark).
- Custom scrollbar: 6 px, rounded, transparent track.
- Animation: `animate-fade-in` keyframe (fade up from 8 px, 0.3 s ease-out). Used on page content.
- Code block syntax highlighting with `rehype-highlight` + `highlight.js`. Override `.hljs-*` token colors in the global CSS using Tailwind utilities (violet keywords, cyan built-ins, green strings, zinc comments, etc.) for a dark-background code block theme.

---

### `src/lib/docs.ts` — core data layer (server-side only)

Implement the following exports:

```
getAllDocFiles(dir?, baseSlug?): DocFile[]
buildDocTree(dir?, baseSlug?): DocTree[]
getDocBySlug(slug: string[]): Promise<{ content, frontmatter, title, toc } | null>
getAllSlugs(): string[][]
getFlatNavList(): DocFile[]
getPrevNext(currentSlug): { prev: DocFile | null, next: DocFile | null }
```

**Key implementation details:**

1. **Docs directory resolution** — resolve relative to `process.cwd()`. Try `../docs` first (local dev with `rootDirectory=docs-site`), then `./docs` (Vercel root build). Use whichever exists.

2. **File reading** — use Node `fs` (no dynamic imports). Recursively walk the `docs/` directory. Skip dotfiles. Process `.md` files; recurse into subdirectories.

3. **Slug generation** — slugify filenames: lowercase, strip non-alphanumeric/non-hyphen chars, collapse spaces to hyphens. Strip numeric prefix from display title (e.g. `01_executive_overview.md` → title `Executive Overview`, slug `01-executive-overview`).

4. **Ordering** — parse leading digits from filename (e.g. `01_`, `02_`) as `order`. Files without prefix get `order = 999`. Sort all lists by `order`.

5. **Frontmatter** — parse with `gray-matter`. Honor `title`, `description`, `order`, `category` fields. Fall back to filename-derived title if `title` is absent.

6. **Plain-text body** — strip frontmatter, code blocks, inline code, images, link syntax, heading hashes, and emphasis chars from raw Markdown. Return first 300 chars. Used for search indexing.

7. **Markdown → HTML** — pipeline: `remark` → `remarkGfm` → `remarkRehype` (allowDangerousHtml) → `rehypeSlug` → `rehypeAutolinkHeadings` (behavior: "wrap") → `rehypeHighlight` (detect: true) → `rehypeStringify` (allowDangerousHtml).

8. **TOC extraction** — regex-parse `## Heading` lines from raw Markdown before HTML processing. Return `{ id, text, level }[]` where `id` is the slugified heading text. Filter to h1–h4.

9. **DocTree** — recursive tree structure for the sidebar. Folders become nodes with `isFolder: true` and `children`. Leaf nodes are files.

---

### `src/lib/utils.ts`

Standard shadcn-style `cn()` helper using `clsx` + `tailwind-merge`.

---

### Pages

**`src/app/page.tsx`** — redirect to the first doc's URL (`/docs/<first-slug>`). Call `getAllDocFiles()` to find it. If no docs, redirect to `/docs`.

**`src/app/docs/layout.tsx`** — server component. Build doc tree and search data (`buildDocTree()`, `getAllDocFiles()`). Pass both to `<DocsLayoutClient>` which wraps `{children}`.

**`src/app/docs/[...slug]/page.tsx`** — server component.
- `generateStaticParams`: return all file slugs + intermediate folder slugs.
- `generateMetadata`: return `{ title, description }` from frontmatter.
- Page: call `getDocBySlug(slug)`. If null, check if slug is a folder prefix and redirect to first child; otherwise `notFound()`. Render: `<Breadcrumb>` + `<DocContent html toc>` + `<PrevNextNav>`. Show `<TableOfContents>` in a right rail (hidden below xl) when `doc.toc.length > 1`.

**`src/app/docs/[...slug]/loading.tsx`** — skeleton shimmer placeholder for the doc content area while loading.

**`src/app/docs/page.tsx`** — redirect to first doc (same logic as root page).

---

### Components

#### `<DocsLayoutClient>` (client)
Three-panel layout:
- **Sticky header** (h-16, z-50, backdrop-blur, border-bottom): hamburger button (mobile only) | logo (`BookOpen` icon + "Market Minder Docs" text) | `<SearchDialog>` (max-w-sm, flex-1) | `<ThemeToggle>` (ml-auto).
- **Left sidebar** (w-72, fixed on mobile / sticky on lg, top-16, full height minus header, border-right, overflow-y-auto). Hidden off-screen on mobile, slides in when `mobileOpen` is true. Mobile overlay behind sidebar dims the rest of the page.
- **Main content** area (flex-1, min-w-0).
- Include `<NavigationProgress>` at the top of the layout.

#### `<Sidebar>` (client)
Recursive nav from `DocTree[]`. Folders are collapsible (chevron rotates). Uses `usePathname` for active state. Active leaf: `bg-primary/10 text-primary`. Active folder ancestor: bold foreground. Nested children indented with a left border line. Folder starts open if it contains the active route or is at depth 0.

#### `<SearchDialog>` (client)
Inline search bar (not a modal). Renders an input with a `Search` icon and `Ctrl K` badge hint. On focus + query, shows a dropdown with up to 8 results. Searches title, description, and body plain-text of all docs. Results show file icon, title with highlighted match, and a body excerpt (±40/80 chars around match) also with highlight. `Ctrl+K` focuses the input; `Escape` clears and blurs. Close dropdown on outside click. No external search library — pure client-side filter.

#### `<DocContent>` (client)
Renders server-generated HTML via `dangerouslySetInnerHTML`. After mount, injects a **copy button** (`Copy` SVG icon, becomes a check SVG for 2 s on success) into every `<pre>` block via DOM manipulation. Uses `navigator.clipboard.writeText`. Wraps in `<article class="animate-fade-in"><div class="prose">`.

#### `<TableOfContents>` (client)
Right-rail "On this page" nav. Sticky at `top-24`. Uses `IntersectionObserver` (`rootMargin: "0% 0% -80% 0%"`) to track which heading is in view and highlight the corresponding TOC link. h3 entries are indented and use `text-xs`. Active link color is `text-primary`.

#### `<PrevNextNav>` (server-renderable)
Previous/Next navigation at the bottom of each doc, separated by `border-t`. Each is a card-style link with an arrow icon and the doc title. `prev` aligns left, `next` aligns right.

#### `<Breadcrumb>` (client)
Shows `Home` icon → "Docs" → intermediate folder segments → current page title. Uses `usePathname` indirectly via props. Each segment separated by a `ChevronRight` icon. Last segment is non-linked and bold.

#### `<NavigationProgress>` (client)
Top-of-page loading bar. Listens for `<a>` clicks on internal links (not `#anchor`, not `http`, not same page). On click: sets progress to 15 %, creeps to 50 % at 200 ms and 70 % at 600 ms. When `usePathname` changes (navigation complete): jumps to 100 %, then fades out after 350 ms. Renders as a thin `h-0.5` bar at the top of the page, colored `bg-primary`, with CSS transition on width.

#### `<ThemeToggle>` (client)
Button toggling between light/dark. Shows `Sun` icon in dark mode, `Moon` in light mode. Renders a skeleton placeholder until mounted (avoids hydration flash).

#### `<ThemeProvider>` (client)
Thin wrapper around `next-themes` `ThemeProvider`. Used in root layout.

---

### `src/app/layout.tsx` (root)

```tsx
export const metadata = {
  title: { default: "Market Minder Docs", template: "%s | Market Minder Docs" },
  description: "Official documentation for the Market Minder AI-powered outbound email marketing platform.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: { type: "website", locale: "en_US", siteName: "Market Minder Docs" },
  icons: { icon: "/favicon.svg" },
};
```

Wrap `{children}` in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`. Add `suppressHydrationWarning` to `<html>` and `<body>`.

---

### Prose / Markdown CSS (write in `globals.css`, not via a Tailwind plugin)

Write a `.prose` class with these manual styles (all using `@apply`):
- `h1`: 3xl bold, tracking-tight, border-bottom, mb-4, mt-0
- `h2`: 2xl semibold, border-bottom, mt-10 mb-4
- `h3`: xl semibold, mt-8 mb-3
- `h4`: lg semibold, mt-6 mb-2
- `p`: `text-foreground/80 leading-7 mb-4`
- `a`: primary color, underline, underline-offset-4
- `ul`/`ol`: standard list styles, `pl-6 mb-4 space-y-1`
- `blockquote`: left border (`border-primary/40`), muted background, italic, rounded-right
- `table`: full-width, border-collapse; `thead` has muted background; even rows get `bg-muted/30`
- `code` (inline): `bg-muted text-primary font-mono text-sm px-1.5 py-0.5 rounded`
- `pre`: `bg-zinc-950 dark:bg-zinc-900 rounded-lg border border-zinc-800 relative overflow-x-auto mb-6`
- `pre code`: `bg-transparent text-zinc-100 p-4 block text-sm leading-6 font-mono`
- Heading anchor links (`h1 a` etc.): no underline, inherit color, hover→primary
- `hr`: `border-border my-8`

---

### Tailwind config

Extend colors with CSS variable references (`hsl(var(--token))`): `border`, `input`, `ring`, `background`, `foreground`, `primary` (DEFAULT + foreground), `secondary`, `destructive`, `muted`, `accent`, `card`. Extend `borderRadius` from `--radius`. Extend `fontFamily` with `sans: ["Inter", ...]` and `mono: ["JetBrains Mono", ...]`. Dark mode: `["class"]`.

---

### Behavior requirements (summary)

| Feature | Detail |
|---|---|
| Auto-redirect | Root `/` → first doc page |
| Folder slugs | Redirect to first child doc, no 404 |
| Search | Client-side, inline dropdown, Ctrl+K shortcut, body excerpt with highlight |
| Dark mode | System default, toggle in header, no flash |
| Code copy | Injected copy button on every `<pre>`, check icon feedback |
| TOC | Right rail, IntersectionObserver active tracking, h1–h3 only |
| Navigation progress | Thin top bar, animates on route change |
| Prev/Next | Bottom of every doc, ordered by filename sort order |
| Breadcrumbs | Home → folder segments → current title |
| Mobile sidebar | Slide-in drawer, overlay backdrop, hamburger toggle |
| Static export | `generateStaticParams` covers all file + folder slugs |
| Vercel deploy | `vercel.json` points `rootDirectory` to `docs-site/` |

---

### Final steps after scaffolding

1. `cd docs-site && npm install`
2. `npm run dev` — verify docs load from the sibling `../docs/` folder
3. `npm run build` — must complete with zero errors
4. Push to GitHub and connect to Vercel; it will pick up `vercel.json` automatically

---

> **Note on content:** The `docs/` folder contains the actual Markdown files for the project (knowledge-transfer docs for a Node.js/TypeScript backend called "Market Minder"). The docs site is purely a reader/renderer — it does not generate or own the content. Swap in any `docs/` folder of Markdown files and the site will automatically build the navigation tree, search index, and TOC from them.
