import { supabase } from "./supabase";
import type {
  Workout,
  Exercise,
  ExerciseType,
  NutritionDay,
  FoodEntry,
  PhotoEntry,
  UserProfile,
} from "@/types";

const CARDIO_KEYWORDS = [
  "run", "running", "jog", "jogging", "sprint", "sprints",
  "cycling", "cycle", "bike", "biking",
  "swimming", "swim",
  "rowing", "row", "erg",
  "elliptical",
  "stair climber", "stairmaster", "stairs",
  "jump rope", "skipping",
  "walking", "walk",
  "hiking", "hike",
  "treadmill",
];

function detectExerciseType(name: string): ExerciseType {
  const lower = name.toLowerCase().trim();
  return CARDIO_KEYWORDS.some((kw) => lower === kw || lower.includes(kw))
    ? "cardio"
    : "strength";
}

// Map between camelCase (app) and snake_case (DB)
function workoutFromRow(row: Record<string, unknown>): Workout {
  const rawExercises = (row.exercises as Exercise[]) ?? [];
  // Backfill exercise type + completed for data saved before those fields existed
  const exercises = rawExercises.map((ex) => ({
    ...ex,
    type: ex.type ?? detectExerciseType(ex.name),
    completed: ex.completed ?? false,
  }));
  return {
    id: (row.id as string) ?? crypto.randomUUID(),
    date: row.date as string,
    notes: row.notes as string | undefined,
    exercises,
  };
}

function workoutToRow(workout: Workout) {
  return {
    date: workout.date,
    notes: workout.notes,
    exercises: workout.exercises,
  };
}

function nutritionFromRow(row: Record<string, unknown>): NutritionDay {
  return {
    date: row.date as string,
    proteinGoal: Number(row.protein_goal ?? 150),
    foods: (row.foods as FoodEntry[]) ?? [],
    totalProtein: Number(row.total_protein ?? 0),
    aiRecommendations: (row.ai_recommendations as string[]) ?? [],
  };
}

function nutritionToRow(day: NutritionDay) {
  return {
    date: day.date,
    protein_goal: day.proteinGoal,
    foods: day.foods,
    total_protein: day.totalProtein,
    ai_recommendations: day.aiRecommendations ?? [],
  };
}

function photoFromRow(row: Record<string, unknown>): PhotoEntry {
  return {
    id: row.id as string,
    date: row.date as string,
    photoURL: row.photo_url as string,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string | undefined,
  };
}

// Workouts
export async function getWorkout(
  userId: string,
  date: string
): Promise<Workout | null> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) throw error;
  return data ? workoutFromRow(data) : null;
}

export async function saveWorkout(userId: string, workout: Workout) {
  const row = workoutToRow(workout);
  const { error } = await supabase.from("workouts").upsert(
    { user_id: userId, ...row, updated_at: new Date().toISOString() },
    { onConflict: "user_id,date" }
  );
  if (error) throw error;
}

export async function getWorkoutsInRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Workout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(workoutFromRow);
}

// Exercise name history (for autocomplete)
export async function getExerciseNames(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("exercises")
    .eq("user_id", userId);

  if (error) throw error;
  const nameSet = new Set<string>();
  for (const row of data ?? []) {
    const exercises = row.exercises as Array<{ name: string }> | null;
    if (exercises) {
      for (const ex of exercises) {
        if (ex.name) nameSet.add(ex.name);
      }
    }
  }
  return Array.from(nameSet).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
}

// Food name history (for autocomplete)
export async function getFoodNames(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("nutrition")
    .select("foods")
    .eq("user_id", userId);

  if (error) throw error;
  const nameSet = new Set<string>();
  for (const row of data ?? []) {
    const foods = row.foods as Array<{ name: string }> | null;
    if (foods) {
      for (const f of foods) {
        if (f.name) nameSet.add(f.name);
      }
    }
  }
  return Array.from(nameSet).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
}

// Nutrition
export async function getNutritionDay(
  userId: string,
  date: string
): Promise<NutritionDay | null> {
  const { data, error } = await supabase
    .from("nutrition")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) throw error;
  return data ? nutritionFromRow(data) : null;
}

export async function saveNutritionDay(userId: string, day: NutritionDay) {
  const row = nutritionToRow(day);
  const { error } = await supabase.from("nutrition").upsert(
    { user_id: userId, ...row, updated_at: new Date().toISOString() },
    { onConflict: "user_id,date" }
  );
  if (error) throw error;
}

// Photos
export async function uploadPhoto(
  userId: string,
  date: string,
  file: Blob
): Promise<string> {
  const path = `${userId}/${date}`;
  const { error } = await supabase.storage.from("photos").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  const { data } = supabase.storage.from("photos").getPublicUrl(path);
  // Append cache-buster so updated photos aren't served stale
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function getPhoto(
  userId: string,
  date: string
): Promise<PhotoEntry | null> {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) throw error;
  return data ? photoFromRow(data) : null;
}

export async function savePhoto(userId: string, entry: PhotoEntry) {
  const { error } = await supabase.from("photos").upsert(
    {
      user_id: userId,
      date: entry.date,
      photo_url: entry.photoURL,
      notes: entry.notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" }
  );
  if (error) throw error;
}

export async function getPhotosInRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<PhotoEntry[]> {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(photoFromRow);
}

// Profile
export async function updateProfile(userId: string, updates: Partial<UserProfile>) {
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.displayName !== undefined) row.display_name = updates.displayName;
  if (updates.email !== undefined) row.email = updates.email;
  if (updates.weight !== undefined) row.weight = updates.weight;
  if (updates.height !== undefined) row.height = updates.height;
  if (updates.age !== undefined) row.age = updates.age;
  if (updates.activityLevel !== undefined)
    row.activity_level = updates.activityLevel;
  if (updates.goal !== undefined) row.goal = updates.goal;
  if (updates.dailyProteinGoal !== undefined)
    row.daily_protein_goal = updates.dailyProteinGoal;

  const { error } = await supabase
    .from("profiles")
    .update(row)
    .eq("id", userId);
  if (error) throw error;
}
