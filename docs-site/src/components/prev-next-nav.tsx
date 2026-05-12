import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { DocFile } from "@/lib/docs";

interface Props {
  prev: DocFile | null;
  next: DocFile | null;
}

export function PrevNextNav({ prev, next }: Props) {
  if (!prev && !next) return null;

  return (
    <div className="flex items-center justify-between mt-16 pt-8 border-t border-border gap-4">
      {prev ? (
        <Link
          href={`/docs/${prev.slug.join("/")}`}
          className="flex items-center gap-3 group p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 transition-all max-w-xs"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Previous</div>
            <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
              {prev.title}
            </div>
          </div>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={`/docs/${next.slug.join("/")}`}
          className="flex items-center gap-3 group p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 transition-all max-w-xs ml-auto text-right"
        >
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Next</div>
            <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
              {next.title}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
