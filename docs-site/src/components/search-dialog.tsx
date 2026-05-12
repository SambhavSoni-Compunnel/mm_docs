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

function getExcerpt(text: string, query: string): string | null {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
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
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const showDropdown = focused && query.trim().length > 0;

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

  // Ctrl+K focuses the input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search input */}
      <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-border bg-muted/50 hover:border-primary/40 transition-all focus-within:border-primary/60 focus-within:bg-background">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search docs..."
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none min-w-0"
        />
        {query ? (
          <button
            onMouseDown={(e) => { e.preventDefault(); setQuery(""); inputRef.current?.focus(); }}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Clear search"
          >
          
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center text-xs text-muted-foreground/60 border border-border rounded px-1.5 py-0.5 shrink-0">
            Ctrl K
          </kbd>
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-fade-in">
          <div className="max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              results.map((item) => {
                const titleMatch = item.title.toLowerCase().includes(query.toLowerCase());
                const descMatch = item.description.toLowerCase().includes(query.toLowerCase());
                const bodyExcerpt =
                  !titleMatch && !descMatch ? getExcerpt(item.body, query) : null;

                return (
                  <Link
                    key={item.slug.join("/")}
                    href={`/docs/${item.slug.join("/")}`}
                    onClick={() => { setFocused(false); setQuery(""); }}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors border-b border-border/40 last:border-0"
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
                      <div className="text-xs text-muted-foreground/40 mt-0.5 font-mono truncate">
                        /docs/{item.slug.join("/")}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
