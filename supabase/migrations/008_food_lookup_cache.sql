-- Food lookup cache: stores protein/calories for (food, quantity) to avoid repeated LLM calls.
-- Key is normalized food name + quantity. Shared across all users.
create table food_lookup_cache (
  id uuid default gen_random_uuid() primary key,
  food_name text not null,
  quantity text not null default '1 standard serving',
  protein numeric not null,
  calories numeric not null,
  carbs numeric,
  fat numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (food_name, quantity)
);

create index idx_food_lookup_cache_key on food_lookup_cache (food_name, quantity);

-- RLS: allow anyone to read. Writes from API routes.
alter table food_lookup_cache enable row level security;
create policy "Anyone can read food lookup cache" on food_lookup_cache for select using (true);
create policy "Allow insert food lookup cache" on food_lookup_cache for insert with check (true);
create policy "Allow update food lookup cache" on food_lookup_cache for update using (true);
