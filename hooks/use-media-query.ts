"use client";

import { useEffect, useState } from "react";

function getMatch(query: string) {
  if (typeof window === "undefined") return false;
  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => getMatch(query));

  useEffect(() => {
    const m = window.matchMedia(query);
    const sync = () => setMatches(m.matches);
    queueMicrotask(sync);
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, [query]);

  return matches;
}
