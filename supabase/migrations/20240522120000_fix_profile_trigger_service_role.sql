-- Service-role / backend updates must be able to set role, venue_id, etc.
-- (auth.uid() is null for service_role — previous trigger blocked admin provisioning)

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

  if new.role is distinct from old.role
    or new.venue_id is distinct from old.venue_id
    or new.is_admin is distinct from old.is_admin
    or new.account_active is distinct from old.account_active then
    raise exception 'Cannot modify privileged profile fields';
  end if;

  return new;
end;
$$;

-- Ensure venue role columns exist (safe if migration 20240521120000 already ran)
alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists venue_id uuid references public.venues (id) on delete set null,
  add column if not exists account_active boolean not null default true;

-- Add check constraint only if missing
do $$
begin
  alter table public.profiles
    add constraint profiles_role_check check (role in ('user', 'venue', 'admin'));
exception
  when duplicate_object then null;
end $$;
