"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  html: string;
  title: string;
}

export function DocContent({ html, title }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Inject copy buttons into code blocks
  useEffect(() => {
    if (!ref.current) return;

    const preBlocks = ref.current.querySelectorAll("pre");

    preBlocks.forEach((pre) => {
      if (pre.querySelector(".copy-btn")) return;

      const btn = document.createElement("button");
      btn.className =
        "copy-btn absolute top-3 right-3 p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors";
      btn.setAttribute("aria-label", "Copy code");
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;

      btn.addEventListener("click", () => {
        const code = pre.querySelector("code");
        const text = code?.innerText || "";
        navigator.clipboard.writeText(text).then(() => {
          btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
          setTimeout(() => {
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
          }, 2000);
        });
      });

      pre.style.position = "relative";
      pre.appendChild(btn);
    });
  }, [html]);

  return (
    <article className="animate-fade-in">
      <div
        ref={ref}
        className="prose"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
