"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getWorkout, saveWorkout } from "@/lib/database";
import type { Workout, Exercise, ExerciseType, Set } from "@/types";

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

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function useWorkouts(userId: string | undefined, selectedDate: Date) {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dateStr = dateKey(selectedDate);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setWorkout(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const w = await getWorkout(userId, dateStr);
      setWorkout(w);
    } catch (err) {
      console.error(err);
      setWorkout(null);
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, [userId, dateStr]);

  useEffect(() => {
    initialLoadDone.current = false;
    refresh();
  }, [refresh]);

  // Debounced auto-save: triggers 1s after last change
  useEffect(() => {
    if (!userId || !workout || !initialLoadDone.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await saveWorkout(userId, { ...workout, date: dateStr });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    }, 1000);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [userId, workout, dateStr]);

  const addExercise = useCallback((name: string) => {
    const type = detectExerciseType(name);
    const defaultSet: Set =
      type === "cardio"
        ? { distance: 0, time: 0 }
        : { reps: 0, weight: 0 };
    const newEx: Exercise = {
      id: crypto.randomUUID(),
      name,
      type,
      sets: [defaultSet],
    };
    setWorkout((prev) => ({
      ...(prev ?? { id: "", date: dateStr, exercises: [] }),
      date: dateStr,
      exercises: [...(prev?.exercises ?? []), newEx],
    }));
  }, [dateStr]);

  const removeExercise = useCallback((exerciseId: string) => {
    setWorkout((prev) => {
      if (!prev) return null;
      const exercises = prev.exercises.filter((e) => e.id !== exerciseId);
      return { ...prev, exercises };
    });
  }, []);

  const updateExercise = useCallback((exerciseId: string, updates: Partial<Exercise>) => {
    setWorkout((prev) => {
      if (!prev) return null;
      const exercises = prev.exercises.map((e) =>
        e.id === exerciseId ? { ...e, ...updates } : e
      );
      return { ...prev, exercises };
    });
  }, []);

  const updateSet = useCallback(
    (exerciseId: string, setIndex: number, updates: Partial<Set>) => {
      setWorkout((prev) => {
        if (!prev) return null;
        const exercises = prev.exercises.map((e) => {
          if (e.id !== exerciseId) return e;
          const sets = [...e.sets];
          sets[setIndex] = { ...sets[setIndex], ...updates };
          return { ...e, sets };
        });
        return { ...prev, exercises };
      });
    },
    []
  );

  const addSet = useCallback((exerciseId: string) => {
    setWorkout((prev) => {
      if (!prev) return null;
      const exercises = prev.exercises.map((e) => {
        if (e.id !== exerciseId) return e;
        const fallback: Set =
          e.type === "cardio" ? { distance: 0, time: 0 } : { reps: 0, weight: 0 };
        const lastSet = e.sets[e.sets.length - 1] ?? fallback;
        return { ...e, sets: [...e.sets, { ...lastSet }] };
      });
      return { ...prev, exercises };
    });
  }, []);

  const removeSet = useCallback((exerciseId: string, setIndex: number) => {
    setWorkout((prev) => {
      if (!prev) return null;
      const exercises = prev.exercises.map((e) => {
        if (e.id !== exerciseId) return e;
        const sets = e.sets.filter((_, i) => i !== setIndex);
        const fallback: Set =
          e.type === "cardio" ? { distance: 0, time: 0 } : { reps: 0, weight: 0 };
        return { ...e, sets: sets.length ? sets : [fallback] };
      });
      return { ...prev, exercises };
    });
  }, []);

  const reorderExercises = useCallback((fromIndex: number, toIndex: number) => {
    setWorkout((prev) => {
      if (!prev) return null;
      const exercises = [...prev.exercises];
      const [moved] = exercises.splice(fromIndex, 1);
      exercises.splice(toIndex, 0, moved);
      return { ...prev, exercises };
    });
  }, []);

  /** Clone exercises from a source workout into the current day (new IDs, uncompleted). */
  const importExercises = useCallback(
    (sourceExercises: Exercise[]) => {
      const cloned = sourceExercises.map((ex) => ({
        ...ex,
        id: crypto.randomUUID(),
        completed: false,
        sets: ex.sets.map((s) => ({ ...s })),
      }));
      setWorkout((prev) => ({
        ...(prev ?? { id: "", date: dateStr, exercises: [] }),
        date: dateStr,
        exercises: [...(prev?.exercises ?? []), ...cloned],
      }));
    },
    [dateStr]
  );

  return {
    workout,
    loading,
    saveStatus,
    addExercise,
    removeExercise,
    updateExercise,
    updateSet,
    addSet,
    removeSet,
    reorderExercises,
    importExercises,
    refresh,
  };
}
