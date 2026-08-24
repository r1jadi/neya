"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addStopToNight,
  clearMyNight,
  mergeLocalNightStops,
  removeStopFromNight,
  renameNightPlan,
  reorderNightStops,
  shareMyNight,
} from "@/actions/my-night";
import { MAX_NIGHT_STOPS } from "@/lib/my-night/logic";
import { createClient } from "@/lib/supabase/client";
import type { NightStopDisplay } from "@/types";

const STORAGE_KEY = "neya-my-night-v1";

type StoredNight = { title: string; stops: NightStopDisplay[] };

type MyNightContextValue = {
  hydrated: boolean;
  authed: boolean;
  title: string;
  stops: NightStopDisplay[];
  limitHit: boolean;
  addStop: (stop: NightStopDisplay) => void;
  removeStop: (index: number) => void;
  moveStop: (from: number, to: number) => void;
  rename: (title: string) => void;
  share: () => Promise<string | null>;
  clear: () => void;
};

const MyNightContext = createContext<MyNightContextValue | null>(null);

function readLocal(): StoredNight | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredNight;
    if (!Array.isArray(parsed.stops)) return null;
    return {
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "My Night",
      stops: parsed.stops.filter((s) => s && (s.kind === "venue" || s.kind === "event") && typeof s.refId === "string"),
    };
  } catch {
    return null;
  }
}

function writeLocal(title: string, stops: NightStopDisplay[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, stops }));
  } catch {
    // Storage unavailable (private mode) — the plan just won't persist.
  }
}

export function MyNightProvider({ children }: { children: React.ReactNode }) {
  const [stops, setStops] = useState<NightStopDisplay[]>([]);
  const [title, setTitle] = useState("My Night");
  const [hydrated, setHydrated] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const limitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootstrapped = useRef(false);

  const loadFromServer = useCallback(async () => {
    try {
      const res = await fetch("/api/my-night", { cache: "no-store" });
      if (!res.ok) return;
      const plan = (await res.json()) as { title: string; stops: NightStopDisplay[] };
      setTitle(plan.title || "My Night");
      setStops(plan.stops ?? []);
    } finally {
      setHydrated(true);
    }
  }, []);

  const loadFromLocal = useCallback(() => {
    const local = readLocal();
    setTitle(local?.title ?? "My Night");
    setStops(local?.stops ?? []);
    setHydrated(true);
  }, []);

  // Bootstrap: show the local plan instantly, then reconcile with the server
  // plan when signed in (merging any local guest stops).
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    let cancelled = false;

    // Hydrate the local plan right away so the UI is never empty while the
    // session check is in flight, and guest clicks can't overwrite a plan.
    loadFromLocal();

    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const user = data.session?.user ?? null;
      if (user) {
        setAuthed(true);
        const local = readLocal();
        if (local?.stops.length) {
          await mergeLocalNightStops(local.stops.map((s) => ({ kind: s.kind, refId: s.refId })));
          localStorage.removeItem(STORAGE_KEY);
        }
        await loadFromServer();
      } else {
        setAuthed(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setAuthed(true);
        const local = readLocal();
        if (local?.stops.length) {
          mergeLocalNightStops(local.stops.map((s) => ({ kind: s.kind, refId: s.refId }))).then(() => {
            localStorage.removeItem(STORAGE_KEY);
            loadFromServer();
          });
        } else {
          loadFromServer();
        }
      } else if (event === "SIGNED_OUT") {
        setAuthed(false);
        loadFromLocal();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (limitTimer.current) clearTimeout(limitTimer.current);
    };
  }, [loadFromLocal, loadFromServer]);

  const flashLimit = useCallback(() => {
    setLimitHit(true);
    if (limitTimer.current) clearTimeout(limitTimer.current);
    limitTimer.current = setTimeout(() => setLimitHit(false), 3500);
  }, []);

  const addStop = useCallback(
    (stop: NightStopDisplay) => {
      if (stops.some((s) => s.kind === stop.kind && s.refId === stop.refId)) return;
      if (stops.length >= MAX_NIGHT_STOPS) {
        flashLimit();
        return;
      }
      const next = [...stops, { ...stop, stopId: "" }];
      setStops(next);
      if (authed) {
        addStopToNight(stop.kind, stop.refId).then((res) => {
          if (!res.ok) loadFromServer();
        });
      } else {
        writeLocal(title, next);
      }
    },
    [stops, title, authed, flashLimit, loadFromServer],
  );

  const removeStop = useCallback(
    (index: number) => {
      const stop = stops[index];
      if (!stop) return;
      const next = stops.filter((_, i) => i !== index);
      setStops(next);
      if (authed) {
        if (stop.stopId) {
          removeStopFromNight(stop.stopId).then((res) => {
            if (!res.ok) loadFromServer();
          });
        } else {
          loadFromServer();
        }
      } else {
        writeLocal(title, next);
      }
    },
    [stops, title, authed, loadFromServer],
  );

  const moveStop = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0 || from >= stops.length || to >= stops.length) return;
      const next = [...stops];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setStops(next);
      if (authed) {
        reorderNightStops(next.map((s) => s.stopId).filter(Boolean)).then((res) => {
          if (!res.ok) loadFromServer();
        });
      } else {
        writeLocal(title, next);
      }
    },
    [stops, title, authed, loadFromServer],
  );

  const rename = useCallback(
    (nextTitle: string) => {
      const clean = nextTitle.trim().slice(0, 40);
      if (!clean) return;
      setTitle(clean);
      if (authed) {
        renameNightPlan(clean);
      } else {
        writeLocal(clean, stops);
      }
    },
    [authed, stops],
  );

  const share = useCallback(async (): Promise<string | null> => {
    if (!stops.length) return null;
    let token: string | null = null;
    if (authed) {
      const res = await shareMyNight();
      token = res.ok && res.token ? res.token : null;
    } else {
      try {
        const res = await fetch("/api/my-night/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            stops: stops.map((s) => ({ kind: s.kind, refId: s.refId })),
          }),
        });
        const data = (await res.json()) as { token?: string };
        if (res.ok && data.token) token = data.token;
      } catch {
        token = null;
      }
    }
    if (!token) return null;
    return `${window.location.origin}/my-night/${token}`;
  }, [authed, stops, title]);

  const clear = useCallback(() => {
    setStops([]);
    if (authed) {
      clearMyNight().then((res) => {
        if (!res.ok) loadFromServer();
      });
    } else {
      writeLocal(title, []);
    }
  }, [authed, title, loadFromServer]);

  const value = useMemo<MyNightContextValue>(
    () => ({ hydrated, authed, title, stops, limitHit, addStop, removeStop, moveStop, rename, share, clear }),
    [hydrated, authed, title, stops, limitHit, addStop, removeStop, moveStop, rename, share, clear],
  );

  return <MyNightContext.Provider value={value}>{children}</MyNightContext.Provider>;
}

export function useMyNight(): MyNightContextValue {
  const ctx = useContext(MyNightContext);
  if (!ctx) throw new Error("useMyNight must be used within MyNightProvider");
  return ctx;
}
