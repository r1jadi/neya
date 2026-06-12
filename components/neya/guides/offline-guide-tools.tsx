"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, HardDrive } from "lucide-react";
import type { Guide } from "@/types/guides";
import { Button } from "@/components/ui/button";

const CACHE_KEY_PREFIX = "neya-guide-";

interface OfflineGuideToolsProps {
  guide: Guide;
}

export function OfflineGuideTools({ guide }: OfflineGuideToolsProps) {
  const [cached, setCached] = useState(false);

  useEffect(() => {
    try {
      setCached(Boolean(localStorage.getItem(`${CACHE_KEY_PREFIX}${guide.slug}`)));
    } catch {
      setCached(false);
    }
  }, [guide.slug]);

  const cacheGuide = useCallback(() => {
    try {
      localStorage.setItem(`${CACHE_KEY_PREFIX}${guide.slug}`, JSON.stringify(guide));
      setCached(true);
    } catch {
      /* quota exceeded */
    }
  }, [guide]);

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="w-full text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">
        Offline access
      </p>
      <Button type="button" variant="secondary" size="sm" asChild>
        <a href={`/api/guides/${guide.slug}/export?format=json`} download={`${guide.slug}.json`}>
          <Download className="mr-2 h-4 w-4" />
          Download JSON
        </a>
      </Button>
      <Button type="button" variant="secondary" size="sm" asChild>
        <a href={`/api/guides/${guide.slug}/export?format=pdf`} target="_blank" rel="noopener">
          <FileText className="mr-2 h-4 w-4" />
          Download PDF
        </a>
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={cacheGuide}>
        <HardDrive className="mr-2 h-4 w-4" />
        {cached ? "Cached locally" : "Cache guide"}
      </Button>
    </div>
  );
}

export function getCachedGuide(slug: string): Guide | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${slug}`);
    return raw ? (JSON.parse(raw) as Guide) : null;
  } catch {
    return null;
  }
}
