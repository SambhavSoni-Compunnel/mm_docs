"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TocItem } from "@/lib/docs";

interface Props {
  toc: TocItem[];
}

export function TableOfContents({ toc }: Props) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "0% 0% -80% 0%", threshold: 0 }
    );

    const headings = document.querySelectorAll(
      "h1[id], h2[id], h3[id], h4[id]"
    );
    headings.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const filtered = toc.filter((item) => item.level <= 3);

  if (filtered.length === 0) return null;

  return (
    <div className="sticky top-24">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        On this page
      </div>
      <nav className="space-y-0.5">
        {filtered.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={cn(
              "block text-sm py-1 transition-colors leading-snug",
              item.level === 1 && "font-medium",
              item.level === 2 && "pl-0",
              item.level === 3 && "pl-4 text-xs",
              activeId === item.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.text}
          </a>
        ))}
      </nav>
    </div>
  );
}
