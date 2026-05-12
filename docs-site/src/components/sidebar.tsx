"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocTree } from "@/lib/docs";

interface SidebarProps {
  tree: DocTree[];
  onNavigate?: () => void;
}

interface SidebarItemProps {
  item: DocTree;
  depth?: number;
  onNavigate?: () => void;
}

function SidebarItem({ item, depth = 0, onNavigate }: SidebarItemProps) {
  const pathname = usePathname();
  const href = `/docs/${item.slug.join("/")}`;
  const isActive = pathname === href || pathname === `${href}/`;
  const isParentActive = pathname.startsWith(href);

  const [open, setOpen] = useState(isParentActive || depth === 0);

  if (item.isFolder && item.children && item.children.length > 0) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors",
            "hover:bg-muted hover:text-foreground",
            isParentActive
              ? "text-foreground font-semibold"
              : "text-muted-foreground font-medium",
            depth > 0 && "ml-2"
          )}
        >
          <span className="truncate">{item.label}</span>
          <ChevronRight
            className={cn(
              "w-3.5 h-3.5 shrink-0 transition-transform",
              open && "rotate-90"
            )}
          />
        </button>

        {open && (
          <div className="mt-0.5 ml-3 border-l border-border pl-2">
            {item.children.map((child) => (
              <SidebarItem
                key={child.slug.join("/")}
                item={child}
                depth={depth + 1}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "block px-3 py-1.5 text-sm rounded-md transition-colors truncate",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {item.label}
    </Link>
  );
}

export function Sidebar({ tree, onNavigate }: SidebarProps) {
  return (
    <nav className="p-4 space-y-0.5">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
        Documentation
      </div>
      {tree.map((item) => (
        <SidebarItem key={item.slug.join("/")} item={item} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}
