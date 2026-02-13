"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNutrition } from "@/hooks/useNutrition";
import { JournalCard } from "@/components/layout/JournalCard";
import { ProteinProgressBar } from "@/components/nutrition/ProteinProgressBar";
import { ShortfallAlert } from "@/components/nutrition/ShortfallAlert";
import { FoodRecommendations } from "@/components/nutrition/FoodRecommendations";
import { FoodSearch } from "@/components/nutrition/FoodSearch";
import { getFoodNames } from "@/lib/database";
import type { FoodEntry } from "@/types";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function EditableFoodRow({
  food,
  onUpdate,
  onRemove,
  onToggleEaten,
}: {
  food: FoodEntry;
  onUpdate: (id: string, updates: Partial<FoodEntry>) => void;
  onRemove: (id: string) => void;
  onToggleEaten: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(food.name);
  const [quantity, setQuantity] = useState(food.quantity ?? "");
  const [protein, setProtein] = useState(food.protein.toString());
  const isEaten = food.eaten ?? false;

  const handleSave = () => {
    onUpdate(food.id, {
      name: name.trim() || food.name,
      quantity: quantity.trim() || undefined,
      protein: parseFloat(protein) || 0,
    });
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setName(food.name);
      setQuantity(food.quantity ?? "");
      setProtein(food.protein.toString());
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="rounded border border-rust/30 bg-white/80 px-3 py-2 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
            className="w-14 rounded border border-leather/30 px-2 py-1 text-center text-sm text-ink"
            onKeyDown={handleKeyDown}
          />
          <span className="flex items-center text-ink/40 text-sm">×</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded border border-leather/30 px-2 py-1 text-sm text-ink"
            autoFocus
            onKeyDown={handleKeyDown}
          />
          <input
            type="number"
            min={0}
            step={0.5}
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="w-16 rounded border border-leather/30 px-2 py-1 font-mono text-sm text-ink"
            onKeyDown={handleKeyDown}
          />
          <span className="flex items-center text-xs text-ink/40">g</span>
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
      className={`flex items-center gap-3 rounded border px-4 py-2 transition-colors ${
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
        className={`flex-1 text-left transition-colors ${
          isEaten ? "text-ink/50 line-through" : "text-ink hover:text-rust"
        }`}
      >
        {food.quantity ? `${food.quantity} × ${food.name}` : food.name}
      </button>
      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-sm ${
            isEaten ? "text-green-600" : "text-rust/50"
          }`}
        >
          {food.protein}g
        </span>
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
  const { user, profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddFood, setShowAddFood] = useState(false);
  const [newFoodName, setNewFoodName] = useState("");
  const [newFoodQuantity, setNewFoodQuantity] = useState("");
  const [newFoodProtein, setNewFoodProtein] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [foodHistory, setFoodHistory] = useState<string[]>([]);
  const {
    day,
    loading,
    saveStatus,
    addFood,
    removeFood,
    updateFood,
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

  const handleAddFood = () => {
    const name = newFoodName.trim();
    const quantity = newFoodQuantity.trim() || undefined;
    const protein = parseFloat(newFoodProtein) || 0;
    if (name) {
      addFood({ name, quantity, protein });
      setNewFoodName("");
      setNewFoodQuantity("");
      setNewFoodProtein("");
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
    } catch {
      setNewFoodProtein("");
    } finally {
      setEstimating(false);
    }
  }, []);

  // Auto-estimate protein when food name or quantity changes
  useEffect(() => {
    if (!newFoodName.trim()) {
      setNewFoodProtein("");
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
  };

  const goPrevDay = () => {
    resetForm();
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const goNextDay = () => {
    resetForm();
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const isToday = dateKey(selectedDate) === dateKey(new Date());

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-ink/70">
        Sign in to track nutrition.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <JournalCard>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={goPrevDay}
              className="rounded px-3 py-1 text-ink/70 hover:bg-aged/50"
            >
              ←
            </button>
            <h1 className="font-heading text-xl font-bold text-ink">
              {formatShortDate(selectedDate)}
              {isToday && (
                <span className="ml-2 text-sm font-normal text-rust">Today</span>
              )}
            </h1>
            <button
              onClick={goNextDay}
              className="rounded px-3 py-1 text-ink/70 hover:bg-aged/50"
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
            <div className="h-12 rounded bg-aged" />
            <div className="h-12 rounded bg-aged" />
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
                  />
                ))
              ) : (
                <p className="py-6 text-center text-ink/50">
                  No meals logged. Add one below.
                </p>
              )}
            </div>

            {showAddFood ? (
              <div className="mt-6 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFoodQuantity}
                    onChange={(e) => setNewFoodQuantity(e.target.value)}
                    placeholder="Qty (e.g. 8oz)"
                    className="w-32 rounded border border-leather/30 px-2 py-2 text-sm text-ink"
                  />
                  <span className="flex items-center text-ink/40">×</span>
                  <FoodSearch
                    value={newFoodName}
                    onChange={setNewFoodName}
                    foodHistory={foodHistory}
                    placeholder="Food name (e.g. Eggs)"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-ink/50">Protein</label>
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
                      className={`w-28 rounded border border-leather/30 px-2 py-2 font-mono text-ink ${estimating ? "text-xs placeholder:text-xs" : "text-sm"}`}
                    />
                    <span className="text-xs text-ink/40">g</span>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={handleAddFood}
                      className="rounded bg-rust px-4 py-2 font-medium text-white hover:bg-rust/90"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddFood(false)}
                      className="rounded px-4 py-2 text-ink/70 hover:bg-aged/50"
                    >
                      Cancel
                    </button>
                  </div>
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
