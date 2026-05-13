"use client";

import { useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Subscribe to Postgres changes — pass your Supabase client from `createClient()` */
export function useSupabaseRealtime(
  _client: SupabaseClient | null,
  _table: string,
  _handler: (payload: unknown) => void,
) {
  useEffect(() => {
    /* const channel = client?.channel("realtime")... */
    return () => undefined;
  }, [_client, _table, _handler]);
}
