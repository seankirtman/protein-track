"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { JournalCard } from "@/components/layout/JournalCard";
import { updateProfile } from "@/lib/database";
import { estimateCalories, getCalorieGoal } from "@/lib/nutrition";

const GOAL_LABELS: Record<string, string> = {
  aggressive_bulk: "Aggressive Bulk",
  bulk: "Lean Bulk",
  lean_bulk: "Clean Bulk",
  maintain: "Maintain",
  cut: "Cut",
  aggressive_cut: "Aggressive Cut",
};

function getProteinNote(
  weightLbs: number | undefined,
  heightIn: number | undefined,
  goal: string,
  activity: string
): string {
  if (!weightLbs) return "Enter your weight above to get a personalized note.";

  const w = weightLbs;
  const goalLabel = GOAL_LABELS[goal] ?? goal;

  // Protein multiplier per lb of bodyweight based on goal
  let multiplier: [number, number];
  let goalReason: string;
  switch (goal) {
    case "aggressive_bulk":
      multiplier = [1.2, 1.5];
      goalReason = "maximize muscle protein synthesis during heavy training and a large caloric surplus";
      break;
    case "bulk":
      multiplier = [1.0, 1.3];
      goalReason = "support steady muscle growth while keeping fat gain moderate";
      break;
    case "lean_bulk":
      multiplier = [1.0, 1.2];
      goalReason = "fuel slow, clean muscle gains with minimal fat accumulation";
      break;
    case "cut":
      multiplier = [1.1, 1.4];
      goalReason = "preserve lean muscle mass while in a caloric deficit";
      break;
    case "aggressive_cut":
      multiplier = [1.2, 1.5];
      goalReason = "protect as much muscle as possible during rapid fat loss — protein is your best defense against muscle breakdown";
      break;
    default: // maintain
      multiplier = [0.8, 1.1];
      goalReason = "maintain your current muscle mass and support recovery";
      break;
  }

  // Adjust for activity
  let activityBump = 0;
  let activityNote = "";
  switch (activity) {
    case "very_active":
      activityBump = 0.1;
      activityNote = "Your high activity level increases protein needs for recovery.";
      break;
    case "active":
      activityBump = 0.05;
      activityNote = "Regular training means your muscles need consistent protein for repair.";
      break;
    case "moderate":
      activityNote = "At moderate activity, protein timing around workouts helps maximize gains.";
      break;
    case "light":
      activityNote = "Even at lighter activity, adequate protein supports body composition goals.";
      break;
    default:
      activityNote = "Consider increasing activity to make better use of your protein intake.";
  }

  const low = Math.round(w * (multiplier[0] + activityBump));
  const high = Math.round(w * (multiplier[1] + activityBump));

  const heightNote = heightIn
    ? ` At ${Math.floor(heightIn / 12)}'${heightIn % 12}" and ${w} lbs,`
    : ` At ${w} lbs,`;

  return `${goalLabel}:${heightNote} aim for ${low}–${high}g of protein daily to ${goalReason}. ${activityNote} Protein is the most critical macronutrient for body recomposition — it repairs muscle fibers, keeps you satiated, and has the highest thermic effect of any macro.`;
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Light",
  moderate: "Moderate",
  active: "Active",
  very_active: "Very Active",
};

function formatHeight(inches: number | undefined): string {
  if (!inches) return "—";
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [age, setAge] = useState("");
  const [activityLevel, setActivityLevel] = useState<"sedentary" | "light" | "moderate" | "active" | "very_active">("moderate");
  const [goal, setGoal] = useState<"lean_bulk" | "bulk" | "aggressive_bulk" | "maintain" | "cut" | "aggressive_cut">("maintain");
  const [proteinGoal, setProteinGoal] = useState("");
  const [calorieGoal, setCalorieGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Sync form state from profile whenever it loads or changes
  useEffect(() => {
    if (!profile) return;
    setWeight(profile.weight?.toString() ?? "");
    const h = profile.height ?? 0;
    setHeightFeet(h ? Math.floor(h / 12).toString() : "");
    setHeightInches(h ? (h % 12).toString() : "");
    setAge(profile.age?.toString() ?? "");
    setActivityLevel(profile.activityLevel ?? "moderate");
    setGoal(profile.goal ?? "maintain");
    setProteinGoal(profile.dailyProteinGoal?.toString() ?? "");
    setCalorieGoal(profile.dailyCalorieGoal?.toString() ?? "");
  }, [profile]);

  const totalHeightInches =
    heightFeet || heightInches
      ? (parseInt(heightFeet) || 0) * 12 + (parseInt(heightInches) || 0)
      : undefined;

  const hasProfile = !!(profile?.weight || profile?.height || profile?.age || profile?.dailyProteinGoal || profile?.dailyCalorieGoal != null);

  const handleCalculateProtein = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/protein-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: weight ? parseFloat(weight) : undefined,
          height: totalHeightInches || undefined,
          age: age ? parseInt(age) : undefined,
          activityLevel,
          goal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setProteinGoal(data.proteinGoal.toString());
      setAiReasoning(data.reasoning ?? "");
      await updateProfile(user.id, {
        dailyProteinGoal: data.proteinGoal,
      });
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveManual = async () => {
    if (!user) return;
    const pg = proteinGoal ? parseFloat(proteinGoal) : undefined;
    const cg = calorieGoal.trim() ? parseFloat(calorieGoal) : undefined;
    if (pg !== undefined && (isNaN(pg) || pg < 0)) return;
    if (cg !== undefined && (isNaN(cg) || cg < 0)) return;
    setLoading(true);
    setSaved(false);
    setError("");
    try {
      await updateProfile(user.id, {
        weight: weight ? parseFloat(weight) : undefined,
        height: totalHeightInches || undefined,
        age: age ? parseInt(age) : undefined,
        activityLevel,
        goal,
        ...(pg !== undefined ? { dailyProteinGoal: pg } : {}),
        ...(calorieGoal.trim() ? { dailyCalorieGoal: cg } : { dailyCalorieGoal: null }),
      });
      await refreshProfile();
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-ink/70">
        Sign in to manage your profile.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-2 py-3 sm:px-4 sm:py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-xs sm:text-sm text-ink/50 hover:text-rust mb-2 sm:mb-3 px-1">
        ← Dashboard
      </Link>
      <div className="flex items-center justify-between mb-4 sm:mb-6 px-1">
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-ink">
          Profile
        </h1>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-xs sm:text-sm font-medium text-green-700">
              Saved successfully
            </span>
          )}
          <button
            onClick={signOut}
            className="rounded border border-leather/30 px-3 py-1.5 text-xs sm:text-sm text-ink/60 hover:border-red-300 hover:text-red-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ===== VIEW MODE ===== */}
      {hasProfile && !editing ? (
        <>
          <JournalCard title="Your Stats" className="!p-3 sm:!p-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <span className="block text-[10px] sm:text-xs text-ink/50 uppercase tracking-wide">Weight</span>
                <p className="font-mono text-base sm:text-lg text-ink">{profile?.weight ? `${profile.weight} lbs` : "—"}</p>
              </div>
              <div>
                <span className="block text-[10px] sm:text-xs text-ink/50 uppercase tracking-wide">Height</span>
                <p className="font-mono text-base sm:text-lg text-ink">{formatHeight(profile?.height)}</p>
              </div>
              <div>
                <span className="block text-[10px] sm:text-xs text-ink/50 uppercase tracking-wide">Age</span>
                <p className="font-mono text-base sm:text-lg text-ink">{profile?.age ?? "—"}</p>
              </div>
              <div>
                <span className="block text-[10px] sm:text-xs text-ink/50 uppercase tracking-wide">Activity</span>
                <p className="font-mono text-base sm:text-lg text-ink">{ACTIVITY_LABELS[profile?.activityLevel ?? ""] ?? "—"}</p>
              </div>
              <div className="col-span-2">
                <span className="block text-[10px] sm:text-xs text-ink/50 uppercase tracking-wide">Goal</span>
                <p className="font-mono text-base sm:text-lg text-ink">{GOAL_LABELS[profile?.goal ?? ""] ?? "—"}</p>
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="mt-4 text-sm font-medium text-rust hover:underline"
            >
              Edit Stats
            </button>
          </JournalCard>

          <JournalCard title="Daily Protein Goal" className="mt-3 sm:mt-6 !p-3 sm:!p-6">
            <p className="text-xs sm:text-sm text-ink/70 mb-3 sm:mb-4 leading-relaxed">
              {getProteinNote(
                profile?.weight,
                profile?.height,
                profile?.goal ?? "maintain",
                profile?.activityLevel ?? "moderate"
              )}
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-mono text-xl sm:text-2xl font-bold text-ink">
                {profile?.dailyProteinGoal ?? "—"}
              </span>
              <span className="text-sm sm:text-base text-ink/60">grams / day</span>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-sm font-medium text-rust hover:underline"
            >
              Edit Goal
            </button>

            {/* Daily calorie goal (override or estimated) */}
            {(() => {
              const override = profile?.dailyCalorieGoal;
              const estimated = estimateCalories(
                profile?.weight,
                profile?.height,
                profile?.age,
                profile?.activityLevel ?? "moderate",
                profile?.goal ?? "maintain"
              );
              const display = override ?? estimated;
              if (!display) return null;
              return (
                <div className="mt-4 sm:mt-6 rounded border border-leather/20 bg-parchment/50 px-3 sm:px-4 py-2 sm:py-3">
                  <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-ink/60">
                      {override != null ? "Daily Calorie Goal" : "Est. Daily Calories"}
                    </span>
                    <span className="font-mono text-lg sm:text-xl font-bold text-ink">{display.toLocaleString()}</span>
                    <span className="text-xs sm:text-sm text-ink/60">kcal</span>
                  </div>
                  <p className="mt-1 text-[10px] sm:text-xs text-ink/50">
                    {override != null
                      ? "Your custom target. Clear in Edit to use auto estimate."
                      : `Based on your stats & goal. Set a custom target in Edit.`}
                  </p>
                </div>
              );
            })()}
          </JournalCard>
        </>
      ) : (
        /* ===== EDIT MODE ===== */
        <>
          <JournalCard title="Your Stats" className="!p-3 sm:!p-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm text-ink/70">Weight (lbs)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="mt-1 w-full rounded border border-leather/30 px-2 sm:px-3 py-2 text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-ink/70">Height</label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={heightFeet}
                    onChange={(e) => setHeightFeet(e.target.value)}
                    className="flex-1 min-w-0 rounded border border-leather/30 px-2 sm:px-3 py-2 text-sm sm:text-base"
                  >
                    <option value="">ft</option>
                    <option value="4">4 ft</option>
                    <option value="5">5 ft</option>
                    <option value="6">6 ft</option>
                    <option value="7">7 ft</option>
                  </select>
                  <select
                    value={heightInches}
                    onChange={(e) => setHeightInches(e.target.value)}
                    className="flex-1 min-w-0 rounded border border-leather/30 px-2 sm:px-3 py-2 text-sm sm:text-base"
                  >
                    <option value="">in</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i.toString()}>
                        {i} in
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-ink/70">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="mt-1 w-full rounded border border-leather/30 px-2 sm:px-3 py-2 text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-ink/70">Activity level</label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as "sedentary" | "light" | "moderate" | "active" | "very_active")}
                  className="mt-1 w-full rounded border border-leather/30 px-2 sm:px-3 py-2 text-sm sm:text-base"
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="active">Active</option>
                  <option value="very_active">Very active</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs sm:text-sm text-ink/70">Goal</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as "lean_bulk" | "bulk" | "aggressive_bulk" | "maintain" | "cut" | "aggressive_cut")}
                  className="mt-1 w-full rounded border border-leather/30 px-2 sm:px-3 py-2 text-sm sm:text-base"
                >
                  <option value="aggressive_bulk">Aggressive Bulk</option>
                  <option value="bulk">Lean Bulk</option>
                  <option value="lean_bulk">Clean Bulk</option>
                  <option value="maintain">Maintain</option>
                  <option value="cut">Cut</option>
                  <option value="aggressive_cut">Aggressive Cut</option>
                </select>
              </div>
            </div>
          </JournalCard>

          <JournalCard title="Daily Protein Goal" className="mt-3 sm:mt-6 !p-3 sm:!p-6">
            <p className="text-xs sm:text-sm text-ink/70 mb-3 sm:mb-4 leading-relaxed">
              {getProteinNote(
                weight ? parseFloat(weight) : undefined,
                totalHeightInches,
                goal ?? "maintain",
                activityLevel
              )}
            </p>
            <div className="flex gap-2 mb-3 sm:mb-4">
              <input
                type="number"
                min={0}
                value={proteinGoal}
                onChange={(e) => setProteinGoal(e.target.value)}
                className="w-20 sm:w-24 rounded border border-leather/30 px-2 sm:px-3 py-2 font-mono text-sm sm:text-base"
                placeholder="150"
              />
              <span className="flex items-center text-sm sm:text-base text-ink/70">grams</span>
            </div>
            <button
              onClick={handleCalculateProtein}
              disabled={loading}
              className="rounded bg-rust px-3 sm:px-4 py-2 text-sm sm:text-base text-white hover:bg-rust/90 disabled:opacity-50 mr-2"
            >
              {loading ? "Calculating…" : "Calculate with AI"}
            </button>
            {aiReasoning && (
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-ink/60 italic border-l-2 border-rust/30 pl-3">{aiReasoning}</p>
            )}

            {/* Daily calorie goal override */}
            <div className="mt-4 sm:mt-6">
              <label className="block text-xs sm:text-sm text-ink/70">Daily calorie goal (optional)</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={calorieGoal}
                  onChange={(e) => setCalorieGoal(e.target.value)}
                  placeholder={estimateCalories(
                    weight ? parseFloat(weight) : undefined,
                    totalHeightInches,
                    age ? parseInt(age) : undefined,
                    activityLevel,
                    goal ?? "maintain"
                  )?.toString() ?? "Auto"}
                  className="w-24 sm:w-28 rounded border border-leather/30 px-2 sm:px-3 py-2 font-mono text-sm sm:text-base"
                />
                <span className="text-sm sm:text-base text-ink/70">kcal</span>
              </div>
              <p className="mt-1 text-[10px] sm:text-xs text-ink/50">
                Override the estimated target. Leave blank for auto.
              </p>
            </div>
          </JournalCard>

          {error && (
            <p className="mt-4 text-red-600 text-sm">{error}</p>
          )}

          <div className="mt-4 sm:mt-6 flex items-center gap-3 sm:gap-4 px-1">
            <button
              onClick={handleSaveManual}
              disabled={loading}
              className="rounded bg-rust px-4 py-2 text-sm sm:text-base font-medium text-white hover:bg-rust/90 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save Profile"}
            </button>
            {hasProfile && (
              <button
                onClick={() => setEditing(false)}
                className="rounded px-4 py-2 text-sm sm:text-base text-ink/70 hover:bg-aged/50"
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
