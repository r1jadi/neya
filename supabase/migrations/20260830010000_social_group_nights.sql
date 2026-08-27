-- Group Night invitations reuse the existing private My Night plan.
create table if not exists public.group_night_invites (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.night_plans (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_night_invite_not_self check (inviter_id <> invitee_id),
  unique (plan_id, invitee_id)
);

create index if not exists group_night_invites_invitee_idx on public.group_night_invites (invitee_id, status, expires_at);
create index if not exists group_night_invites_inviter_idx on public.group_night_invites (inviter_id, created_at desc);

alter table public.group_night_invites enable row level security;
create policy "group invites participants read" on public.group_night_invites for select to authenticated using (auth.uid() = inviter_id or auth.uid() = invitee_id);
create policy "group invites owner insert" on public.group_night_invites for insert to authenticated with check (auth.uid() = inviter_id);
create policy "group invites recipient update" on public.group_night_invites for update to authenticated using (auth.uid() = invitee_id) with check (auth.uid() = invitee_id);
create policy "group invites owner delete" on public.group_night_invites for delete to authenticated using (auth.uid() = inviter_id or auth.uid() = invitee_id);
