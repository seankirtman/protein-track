-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  email text,
  weight numeric,
  height numeric,
  age integer,
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal text check (goal in ('lean_bulk', 'bulk', 'aggressive_bulk', 'maintain', 'cut', 'aggressive_cut')),
  daily_protein_goal numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workouts (one row per user per date)
create table workouts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date text not null,
  notes text,
  exercises jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- Nutrition (one row per user per date)
create table nutrition (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date text not null,
  protein_goal numeric default 150,
  foods jsonb default '[]',
  total_protein numeric default 0,
  ai_recommendations jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- Photos (one row per user per date)
create table photos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date text not null,
  photo_url text not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS policies
alter table profiles enable row level security;
alter table workouts enable row level security;
alter table nutrition enable row level security;
alter table photos enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

create policy "Users can manage own workouts" on workouts for all using (auth.uid() = user_id);
create policy "Users can manage own nutrition" on nutrition for all using (auth.uid() = user_id);
create policy "Users can manage own photos" on photos for all using (auth.uid() = user_id);

-- Note: Create storage bucket "photos" in Supabase Dashboard (Storage > New bucket)
-- Make it public for direct photo URLs. Add policy: users can upload to their own folder.
