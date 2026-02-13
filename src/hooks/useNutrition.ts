"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getNutritionDay, saveNutritionDay } from "@/lib/database";
import type { NutritionDay, FoodEntry } from "@/types";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function useNutrition(
  userId: string | undefined,
  profileProteinGoal: number | undefined,
  selectedDate: Date
) {
  const [day, setDay] = useState<NutritionDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dateStr = dateKey(selectedDate);
  const proteinGoal = profileProteinGoal ?? 150;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);
  const dayRef = useRef<NutritionDay | null>(null);
  dayRef.current = day;

  const refresh = useCallback(async () => {
    if (!userId) {
      setDay(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const d = await getNutritionDay(userId, dateStr);
      if (d) {
        setDay(d);
      } else {
        setDay({
          date: dateStr,
          proteinGoal,
          foods: [],
          totalProtein: 0,
          totalCalories: 0,
        });
      }
    } catch (err) {
      console.error(err);
      setDay({ date: dateStr, proteinGoal, foods: [], totalProtein: 0, totalCalories: 0 });
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, [userId, dateStr, proteinGoal]);

  // Reset on date change
  useEffect(() => {
    initialLoadDone.current = false;
    refresh();
  }, [refresh]);

  // Auto-save: 300ms debounce after changes. Flush on date change so we don't lose data when navigating.
  useEffect(() => {
    if (!userId || !day || !initialLoadDone.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await saveNutritionDay(userId, day);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("Nutrition save failed:", err);
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
      saveTimer.current = null;
    }, 300);

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        saveNutritionDay(userId, day).catch(console.error);
      }
    };
  }, [userId, day, dateStr]);

  const addFood = useCallback(
    (entry: Omit<FoodEntry, "id">) => {
      const newFood: FoodEntry = {
        ...entry,
        id: crypto.randomUUID(),
      };
      setDay((prev) => {
        if (!prev) return null;
        const foods = [...prev.foods, newFood];
        const totalProtein = foods.reduce((s, f) => s + f.protein, 0);
        const totalCalories = foods.reduce((s, f) => s + (f.calories ?? 0), 0);
        return { ...prev, foods, totalProtein, totalCalories };
      });
    },
    []
  );

  const removeFood = useCallback((id: string) => {
    setDay((prev) => {
      if (!prev) return null;
      const foods = prev.foods.filter((f) => f.id !== id);
      const totalProtein = foods.reduce((s, f) => s + f.protein, 0);
      const totalCalories = foods.reduce((s, f) => s + (f.calories ?? 0), 0);
      return { ...prev, foods, totalProtein, totalCalories };
    });
  }, []);

  const updateFood = useCallback((id: string, updates: Partial<FoodEntry>) => {
    setDay((prev) => {
      if (!prev) return null;
      const foods = prev.foods.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      );
      const totalProtein = foods.reduce((s, f) => s + f.protein, 0);
      const totalCalories = foods.reduce((s, f) => s + (f.calories ?? 0), 0);
      return { ...prev, foods, totalProtein, totalCalories };
    });
  }, []);

  /** Flush pending save immediately (for use before date navigation). Uses ref to get latest day after blur-triggered updates. */
  const flushSave = useCallback(async () => {
    const currentDay = dayRef.current;
    if (!userId || !currentDay) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSaveStatus("saving");
    try {
      await saveNutritionDay(userId, currentDay);
      setSaveStatus("saved");
    } catch (err) {
      console.error("Nutrition flush save failed:", err);
      setSaveStatus("error");
    }
    setTimeout(() => setSaveStatus("idle"), 1500);
  }, [userId]);

  return {
    day,
    loading,
    saveStatus,
    addFood,
    removeFood,
    updateFood,
    refresh,
    flushSave,
  };
}
