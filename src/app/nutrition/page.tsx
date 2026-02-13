"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useNutrition } from "@/hooks/useNutrition";
import { JournalCard } from "@/components/layout/JournalCard";
import { ProteinProgressBar } from "@/components/nutrition/ProteinProgressBar";
import { CalorieTracker } from "@/components/nutrition/CalorieTracker";
import { ShortfallAlert } from "@/components/nutrition/ShortfallAlert";
import { FoodRecommendations } from "@/components/nutrition/FoodRecommendations";
import { FoodSearch } from "@/components/nutrition/FoodSearch";
import { getFoodNames } from "@/lib/database";
import { getCalorieGoal } from "@/lib/nutrition";
import type { FoodEntry } from "@/types";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function EditableFoodRow({
  food,
  onUpdate,
  onRemove,
  onToggleEaten,
  onEstimateFood,
}: {
  food: FoodEntry;
  onUpdate: (id: string, updates: Partial<FoodEntry>) => void;
  onRemove: (id: string) => void;
  onToggleEaten: (id: string) => void;
  onEstimateFood: (name: string, quantity: string) => Promise<{ protein: number; calories: number }>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(food.name);
  const [quantity, setQuantity] = useState(food.quantity ?? "");
  const [protein, setProtein] = useState(food.protein.toString());
  const [calories, setCalories] = useState((food.calories ?? 0).toString());
  const [estimating, setEstimating] = useState(false);
  const isEaten = food.eaten ?? false;

  // Re-estimate protein & calories when name or quantity changes while editing
  const originalQty = food.quantity ?? "";
  const hasChanged = name.trim() !== food.name.trim() || quantity.trim() !== originalQty.trim();
  useEffect(() => {
    if (!editing || !name.trim() || !hasChanged) return;
    const timer = setTimeout(async () => {
      setEstimating(true);
      try {
        const { protein: p, calories: c } = await onEstimateFood(name.trim(), quantity.trim());
        setProtein(p.toString());
        setCalories(c.toString());
      } catch {
        // Keep current values on error
      } finally {
        setEstimating(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [editing, name, quantity, hasChanged, onEstimateFood]);

  const handleSave = () => {
    onUpdate(food.id, {
      name: name.trim() || food.name,
      quantity: quantity.trim() || undefined,
      protein: parseFloat(protein) || 0,
      calories: parseFloat(calories) || undefined,
    });
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setName(food.name);
      setQuantity(food.quantity ?? "");
      setProtein(food.protein.toString());
      setCalories((food.calories ?? 0).toString());
      setEditing(false);
    }
  };

  const handleEditBlur = (e: React.FocusEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    handleSave();
  };

  if (editing) {
    return (
      <div
        className="rounded border border-rust/30 bg-white/80 px-3 py-2 space-y-2"
        onBlur={handleEditBlur}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
            className="w-14 flex-shrink-0 rounded border border-leather/30 px-2 py-1 text-center text-sm text-ink"
            onKeyDown={handleKeyDown}
          />
          <span className="flex items-center text-ink/40 text-sm">×</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 min-w-0 rounded border border-leather/30 px-2 py-1 text-sm text-ink"
            autoFocus
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-xs text-ink/40 flex-shrink-0">Protein</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder={estimating ? "…" : ""}
            className="flex-1 min-w-0 rounded border border-leather/30 px-2 py-1 font-mono text-sm text-ink"
            onKeyDown={handleKeyDown}
          />
          <span className="text-xs text-ink/40">g</span>
          <label className="text-xs text-ink/40 flex-shrink-0">Cal</label>
          <input
            type="number"
            min={0}
            step={1}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder={estimating ? "…" : ""}
            className="flex-1 min-w-0 rounded border border-leather/30 px-2 py-1 font-mono text-sm text-ink"
            onKeyDown={handleKeyDown}
          />
          <span className="text-xs text-ink/40">kcal</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="rounded bg-rust px-3 py-1 text-xs font-medium text-white hover:bg-rust/90"
          >
            Save
          </button>
          <button
            onClick={() => {
              setName(food.name);
              setQuantity(food.quantity ?? "");
              setProtein(food.protein.toString());
              setCalories((food.calories ?? 0).toString());
              setEditing(false);
            }}
            className="rounded px-3 py-1 text-xs text-ink/70 hover:bg-aged/50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 rounded border px-2 sm:px-4 py-2 transition-colors ${
        isEaten
          ? "border-green-300/50 bg-green-50/40"
          : "border-leather/20 bg-white/60"
      }`}
    >
      <button
        onClick={() => onToggleEaten(food.id)}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
          isEaten
            ? "border-green-500 bg-green-500 text-white"
            : "border-leather/40 hover:border-rust"
        }`}
        aria-label={isEaten ? "Mark as not eaten" : "Mark as eaten"}
      >
        {isEaten && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </button>
      <button
        onClick={() => setEditing(true)}
        className={`flex-1 min-w-0 text-left text-sm sm:text-base truncate transition-colors ${
          isEaten ? "text-ink/50 line-through" : "text-ink hover:text-rust"
        }`}
      >
        {food.quantity ? `${food.quantity} × ${food.name}` : food.name}
      </button>
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <div className="text-right">
          <span
            className={`font-mono text-xs sm:text-sm ${
              isEaten ? "text-green-600" : "text-rust/50"
            }`}
          >
            {food.protein}g
          </span>
          {food.calories ? (
            <span className={`block font-mono text-[10px] sm:text-xs ${isEaten ? "text-green-500/70" : "text-ink/40"}`}>
              {food.calories} cal
            </span>
          ) : null}
        </div>
        <button
          onClick={() => onRemove(food.id)}
          className="text-ink/50 hover:text-red-600"
          aria-label="Remove"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function NutritionPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddFood, setShowAddFood] = useState(false);
  const [newFoodName, setNewFoodName] = useState("");
  const [newFoodQuantity, setNewFoodQuantity] = useState("");
  const [newFoodProtein, setNewFoodProtein] = useState("");
  const [newFoodCalories, setNewFoodCalories] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [foodHistory, setFoodHistory] = useState<string[]>([]);
  const {
    day,
    loading,
    saveStatus,
    addFood,
    removeFood,
    updateFood,
    flushSave,
  } = useNutrition(
    user?.id,
    profile?.dailyProteinGoal,
    selectedDate
  );

  useEffect(() => {
    if (!user) return;
    getFoodNames(user.id)
      .then(setFoodHistory)
      .catch(() => {});
  }, [user?.id]);

  const handleToggleEaten = (id: string) => {
    const food = day?.foods.find((f) => f.id === id);
    if (food) {
      updateFood(id, { eaten: !food.eaten });
    }
  };

  // Compute eaten vs planned totals
  const eatenProtein = day?.foods
    ?.filter((f) => f.eaten)
    .reduce((s, f) => s + f.protein, 0) ?? 0;
  const totalProtein = day?.totalProtein ?? 0;
  const eatenCalories = day?.foods
    ?.filter((f) => f.eaten)
    .reduce((s, f) => s + (f.calories ?? 0), 0) ?? 0;
  const totalCalories = day?.totalCalories ?? 0;
  const calorieGoal = getCalorieGoal(profile) ?? 2000;

  const handleAddFood = () => {
    const name = newFoodName.trim();
    const quantity = newFoodQuantity.trim() || undefined;
    const protein = parseFloat(newFoodProtein) || 0;
    const calories = parseFloat(newFoodCalories) || 0;
    if (name) {
      addFood({ name, quantity, protein, calories: calories || undefined });
      // Cache for future lookups so we don't re-call the LLM
      fetch("/api/ai/food-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodName: name, quantity, protein, calories }),
      }).catch(() => {});
      setNewFoodName("");
      setNewFoodQuantity("");
      setNewFoodProtein("");
      setNewFoodCalories("");
      setShowAddFood(false);
    }
  };

  const estimateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runEstimate = useCallback(async (name: string, qty: string) => {
    if (!name.trim()) return;
    setEstimating(true);
    try {
      const res = await fetch("/api/ai/food-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodName: name.trim(),
          quantity: qty.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewFoodProtein(data.protein?.toString() ?? "0");
      setNewFoodCalories(data.calories?.toString() ?? "0");
    } catch {
      setNewFoodProtein("");
      setNewFoodCalories("");
    } finally {
      setEstimating(false);
    }
  }, []);

  const estimateFood = useCallback(
    async (name: string, quantity: string): Promise<{ protein: number; calories: number }> => {
      const res = await fetch("/api/ai/food-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodName: name.trim(),
          quantity: quantity.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      return {
        protein: Number(data.protein ?? 0),
        calories: Number(data.calories ?? 0),
      };
    },
    []
  );

  // Auto-estimate protein & calories when food name or quantity changes
  useEffect(() => {
    if (!newFoodName.trim()) {
      setNewFoodProtein("");
      setNewFoodCalories("");
      return;
    }
    if (estimateTimer.current) clearTimeout(estimateTimer.current);
    estimateTimer.current = setTimeout(() => {
      runEstimate(newFoodName, newFoodQuantity);
    }, 800);
    return () => {
      if (estimateTimer.current) clearTimeout(estimateTimer.current);
    };
  }, [newFoodName, newFoodQuantity, runEstimate]);

  const handleAddFromRecommendation = (name: string, protein: number) => {
    addFood({ name, protein });
  };

  const resetForm = () => {
    setShowAddFood(false);
    setNewFoodName("");
    setNewFoodQuantity("");
    setNewFoodProtein("");
    setNewFoodCalories("");
  };

  const goPrevDay = () => {
    resetForm();
    // Force any pending state updates (e.g. from addFood) to commit, then save before navigating
    flushSync(() => {});
    flushSave().then(() => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 1);
      setSelectedDate(d);
    });
  };

  const goNextDay = () => {
    resetForm();
    flushSync(() => {});
    flushSave().then(() => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 1);
      setSelectedDate(d);
    });
  };

  const isToday = dateKey(selectedDate) === dateKey(new Date());

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-ink/70">
        Sign in to track nutrition.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-2 py-3 sm:px-4 sm:py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-xs sm:text-sm text-ink/50 hover:text-rust mb-2 sm:mb-3 px-1">
        ← Dashboard
      </Link>
      <JournalCard className="!p-3 sm:!p-6">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={goPrevDay}
              className="rounded px-2 py-1 sm:px-3 text-ink/70 hover:bg-aged/50"
            >
              ←
            </button>
            <h1 className="font-heading text-base sm:text-xl font-bold text-ink">
              {formatShortDate(selectedDate)}
              {isToday && (
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-normal text-rust">Today</span>
              )}
            </h1>
            <button
              onClick={goNextDay}
              className="rounded px-2 py-1 sm:px-3 text-ink/70 hover:bg-aged/50"
            >
              →
            </button>
          </div>
          <span className="text-xs text-ink/40 italic">
            {saveStatus === "saving" && "saving…"}
            {saveStatus === "saved" && "saved"}
            {saveStatus === "error" && "save failed"}
          </span>
        </div>

        <div className="mb-6">
          <ProteinProgressBar
            current={totalProtein}
            eaten={eatenProtein}
            goal={day?.proteinGoal ?? 150}
            size="lg"
          />
          <CalorieTracker
            eaten={eatenCalories}
            goal={calorieGoal}
            planned={totalCalories}
          />
        </div>

        {isToday && (
          <div className="mb-6">
            <ShortfallAlert
              eatenProtein={eatenProtein}
              plannedProtein={totalProtein}
              proteinGoal={day?.proteinGoal ?? 150}
            />
          </div>
        )}

        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-10 rounded bg-aged/20" />
            <div className="h-10 rounded bg-aged/20" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {day?.foods?.length ? (
                day.foods.map((f) => (
                  <EditableFoodRow
                    key={f.id}
                    food={f}
                    onUpdate={updateFood}
                    onRemove={removeFood}
                    onToggleEaten={handleToggleEaten}
                    onEstimateFood={estimateFood}
                  />
                ))
              ) : (
                <p className="py-6 text-center text-ink/50">
                  No meals logged. Add one below.
                </p>
              )}
            </div>

            {showAddFood ? (
              <div className="mt-4 sm:mt-6 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFoodQuantity}
                    onChange={(e) => setNewFoodQuantity(e.target.value)}
                    placeholder="Qty (e.g. 8oz)"
                    className="w-24 sm:w-32 flex-shrink-0 rounded border border-leather/30 px-2 py-2 text-sm text-ink"
                  />
                  <span className="flex items-center text-ink/40">×</span>
                  <FoodSearch
                    value={newFoodName}
                    onChange={setNewFoodName}
                    foodHistory={foodHistory}
                    placeholder="Food name (e.g. Eggs)"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-ink/50 flex-shrink-0">Protein</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={newFoodProtein}
                    onChange={(e) => {
                      setNewFoodProtein(e.target.value);
                      if (estimating) {
                        setEstimating(false);
                        if (estimateTimer.current) clearTimeout(estimateTimer.current);
                      }
                    }}
                    placeholder={estimating ? "estimating…" : ""}
                    className={`flex-1 min-w-0 rounded border border-leather/30 px-2 py-2 font-mono text-ink ${estimating ? "text-xs placeholder:text-xs" : "text-sm"}`}
                  />
                  <span className="text-xs text-ink/40">g</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-ink/50 flex-shrink-0">Calories</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={newFoodCalories}
                    onChange={(e) => {
                      setNewFoodCalories(e.target.value);
                      if (estimating) {
                        setEstimating(false);
                        if (estimateTimer.current) clearTimeout(estimateTimer.current);
                      }
                    }}
                    placeholder={estimating ? "estimating…" : ""}
                    className={`flex-1 min-w-0 rounded border border-leather/30 px-2 py-2 font-mono text-ink ${estimating ? "text-xs placeholder:text-xs" : "text-sm"}`}
                  />
                  <span className="text-xs text-ink/40">kcal</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddFood}
                    className="rounded bg-rust px-4 py-2 text-sm sm:text-base font-medium text-white hover:bg-rust/90"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddFood(false)}
                    className="rounded px-4 py-2 text-sm sm:text-base text-ink/70 hover:bg-aged/50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddFood(true)}
                className="mt-6 text-rust hover:underline"
              >
                + Add Meal
              </button>
            )}

            <FoodRecommendations
              foodsEaten={day?.foods?.map((f) => f.name) ?? []}
              proteinGoal={day?.proteinGoal ?? 150}
              proteinCurrent={totalProtein}
              onSelect={handleAddFromRecommendation}
            />
          </>
        )}
      </JournalCard>
    </div>
  );
}
