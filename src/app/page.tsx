"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { JournalCard } from "@/components/layout/JournalCard";
import { DashboardStats } from "@/components/dashboard/DashboardStats";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-3/4 rounded bg-aged" />
          <div className="h-32 rounded bg-aged" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-heading text-3xl font-bold text-ink mb-4">
          Iron Ledger
        </h1>
        <p className="text-ink/80 mb-8">
          Your old-school weight lifting journal. Track workouts, hit your
          protein goals, and see progress over time.
        </p>
        <p className="text-ink/60 text-sm">
          Sign in to get started.
        </p>
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-heading text-3xl font-bold text-ink mb-2">
        {formatDate(today)}
      </h1>
      <p className="text-ink/60 mb-8 text-sm">
        Welcome back, {profile?.displayName ?? "Athlete"}
      </p>

      <div className="grid gap-6 sm:grid-cols-2 mb-8">
        <Link href="/journal">
          <JournalCard title="Log Workout" className="hover:border-rust/50 transition cursor-pointer h-full">
            <p className="text-ink/70 text-sm mb-4">
              Record today&apos;s exercises, sets, reps, and weight.
            </p>
            <span className="text-rust font-medium">Open Journal &rarr;</span>
          </JournalCard>
        </Link>
        <Link href="/nutrition">
          <JournalCard title="Log Food" className="hover:border-rust/50 transition cursor-pointer h-full">
            <p className="text-ink/70 text-sm mb-4">
              Track protein intake and hit your daily goal.
            </p>
            <span className="text-rust font-medium">Open Nutrition &rarr;</span>
          </JournalCard>
        </Link>
      </div>

      <JournalCard title="Quick Stats">
        <DashboardStats
          userId={user.id}
          proteinGoal={profile?.dailyProteinGoal ?? 150}
        />
      </JournalCard>
    </div>
  );
}
