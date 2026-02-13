import type { UserProfile } from "@/types";

export function estimateCalories(
  weightLbs: number | undefined,
  heightIn: number | undefined,
  age: number | undefined,
  activityLevel: string | undefined,
  goal: string | undefined
): number | null {
  if (!weightLbs) return null;

  // Mifflin-St Jeor (uses metric)
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightIn ? heightIn * 2.54 : 170; // default 170cm if unknown
  const ageNum = age || 25; // default 25 if unknown

  // BMR (using male formula as default; close enough for estimation)
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageNum + 5;

  // Activity multiplier (conservative)
  let activityMult = 1.4; // moderate default
  switch (activityLevel) {
    case "sedentary": activityMult = 1.2; break;
    case "light": activityMult = 1.3; break;
    case "moderate": activityMult = 1.4; break;
    case "active": activityMult = 1.55; break;
    case "very_active": activityMult = 1.7; break;
  }

  const tdee = bmr * activityMult;

  // Goal adjustment
  let goalAdj = 0;
  switch (goal) {
    case "aggressive_bulk": goalAdj = 300; break;
    case "bulk": goalAdj = 150; break;
    case "lean_bulk": goalAdj = 50; break;
    case "maintain": goalAdj = 0; break;
    case "cut": goalAdj = -300; break;
    case "aggressive_cut": goalAdj = -500; break;
  }

  return Math.round(tdee + goalAdj);
}

export function estimateCaloriesFromProfile(profile: UserProfile | null): number | undefined {
  if (!profile) return undefined;
  return estimateCalories(
    profile.weight,
    profile.height,
    profile.age,
    profile.activityLevel,
    profile.goal
  ) ?? undefined;
}
