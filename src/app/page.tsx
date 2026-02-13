"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { JournalCard } from "@/components/layout/JournalCard";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { getCalorieGoal } from "@/lib/nutrition";
import type { UserProfile } from "@/types";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const iconClass = "h-5 w-5 sm:h-8 sm:w-8 text-rust";
function FeatureIcon({ type }: { type: "workout" | "food" | "photo" | "ai" }) {
  switch (type) {
    case "workout":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6.5 6.5h11M6.5 17.5h11M6.5 12h11M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
        </svg>
      );
    case "food":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M21 7l-3 9M21 7l-6-2m0 0c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        </svg>
      );
    case "photo":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      );
    case "ai":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a10 10 0 1010 10H12V2z" />
          <path d="M12 12L2.5 10M12 12l9.5-2" />
        </svg>
      );
  }
}

export default function DashboardPage() {
  const { user, profile, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-16 w-1/2 rounded bg-aged/20" />
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="h-48 rounded bg-aged/20" />
            <div className="h-48 rounded bg-aged/20" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl text-center space-y-8">
          {/* Hero Section */}
          <div className="space-y-4">
            <div className="inline-block rounded-full bg-rust/10 px-4 py-1.5 text-sm font-bold text-rust uppercase tracking-wider">
              The Old-School Tracker
            </div>
            <h1 className="font-heading text-5xl font-bold text-ink sm:text-6xl">
              Iron Ledger
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-ink/70">
              A no-nonsense journal for serious lifters. Track your workouts, hit your protein goals, and visualize your progress—distraction-free.
            </p>
            <div className="pt-4">
              <button
                onClick={() => signInWithGoogle()}
                className="rounded-full bg-rust px-8 py-3 text-lg font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-rust/90 active:scale-95"
              >
                Start Tracking Now
              </button>
              <p className="mt-2 text-xs text-ink/40">Free • No credit card required</p>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid gap-6 pt-12 sm:grid-cols-3 text-left">
            <JournalCard className="hover:border-rust/30 transition-colors">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-parchment border border-leather/20">
                <FeatureIcon type="workout" />
              </div>
              <h3 className="font-heading text-xl font-bold text-ink mb-2">Workout Journal</h3>
              <p className="text-sm text-ink/70">
                Log sets, reps, and weights with a classic paper-feel interface. Drag-and-drop to reorder.
              </p>
            </JournalCard>

            <JournalCard className="hover:border-rust/30 transition-colors">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-parchment border border-leather/20">
                <FeatureIcon type="food" />
              </div>
              <h3 className="font-heading text-xl font-bold text-ink mb-2">Protein & AI</h3>
              <p className="text-sm text-ink/70">
                Track macros simply. Use AI to estimate protein in meals and get ingredient-based suggestions.
              </p>
            </JournalCard>

            <JournalCard className="hover:border-rust/30 transition-colors">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-parchment border border-leather/20">
                <FeatureIcon type="photo" />
              </div>
              <h3 className="font-heading text-xl font-bold text-ink mb-2">Photo Timeline</h3>
              <p className="text-sm text-ink/70">
                Snap daily progress photos. Compare dates side-by-side to see your transformation over time.
              </p>
            </JournalCard>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="mx-auto max-w-4xl px-3 py-2 sm:px-4 sm:py-8 flex flex-col min-h-[100dvh] sm:min-h-0 h-full sm:h-auto">
      <div className="mb-2 sm:mb-8 flex flex-col gap-0.5 sm:gap-1 sm:flex-row sm:items-end sm:justify-between flex-shrink-0">
        <div>
          <h1 className="font-heading text-base sm:text-3xl font-bold text-ink leading-tight">
            {formatDate(today)}
          </h1>
          <p className="text-[10px] sm:text-base text-ink/60">
            Welcome back, {profile?.displayName ?? "Athlete"}
          </p>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 sm:flex-initial sm:space-y-6">
        {/* Top Stats Bar - compact on mobile */}
        <JournalCard title="Daily Summary" className="!p-2 sm:!p-6 flex-shrink-0">
          <DashboardStats
            userId={user.id}
            proteinGoal={profile?.dailyProteinGoal ?? 150}
            calorieGoal={getCalorieGoal(profile)}
          />
        </JournalCard>

        {/* Main Action Grid - fills remaining space on mobile */}
        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-1.5 sm:gap-6 flex-1 min-h-0 sm:flex-initial mt-2 sm:mt-6">
          {/* Workout Card */}
          <Link href="/journal" className="group flex flex-col flex-1 sm:h-full sm:flex-none min-h-0">
            <JournalCard className="h-full !p-3 sm:!p-6 transition-all group-hover:border-rust/50 group-hover:shadow-md flex flex-col">
              <div className="flex items-start justify-between mb-1 sm:mb-4 w-full">
                <div className="rounded-full bg-rust/10 p-1.5 sm:p-3 text-rust">
                  <FeatureIcon type="workout" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-ink/40 group-hover:text-rust">
                  Journal
                </span>
              </div>
              <h3 className="font-heading text-sm sm:text-xl font-bold text-ink mb-0.5 sm:mb-2">Log Workout</h3>
              <p className="hidden sm:block text-sm text-ink/70 mb-4">
                Record today&apos;s exercises, sets, and reps.
              </p>
              <span className="mt-auto text-[10px] sm:text-sm font-bold text-rust group-hover:underline">
                Open &rarr;
              </span>
            </JournalCard>
          </Link>

          {/* Nutrition Card */}
          <Link href="/nutrition" className="group flex flex-col flex-1 sm:h-full sm:flex-none min-h-0">
            <JournalCard className="h-full !p-3 sm:!p-6 transition-all group-hover:border-rust/50 group-hover:shadow-md flex flex-col">
              <div className="flex items-start justify-between mb-1 sm:mb-4 w-full">
                <div className="rounded-full bg-rust/10 p-1.5 sm:p-3 text-rust">
                  <FeatureIcon type="food" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-ink/40 group-hover:text-rust">
                  Nutrition
                </span>
              </div>
              <h3 className="font-heading text-sm sm:text-xl font-bold text-ink mb-0.5 sm:mb-2">Log Meals</h3>
              <p className="hidden sm:block text-sm text-ink/70 mb-4">
                Track protein and get AI meal ideas.
              </p>
              <span className="mt-auto text-[10px] sm:text-sm font-bold text-rust group-hover:underline">
                Open &rarr;
              </span>
            </JournalCard>
          </Link>

          {/* Photos Card */}
          <Link href="/photos" className="group flex flex-col flex-1 sm:h-full sm:flex-none min-h-0">
            <JournalCard className="h-full !p-3 sm:!p-6 transition-all group-hover:border-rust/50 group-hover:shadow-md flex flex-col">
              <div className="flex items-start justify-between mb-1 sm:mb-4 w-full">
                <div className="rounded-full bg-rust/10 p-1.5 sm:p-3 text-rust">
                  <FeatureIcon type="photo" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-ink/40 group-hover:text-rust">
                  Progress
                </span>
              </div>
              <h3 className="font-heading text-sm sm:text-xl font-bold text-ink mb-0.5 sm:mb-2">Daily Photo</h3>
              <p className="hidden sm:block text-sm text-ink/70 mb-4">
                Snap a photo to track your physique.
              </p>
              <span className="mt-auto text-[10px] sm:text-sm font-bold text-rust group-hover:underline">
                Open &rarr;
              </span>
            </JournalCard>
          </Link>

          {/* Profile Card */}
          <Link href="/profile" className="group flex flex-col flex-1 sm:h-full sm:flex-none min-h-0">
            <JournalCard className="h-full !p-3 sm:!p-6 transition-all group-hover:border-rust/50 group-hover:shadow-md flex flex-col">
              <div className="flex items-start justify-between mb-1 sm:mb-4 w-full">
                <div className="rounded-full bg-rust/10 p-1.5 sm:p-3 text-rust">
                  <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-ink/40 group-hover:text-rust">
                  Settings
                </span>
              </div>
              <h3 className="font-heading text-sm sm:text-xl font-bold text-ink mb-0.5 sm:mb-2">My Profile</h3>
              <p className="hidden sm:block text-sm text-ink/70 mb-4">
                Update goals and personal stats.
              </p>
              <span className="mt-auto text-[10px] sm:text-sm font-bold text-rust group-hover:underline">
                Open &rarr;
              </span>
            </JournalCard>
          </Link>
        </div>
      </div>
    </div>
  );
}
