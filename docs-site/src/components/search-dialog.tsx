"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X, FileText } from "lucide-react";

interface SearchItem {
  slug: string[];
  title: string;
  description: string;
  body: string;
}

interface Props {
  searchData: SearchItem[];
}

/** Return a ~120-char excerpt around the first match in text, with the match bolded */
function getExcerpt(text: string, query: string): string | null {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  const excerpt = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  return excerpt;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded px-0.5 font-medium not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

export function SearchDialog({ searchData }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.trim()
    ? searchData
        .filter(
          (item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase()) ||
            item.body.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:bg-muted transition-all"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">Search docs...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-xs bg-background border border-border rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documentation..."
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {query && results.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}
              {!query && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Start typing to search...
                </div>
              )}
              {results.map((item) => {
                // Prefer title match, then description, then body excerpt
                const titleMatch = item.title.toLowerCase().includes(query.toLowerCase());
                const descMatch = item.description.toLowerCase().includes(query.toLowerCase());
                const bodyExcerpt = !titleMatch && !descMatch
                  ? getExcerpt(item.body, query)
                  : null;

                return (
                  <Link
                    key={item.slug.join("/")}
                    href={`/docs/${item.slug.join("/")}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        <Highlight text={item.title} query={query} />
                      </div>
                      {bodyExcerpt ? (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          <Highlight text={bodyExcerpt} query={query} />
                        </div>
                      ) : item.description ? (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {item.description}
                        </div>
                      ) : null}
                      <div className="text-xs text-muted-foreground/50 mt-0.5 font-mono truncate">
                        /docs/{item.slug.join("/")}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
