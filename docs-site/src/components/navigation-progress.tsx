"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const tickRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When pathname changes → navigation completed → finish the bar then hide
  useEffect(() => {
    if (!visible) return;
    setProgress(100);
    const hide = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 350);
    return () => clearTimeout(hide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Intercept any internal <a> click → start the bar
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href === pathname
      )
        return;

      // Start progress
      setVisible(true);
      setProgress(15);

      if (tickRef.current) clearTimeout(tickRef.current);

      // Creep to ~70% while waiting for the page
      tickRef.current = setTimeout(() => setProgress(50), 200);
      tickRef.current = setTimeout(() => setProgress(70), 600);
    };

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (tickRef.current) clearTimeout(tickRef.current);
    };
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 right-0 z-[200] h-[2px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms" }}
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_2px] shadow-primary/60"
        style={{
          width: `${progress}%`,
          transition:
            progress === 100
              ? "width 250ms ease-out"
              : progress === 0
              ? "none"
              : "width 600ms ease-out",
        }}
      />
    </div>
  );
}
