-- Hardening: premium status (and all privileged profile flags) must never be
-- self-serviceable.
--
-- Root cause: protect_profile_privileged_columns (20240521120000 +
-- 20240522120000) guarded role / venue_id / is_admin / account_active but
-- omitted is_premium, and only ran on UPDATE. The "Profiles self update" RLS
-- policy permits modifying your own row, so any authenticated user could
--       UPDATE public.profiles SET is_premium = true WHERE id = auth.uid();
-- which then unlocked is_hidden_premium events via the events read policy
-- (20240518120000) and flipped the UI into a premium profile.
--
-- This migration:
--   1. Guards is_premium on UPDATE (alongside the other privileged columns).
--   2. Extends the trigger to INSERT, rejecting self-created profiles whose
--      privileged columns differ from the safe defaults (closes the same
--      self-insert path that could also create role='admin' rows).
--   3. Tightens the "Profiles self insert" RLS policy to require privileged
--      columns at their safe defaults, as an explicit policy-layer statement.
--
-- Unchanged: service-role writes (auth.uid() is null) and authenticated
-- admins (auth_is_admin()) still bypass the trigger, so the legitimate
-- admin premium grant (actions/admin-events.ts grantPremiumByUserId) and
-- venue-account provisioning (actions/admin-venue-accounts.ts) keep working.

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Supabase service role and direct backend (no end-user JWT)
  if auth.uid() is null then
    return new;
  end if;

  if public.auth_is_admin() then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    -- Profile rows are created by the signup trigger with safe defaults;
    -- never let a user create a row that is already privileged.
    if new.role is distinct from 'user'
       or new.venue_id is not null
       or new.is_admin is distinct from false
       or new.account_active is distinct from true
       or new.is_premium is distinct from false then
      raise exception 'Cannot create profile with privileged fields';
    end if;
  else
    if new.role is distinct from old.role
       or new.venue_id is distinct from old.venue_id
       or new.is_admin is distinct from old.is_admin
       or new.account_active is distinct from old.account_active
       or new.is_premium is distinct from old.is_premium then
      raise exception 'Cannot modify privileged profile fields';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_privileged on public.profiles;
create trigger trg_profiles_protect_privileged
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- Policy-layer hardening: a user may only insert their own row with all
-- privileged fields at their safe defaults. (The signup trigger inserts as
-- the owner and bypasses RLS, so it is unaffected.)
drop policy if exists "Profiles self insert" on public.profiles;
create policy "Profiles self insert" on public.profiles
  for insert to authenticated
  with check (
    auth.uid() = id
    and role = 'user'
    and not is_admin
    and not is_premium
    and account_active
    and venue_id is null
  );

-- ---------------------------------------------------------------------------
-- Verification (run in the Supabase SQL editor or via SQL client, in order):
--
-- 1. Self-grant must FAIL:
--      -- as a normal authenticated user (JWT):
--      update public.profiles
--        set is_premium = true
--        where id = auth.uid();
--    Expected: ERROR: Cannot modify privileged profile fields
--
-- 2. Self-insert must FAIL:
--      -- as a normal authenticated user (JWT):
--      insert into public.profiles (id, display_name, is_premium)
--      values (auth.uid(), 'attacker', true);
--    Expected: ERROR: Cannot create profile with privileged fields
--
-- 3. Self-insert with defaults must still PASS (used by
--    actions/guide-purchase.ts ensureUserProfile):
--      insert into public.profiles (id, display_name)
--      values (auth.uid(), 'regular user');
--    Expected: success (or unique_violation if the row already exists).
--
-- 4. Legitimate admin grant must still work (service role, bypasses RLS):
--      select 1 from public.profiles
--      where id = <admin action user id>; -- then run the admin UI action
-- ---------------------------------------------------------------------------