"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { JournalCard } from "@/components/layout/JournalCard";
import { updateProfile } from "@/lib/database";

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [weight, setWeight] = useState(profile?.weight?.toString() ?? "");
  const [height, setHeight] = useState(profile?.height?.toString() ?? "");
  const [age, setAge] = useState(profile?.age?.toString() ?? "");
  const [activityLevel, setActivityLevel] = useState(
    profile?.activityLevel ?? "moderate"
  );
  const [goal, setGoal] = useState(profile?.goal ?? "maintain");
  const [proteinGoal, setProteinGoal] = useState(
    profile?.dailyProteinGoal?.toString() ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

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
          height: height ? parseFloat(height) : undefined,
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
    const pg = parseFloat(proteinGoal);
    if (isNaN(pg) || pg < 0) return;
    setLoading(true);
    setSaved(false);
    setError("");
    try {
      await updateProfile(user.id, {
        weight: weight ? parseFloat(weight) : undefined,
        height: height ? parseFloat(height) : undefined,
        age: age ? parseInt(age) : undefined,
        activityLevel,
        goal,
        dailyProteinGoal: pg,
      });
      await refreshProfile();
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
      <h1 className="font-heading text-2xl font-bold text-ink mb-6">
        Profile
      </h1>

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
            <label className="block text-sm text-ink/70">Height (inches)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="mt-1 w-full rounded border border-leather/30 px-3 py-2"
            />
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
              onChange={(e) => setActivityLevel(e.target.value as "sedentary" | "light" | "moderate" | "active" | "very_active")}
              className="mt-1 w-full rounded border border-leather/30 px-3 py-2"
            >
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="very_active">Very active</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-ink/70">Goal</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as "bulk" | "cut" | "maintain")}
              className="mt-1 w-full rounded border border-leather/30 px-3 py-2"
            >
              <option value="maintain">Maintain</option>
              <option value="bulk">Bulk / gain</option>
              <option value="cut">Cut / lose</option>
            </select>
          </div>
        </div>
      </JournalCard>

      <JournalCard title="Daily Protein Goal" className="mt-6">
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
          <p className="mt-4 text-sm text-ink/70 italic">{aiReasoning}</p>
        )}
      </JournalCard>

      {error && (
        <p className="mt-4 text-red-600 text-sm">{error}</p>
      )}

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSaveManual}
          disabled={loading}
          className="rounded border-2 border-leather px-4 py-2 font-medium text-ink hover:bg-aged/50"
        >
          Save Profile
        </button>
        {saved && (
          <span className="text-sm font-medium text-green-700">
            Profile saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
