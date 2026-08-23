-- Real rate limiting — shared fixed-window counters.
--
-- lib/rate-limit.ts calls rate_limit_check before abuse-prone operations
-- (contact form, public event submissions, check-ins, atmosphere votes,
-- My Night sharing). The function performs an atomic increment under a row
-- lock so counters are shared across all serverless instances. Keys are
-- SHA-256 hashes of logical keys (user id / IP / email) — no PII stored.
--
-- Only the service role may call the function; anon/authenticated are never
-- given execute, and the table has RLS enabled with no client policies.

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null check (count >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists rate_limits_updated_at_idx
  on public.rate_limits (updated_at);

alter table public.rate_limits enable row level security;

-- Fixed-window check-and-increment. Returns false once the limit is
-- exceeded within the window. A row lock serializes concurrent requests;
-- misuse (bad args) never fails closed.
create or replace function public.rate_limit_check(
  p_key text,
  p_limit integer,
  p_window_sec integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_cutoff timestamptz;
begin
  if p_key is null or p_key = '' or p_limit is null or p_window_sec is null
     or p_limit < 1 or p_window_sec < 1 then
    return true;
  end if;

  v_cutoff := now() - make_interval(secs => p_window_sec);

  insert into public.rate_limits (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when public.rate_limits.window_start <= v_cutoff
                        then now() else public.rate_limits.window_start end,
    count = case when public.rate_limits.window_start <= v_cutoff
                 then 1 else public.rate_limits.count + 1 end,
    updated_at = now()
  returning count into v_count;

  -- Opportunistic cleanup of stale windows (bounded, ~2% of calls).
  if random() < 0.02 then
    delete from public.rate_limits where updated_at < now() - interval '48 hours';
  end if;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.rate_limit_check(text, integer, integer) from public;
revoke all on function public.rate_limit_check(text, integer, integer) from anon;
revoke all on function public.rate_limit_check(text, integer, integer) from authenticated;
grant execute on function public.rate_limit_check(text, integer, integer) to service_role;