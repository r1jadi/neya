"use client";

import { useEffect } from "react";
import type { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";

/** Subscribe to Postgres changes (enable Realtime on the table in Supabase → Database → Replication). */
export function useSupabaseRealtime<T extends Record<string, unknown>>(
  client: SupabaseClient | null,
  table: string,
  filter: string | undefined,
  onPayload: (payload: RealtimePostgresChangesPayload<T>) => void,
) {
  useEffect(() => {
    if (!client) return;
    const channelName = `neya:${table}:${filter ?? "all"}`;
    const channel = client
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => onPayload(payload as RealtimePostgresChangesPayload<T>),
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, table, filter, onPayload]);
}
