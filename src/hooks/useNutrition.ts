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

  // Debounced auto-save: triggers 1s after last change
  useEffect(() => {
    if (!userId || !day || !initialLoadDone.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await saveNutritionDay(userId, day);
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

  return {
    day,
    loading,
    saveStatus,
    addFood,
    removeFood,
    updateFood,
    refresh,
  };
}
