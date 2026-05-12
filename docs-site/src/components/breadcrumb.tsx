"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

interface Props {
  slug: string[];
  title: string;
}

function capitalize(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumb({ slug, title }: Props) {
  const crumbs = [
    { label: "Docs", href: "/docs" },
    ...slug.slice(0, -1).map((part, i) => ({
      label: capitalize(part),
      href: `/docs/${slug.slice(0, i + 1).join("/")}`,
    })),
    { label: title, href: null },
  ];

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 flex-wrap">
      <Link href="/docs" className="hover:text-foreground transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="w-3.5 h-3.5" />
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
