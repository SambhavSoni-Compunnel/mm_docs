import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";

// Docs directory: support both local dev (one level up) and Vercel root builds
function resolveDocsDir(): string {
  // When running from docs-site/ (local dev / vercel with rootDirectory=docs-site)
  const sibling = path.join(process.cwd(), "..", "docs");
  if (fs.existsSync(sibling)) return sibling;
  // When running from repo root (vercel rootDirectory=.)
  const child = path.join(process.cwd(), "docs");
  if (fs.existsSync(child)) return child;
  return sibling;
}

const DOCS_DIR = resolveDocsDir();

export interface DocFrontmatter {
  title?: string;
  description?: string;
  order?: number;
  category?: string;
}

export interface DocFile {
  slug: string[];
  title: string;
  description?: string;
  body: string; // plain-text snippet for search (~300 chars)
  order: number;
  category?: string;
  filePath: string;
}

/** Strip markdown syntax and return plain text, truncated to maxLen chars */
function extractPlainText(markdown: string, maxLen = 300): string {
  return markdown
    .replace(/^---[\s\S]*?---/m, "")        // remove frontmatter
    .replace(/```[\s\S]*?```/g, "")         // remove code blocks
    .replace(/`[^`]+`/g, "")               // remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, "")       // remove images
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1") // keep link text
    .replace(/#{1,6}\s+/g, "")             // remove heading hashes
    .replace(/[*_~>|\-]/g, "")             // remove emphasis / table chars
    .replace(/\s+/g, " ")                  // collapse whitespace
    .trim()
    .slice(0, maxLen);
}

export interface DocTree {
  label: string;
  slug: string[];
  order: number;
  children?: DocTree[];
  isFolder?: boolean;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function fileNameToTitle(filename: string): string {
  // Remove numeric prefix like "01_", "02_"
  return filename
    .replace(/^\d+_/, "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getOrderFromFilename(filename: string): number {
  const match = filename.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 999;
}

export function getAllDocFiles(
  dir: string = DOCS_DIR,
  baseSlug: string[] = []
): DocFile[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: DocFile[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      const subFiles = getAllDocFiles(
        path.join(dir, entry.name),
        [...baseSlug, slugify(entry.name)]
      );
      files.push(...subFiles);
    } else if (entry.name.endsWith(".md")) {
      const nameWithoutExt = entry.name.replace(/\.md$/, "");
      const filePath = path.join(dir, entry.name);
      const content = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(content);
      const fm = data as DocFrontmatter;

      const slug = [...baseSlug, slugify(nameWithoutExt)];
      const title =
        fm.title || fileNameToTitle(nameWithoutExt);

      files.push({
        slug,
        title,
        description: fm.description,
        body: extractPlainText(content),
        order: fm.order ?? getOrderFromFilename(nameWithoutExt),
        category: fm.category,
        filePath,
      });
    }
  }

  return files.sort((a, b) => a.order - b.order);
}

export function buildDocTree(
  dir: string = DOCS_DIR,
  baseSlug: string[] = []
): DocTree[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const items: DocTree[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      const folderSlug = slugify(entry.name);
      const children = buildDocTree(path.join(dir, entry.name), [
        ...baseSlug,
        folderSlug,
      ]);
      const order = getOrderFromFilename(entry.name);
      const label = fileNameToTitle(entry.name);

      items.push({
        label,
        slug: [...baseSlug, folderSlug],
        order,
        isFolder: true,
        children,
      });
    } else if (entry.name.endsWith(".md")) {
      const nameWithoutExt = entry.name.replace(/\.md$/, "");
      const filePath = path.join(dir, entry.name);
      const content = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(content);
      const fm = data as DocFrontmatter;

      items.push({
        label: fm.title || fileNameToTitle(nameWithoutExt),
        slug: [...baseSlug, slugify(nameWithoutExt)],
        order: fm.order ?? getOrderFromFilename(nameWithoutExt),
      });
    }
  }

  return items.sort((a, b) => a.order - b.order);
}

export async function getDocBySlug(slug: string[]): Promise<{
  content: string;
  frontmatter: DocFrontmatter;
  title: string;
  toc: TocItem[];
} | null> {
  const allFiles = getAllDocFiles();
  const slugStr = slug.join("/");
  const match = allFiles.find((f) => f.slug.join("/") === slugStr);

  if (!match) return null;

  const raw = fs.readFileSync(match.filePath, "utf-8");
  const { data, content: mdContent } = matter(raw);
  const fm = data as DocFrontmatter;

  // Extract TOC from raw markdown before processing
  const toc = extractToc(mdContent);

  const processed = await remark()
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(rehypeHighlight, { detect: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(mdContent);

  return {
    content: processed.toString(),
    frontmatter: fm,
    title: fm.title || match.title,
    toc,
  };
}

function extractToc(markdown: string): TocItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].replace(/[*_`]/g, "").trim();
    const id = slugify(text);
    toc.push({ id, text, level });
  }

  return toc;
}

export function getAllSlugs(): string[][] {
  return getAllDocFiles().map((f) => f.slug);
}

export function getFlatNavList(): DocFile[] {
  return getAllDocFiles();
}

export function getPrevNext(currentSlug: string[]): {
  prev: DocFile | null;
  next: DocFile | null;
} {
  const all = getFlatNavList();
  const idx = all.findIndex((f) => f.slug.join("/") === currentSlug.join("/"));
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  };
}
