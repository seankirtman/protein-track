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
  "rowing", "erg", // note: "row" excluded — barbell/dumbbell rows are strength
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
  const foods = (row.foods as FoodEntry[]) ?? [];
  return {
    date: row.date as string,
    proteinGoal: Number(row.protein_goal ?? 150),
    foods,
    totalProtein: Number(row.total_protein ?? 0),
    totalCalories: Number(row.total_calories ?? 0) || foods.reduce((s, f) => s + (f.calories ?? 0), 0),
    aiRecommendations: (row.ai_recommendations as string[]) ?? [],
  };
}

function nutritionToRow(day: NutritionDay) {
  const foods = (day.foods ?? []).map((f) => ({
    id: f.id,
    name: String(f.name ?? ""),
    quantity: f.quantity ?? undefined,
    protein: Number.isFinite(f.protein) ? f.protein : 0,
    calories: f.calories != null && Number.isFinite(f.calories) ? f.calories : undefined,
    time: f.time ?? undefined,
    eaten: f.eaten ?? undefined,
  }));
  return {
    date: day.date,
    protein_goal: Number.isFinite(day.proteinGoal) ? day.proteinGoal : 150,
    foods,
    total_protein: Number.isFinite(day.totalProtein) ? day.totalProtein : 0,
    total_calories: Number.isFinite(day.totalCalories) ? day.totalCalories : 0,
    ai_recommendations: day.aiRecommendations ?? [],
  };
}

function photoFromRow(row: Record<string, unknown>): PhotoEntry {
  return {
    id: row.id as string,
    date: row.date as string,
    photoURL: row.photo_url as string,
    weight: row.weight != null ? Number(row.weight) : undefined,
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

// Exercise cache (steps, image, etc. - avoid repeated LLM calls)
function exerciseCacheKey(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

export interface ExerciseCacheEntry {
  nameKey: string;
  nameDisplay?: string;
  steps?: string[];
  imageDataUrl?: string | null;
  caloriesEstimate?: number | null;
  proteinEstimate?: number | null;
}

export async function getExerciseCache(nameKey: string): Promise<ExerciseCacheEntry | null> {
  const { data, error } = await supabase
    .from("exercise_cache")
    .select("name_key, name_display, steps, image_data_url, calories_estimate, protein_estimate")
    .eq("name_key", nameKey)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    nameKey: data.name_key,
    nameDisplay: data.name_display ?? undefined,
    steps: (data.steps as string[]) ?? undefined,
    imageDataUrl: data.image_data_url ?? undefined,
    caloriesEstimate: data.calories_estimate ?? undefined,
    proteinEstimate: data.protein_estimate ?? undefined,
  };
}

export async function upsertExerciseCache(
  nameKey: string,
  updates: Partial<Pick<ExerciseCacheEntry, "nameDisplay" | "steps" | "imageDataUrl" | "caloriesEstimate" | "proteinEstimate">>
) {
  const existing = await getExerciseCache(nameKey);
  const merged: ExerciseCacheEntry = {
    nameKey,
    nameDisplay: updates.nameDisplay ?? existing?.nameDisplay,
    steps: updates.steps ?? existing?.steps,
    imageDataUrl: updates.imageDataUrl ?? existing?.imageDataUrl,
    caloriesEstimate: updates.caloriesEstimate ?? existing?.caloriesEstimate,
    proteinEstimate: updates.proteinEstimate ?? existing?.proteinEstimate,
  };

  const row = {
    name_key: nameKey,
    name_display: merged.nameDisplay ?? null,
    steps: merged.steps ?? null,
    image_data_url: merged.imageDataUrl ?? null,
    calories_estimate: merged.caloriesEstimate ?? null,
    protein_estimate: merged.proteinEstimate ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("exercise_cache").upsert(row, {
    onConflict: "name_key",
  });
  if (error) throw error;
}

export { exerciseCacheKey };

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
  const payload = {
    user_id: userId,
    ...row,
    updated_at: new Date().toISOString(),
  };

  const trySave = async (savePayload: Record<string, unknown>) => {
    // Avoid PostgREST on_conflict edge cases by using update -> insert fallback.
    const { data: updated, error: updateError } = await supabase
      .from("nutrition")
      .update(savePayload)
      .eq("user_id", userId)
      .eq("date", row.date)
      .select("id")
      .limit(1);
    if (updateError) throw updateError;

    if ((updated?.length ?? 0) > 0) return;

    const { error: insertError } = await supabase.from("nutrition").insert(savePayload);
    if (!insertError) return;

    // If another save inserted concurrently, retry update once.
    if ((insertError as { code?: string }).code === "23505") {
      const { error: retryUpdateError } = await supabase
        .from("nutrition")
        .update(savePayload)
        .eq("user_id", userId)
        .eq("date", row.date);
      if (retryUpdateError) throw retryUpdateError;
      return;
    }

    throw insertError;
  };

  try {
    await trySave(payload as Record<string, unknown>);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    const missingCaloriesColumn =
      e?.code === "PGRST204" && (e.message ?? "").includes("total_calories");
    if (!missingCaloriesColumn) throw err;

    // Backward compatibility for DBs that haven't added nutrition.total_calories yet.
    const { total_calories: _ignored, ...legacyPayload } =
      payload as Record<string, unknown>;
    await trySave(legacyPayload);
  }
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
      weight: entry.weight ?? null,
      notes: entry.notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" }
  );
  if (error) throw error;
}

export async function deletePhoto(userId: string, date: string): Promise<void> {
  const path = `${userId}/${date}`;
  const [storageResult, dbResult] = await Promise.all([
    supabase.storage.from("photos").remove([path]),
    supabase.from("photos").delete().eq("user_id", userId).eq("date", date),
  ]);
  if (storageResult.error) throw storageResult.error;
  if (dbResult.error) throw dbResult.error;
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
export async function updateProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, "dailyCalorieGoal">> & { dailyCalorieGoal?: number | null }
) {
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
  if ("dailyCalorieGoal" in updates)
    row.daily_calorie_goal = updates.dailyCalorieGoal;

  const { error } = await supabase
    .from("profiles")
    .update(row)
    .eq("id", userId);
  if (error) throw error;
}
