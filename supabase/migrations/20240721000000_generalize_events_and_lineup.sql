-- 1. Make venue_id optional on events
ALTER TABLE public.events ALTER COLUMN venue_id DROP NOT NULL;

-- 2. Add lineup jsonb column to events
ALTER TABLE public.events ADD COLUMN lineup jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3. Migrate existing dj_lineup to lineup (if any exist and are not empty arrays)
-- The old dj_lineup was text[]
UPDATE public.events
SET lineup = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', name,
      'image', null,
      'genre', null,
      'socials', '{}'::jsonb
    )
  )
  FROM unnest(dj_lineup) AS name
)
WHERE array_length(dj_lineup, 1) > 0;

-- 4. Drop the old dj_lineup column
ALTER TABLE public.events DROP COLUMN dj_lineup;

-- 5. Add new fields to venues
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS capacity integer;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS contact_phone text;

-- 6. Create contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  created_at timestamptz default now()
);

-- RLS for contact_messages
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert a contact message (public access for the form)
CREATE POLICY "Public insert contact_messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

-- Only service_role or admin can read them (no policy needed for service_role, it bypasses RLS)
