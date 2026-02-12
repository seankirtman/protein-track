# Iron Ledger

An old-school weight lifting journal with protein tracking, daily photos, and AI-powered nutrition coaching.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Enable **Google** sign-in under Authentication → Providers
3. Run the migration in `supabase/migrations/001_initial_schema.sql` in the SQL Editor
4. Create a **Storage** bucket named `photos`, make it **public**
5. Add a storage policy: allow authenticated users to upload to their own folder

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Workout Journal** – Log exercises, sets, reps, and weight. Weekly volume chart.
- **Protein Tracker** – Track food, AI-estimate protein, shortfall alerts, meal recommendations.
- **Photos** – Daily progress photos with comparison view.
- **Profile** – AI-calculated daily protein goal based on your stats.
