-- Exercise cache: stores steps and images for exercises to avoid repeated LLM/API calls.
-- Key is normalized exercise name (lowercase, trimmed). Shared across all users.
create table exercise_cache (
  id uuid default uuid_generate_v4() primary key,
  name_key text not null unique,
  name_display text,
  steps jsonb,
  image_data_url text,
  calories_estimate numeric,
  protein_estimate numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_exercise_cache_name_key on exercise_cache (name_key);

-- RLS: allow anyone to read (cache is public). Writes need service role (used by API routes).
alter table exercise_cache enable row level security;
create policy "Anyone can read exercise cache" on exercise_cache for select using (true);

-- Allow insert/update for backend (anon key from API routes; service_role bypasses RLS)
create policy "Allow insert exercise cache" on exercise_cache for insert with check (true);
create policy "Allow update exercise cache" on exercise_cache for update using (true);
