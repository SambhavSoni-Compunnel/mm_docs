"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Menu, X } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchDialog } from "@/components/search-dialog";
import type { DocTree } from "@/lib/docs";

interface SearchItem {
  slug: string[];
  title: string;
  description: string;
}

interface Props {
  children: React.ReactNode;
  tree: DocTree[];
  searchData: SearchItem[];
}

export function DocsLayoutClient({ children, tree, searchData }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-sm h-16">
        <div className="flex items-center h-full px-4 gap-4">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo */}
          <Link href="/docs" className="flex items-center gap-2 font-semibold shrink-0">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm hidden sm:block">Market Minder Docs</span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-sm ml-2">
            <SearchDialog searchData={searchData} />
          </div>

          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 top-16 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed top-16 bottom-0 left-0 z-40 w-72 border-r border-border bg-background overflow-y-auto
            transition-transform duration-300
            lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0
            ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <Sidebar tree={tree} onNavigate={() => setMobileOpen(false)} />
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
