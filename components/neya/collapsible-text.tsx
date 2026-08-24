"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const COLLAPSE_AT = 380;

interface CollapsibleTextProps {
  text: string;
  className?: string;
}

/** Long-form text collapsed to ~4 lines with an explicit “Show more” toggle. */
export function CollapsibleText({ text, className }: CollapsibleTextProps) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > COLLAPSE_AT;

  if (!long) {
    return <p className={cn("whitespace-pre-line", className)}>{text}</p>;
  }

  return (
    <div>
      <p
        className={cn(
          "whitespace-pre-line",
          !expanded && "line-clamp-3",
          className,
        )}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-sky-300 hover:text-sky-200"
        aria-expanded={expanded}
      >
        {expanded ? "Show less" : "Show more"}
        <span aria-hidden className={cn("transition-transform", expanded && "rotate-180")}>
          ▾
        </span>
      </button>
    </div>
  );
}