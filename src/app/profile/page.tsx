"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { JournalCard } from "@/components/layout/JournalCard";
import { updateProfile } from "@/lib/database";

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

function estimateCalories(
  weightLbs: number | undefined,
  heightIn: number | undefined,
  ageSt: string,
  activity: string,
  goal: string
): number | null {
  if (!weightLbs) return null;

  // Mifflin-St Jeor (uses metric)
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightIn ? heightIn * 2.54 : 170; // default 170cm if unknown
  const ageNum = parseInt(ageSt) || 25; // default 25 if unknown

  // BMR (using male formula as default; close enough for estimation)
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageNum + 5;

  // Activity multiplier
  let activityMult = 1.55; // moderate default
  switch (activity) {
    case "sedentary": activityMult = 1.2; break;
    case "light": activityMult = 1.375; break;
    case "moderate": activityMult = 1.55; break;
    case "active": activityMult = 1.725; break;
    case "very_active": activityMult = 1.9; break;
  }

  const tdee = bmr * activityMult;

  // Goal adjustment
  let goalAdj = 0;
  switch (goal) {
    case "aggressive_bulk": goalAdj = 500; break;
    case "bulk": goalAdj = 300; break;
    case "lean_bulk": goalAdj = 150; break;
    case "maintain": goalAdj = 0; break;
    case "cut": goalAdj = -300; break;
    case "aggressive_cut": goalAdj = -500; break;
  }

  return Math.round(tdee + goalAdj);
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
  const { user, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [age, setAge] = useState("");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [goal, setGoal] = useState<string>("maintain");
  const [proteinGoal, setProteinGoal] = useState("");
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
  }, [profile]);

  const totalHeightInches =
    heightFeet || heightInches
      ? (parseInt(heightFeet) || 0) * 12 + (parseInt(heightInches) || 0)
      : undefined;

  const hasProfile = !!(profile?.weight || profile?.height || profile?.age || profile?.dailyProteinGoal);

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
    if (pg !== undefined && (isNaN(pg) || pg < 0)) return;
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

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-ink/70">
        Sign in to manage your profile.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-ink">
          Profile
        </h1>
        {saved && (
          <span className="text-sm font-medium text-green-700">
            Saved successfully
          </span>
        )}
      </div>

      {/* ===== VIEW MODE ===== */}
      {hasProfile && !editing ? (
        <>
          <JournalCard title="Your Stats">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="block text-xs text-ink/50 uppercase tracking-wide">Weight</span>
                <p className="font-mono text-lg text-ink">{profile?.weight ? `${profile.weight} lbs` : "—"}</p>
              </div>
              <div>
                <span className="block text-xs text-ink/50 uppercase tracking-wide">Height</span>
                <p className="font-mono text-lg text-ink">{formatHeight(profile?.height)}</p>
              </div>
              <div>
                <span className="block text-xs text-ink/50 uppercase tracking-wide">Age</span>
                <p className="font-mono text-lg text-ink">{profile?.age ?? "—"}</p>
              </div>
              <div>
                <span className="block text-xs text-ink/50 uppercase tracking-wide">Activity</span>
                <p className="font-mono text-lg text-ink">{ACTIVITY_LABELS[profile?.activityLevel ?? ""] ?? "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="block text-xs text-ink/50 uppercase tracking-wide">Goal</span>
                <p className="font-mono text-lg text-ink">{GOAL_LABELS[profile?.goal ?? ""] ?? "—"}</p>
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="mt-4 text-sm font-medium text-rust hover:underline"
            >
              Edit Stats
            </button>
          </JournalCard>

          <JournalCard title="Daily Protein Goal" className="mt-6">
            <p className="text-sm text-ink/70 mb-4 leading-relaxed">
              {getProteinNote(
                profile?.weight,
                profile?.height,
                profile?.goal ?? "maintain",
                profile?.activityLevel ?? "moderate"
              )}
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-mono text-2xl font-bold text-ink">
                {profile?.dailyProteinGoal ?? "—"}
              </span>
              <span className="text-ink/60">grams / day</span>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-sm font-medium text-rust hover:underline"
            >
              Edit Goal
            </button>

            {/* Auto-calculated calorie goal */}
            {(() => {
              const cal = estimateCalories(
                profile?.weight,
                profile?.height,
                (profile?.age ?? "").toString(),
                profile?.activityLevel ?? "moderate",
                profile?.goal ?? "maintain"
              );
              if (!cal) return null;
              const goalLabel = GOAL_LABELS[profile?.goal ?? "maintain"];
              const isSurplus = ["aggressive_bulk", "bulk", "lean_bulk"].includes(profile?.goal ?? "");
              const isDeficit = ["cut", "aggressive_cut"].includes(profile?.goal ?? "");
              return (
                <div className="mt-6 rounded border border-leather/20 bg-parchment/50 px-4 py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-ink/60">Estimated Daily Calories</span>
                    <span className="font-mono text-xl font-bold text-ink">{cal.toLocaleString()}</span>
                    <span className="text-sm text-ink/60">kcal</span>
                  </div>
                  <p className="mt-1 text-xs text-ink/50">
                    Based on your stats &amp; {goalLabel} goal
                    {isSurplus && " — includes a caloric surplus for muscle growth"}
                    {isDeficit && " — includes a caloric deficit for fat loss"}
                    {!isSurplus && !isDeficit && " — maintenance calories"}.
                    {" "}This is an estimate; adjust based on real-world results.
                  </p>
                </div>
              );
            })()}
          </JournalCard>
        </>
      ) : (
        /* ===== EDIT MODE ===== */
        <>
          <JournalCard title="Your Stats">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-ink/70">Weight (lbs)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="mt-1 w-full rounded border border-leather/30 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-ink/70">Height</label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={heightFeet}
                    onChange={(e) => setHeightFeet(e.target.value)}
                    className="flex-1 rounded border border-leather/30 px-3 py-2"
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
                    className="flex-1 rounded border border-leather/30 px-3 py-2"
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
                <label className="block text-sm text-ink/70">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="mt-1 w-full rounded border border-leather/30 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-ink/70">Activity level</label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                  className="mt-1 w-full rounded border border-leather/30 px-3 py-2"
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="active">Active</option>
                  <option value="very_active">Very active</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-ink/70">Goal</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="mt-1 w-full rounded border border-leather/30 px-3 py-2"
                >
                  <option value="aggressive_bulk">Aggressive Bulk — max muscle gain, high surplus</option>
                  <option value="bulk">Lean Bulk — steady muscle gain, moderate surplus</option>
                  <option value="lean_bulk">Clean Bulk — slow gain, minimal fat</option>
                  <option value="maintain">Maintain — hold current weight &amp; composition</option>
                  <option value="cut">Cut — lose fat, preserve muscle</option>
                  <option value="aggressive_cut">Aggressive Cut — rapid fat loss</option>
                </select>
              </div>
            </div>
          </JournalCard>

          <JournalCard title="Daily Protein Goal" className="mt-6">
            <p className="text-sm text-ink/70 mb-4 leading-relaxed">
              {getProteinNote(
                weight ? parseFloat(weight) : undefined,
                totalHeightInches,
                goal ?? "maintain",
                activityLevel
              )}
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                min={0}
                value={proteinGoal}
                onChange={(e) => setProteinGoal(e.target.value)}
                className="w-24 rounded border border-leather/30 px-3 py-2 font-mono"
                placeholder="150"
              />
              <span className="flex items-center text-ink/70">grams</span>
            </div>
            <button
              onClick={handleCalculateProtein}
              disabled={loading}
              className="rounded bg-rust px-4 py-2 text-white hover:bg-rust/90 disabled:opacity-50 mr-2"
            >
              {loading ? "Calculating…" : "Calculate with AI"}
            </button>
            {aiReasoning && (
              <p className="mt-4 text-sm text-ink/60 italic border-l-2 border-rust/30 pl-3">{aiReasoning}</p>
            )}

            {/* Auto-calculated calorie goal */}
            {(() => {
              const cal = estimateCalories(
                weight ? parseFloat(weight) : undefined,
                totalHeightInches,
                age,
                activityLevel,
                goal ?? "maintain"
              );
              if (!cal) return null;
              const goalLabel = GOAL_LABELS[goal ?? "maintain"];
              const isSurplus = ["aggressive_bulk", "bulk", "lean_bulk"].includes(goal ?? "");
              const isDeficit = ["cut", "aggressive_cut"].includes(goal ?? "");
              return (
                <div className="mt-6 rounded border border-leather/20 bg-parchment/50 px-4 py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-ink/60">Estimated Daily Calories</span>
                    <span className="font-mono text-xl font-bold text-ink">{cal.toLocaleString()}</span>
                    <span className="text-sm text-ink/60">kcal</span>
                  </div>
                  <p className="mt-1 text-xs text-ink/50">
                    Based on your stats &amp; {goalLabel} goal
                    {isSurplus && " — includes a caloric surplus for muscle growth"}
                    {isDeficit && " — includes a caloric deficit for fat loss"}
                    {!isSurplus && !isDeficit && " — maintenance calories"}.
                    {" "}This is an estimate; adjust based on real-world results.
                  </p>
                </div>
              );
            })()}
          </JournalCard>

          {error && (
            <p className="mt-4 text-red-600 text-sm">{error}</p>
          )}

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleSaveManual}
              disabled={loading}
              className="rounded bg-rust px-4 py-2 font-medium text-white hover:bg-rust/90 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save Profile"}
            </button>
            {hasProfile && (
              <button
                onClick={() => setEditing(false)}
                className="rounded px-4 py-2 text-ink/70 hover:bg-aged/50"
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
