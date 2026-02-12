"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkouts } from "@/hooks/useWorkouts";
import { JournalCard } from "@/components/layout/JournalCard";
import { ExerciseLog } from "@/components/workout/ExerciseLog";
import { ExerciseSearch } from "@/components/workout/ExerciseSearch";
import { getExerciseNames } from "@/lib/database";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function JournalPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newExerciseName, setNewExerciseName] = useState("");
  const [exerciseHistory, setExerciseHistory] = useState<string[]>([]);
  const {
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
  } = useWorkouts(user?.id, selectedDate);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    getExerciseNames(user.id)
      .then(setExerciseHistory)
      .catch(() => {});
  }, [user?.id]);

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newExerciseName.trim();
    if (name) {
      addExercise(name);
      setNewExerciseName("");
    }
  };

  const handleQuickAdd = (name: string) => {
    addExercise(name);
    setNewExerciseName("");
  };

  const goPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const goNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const isToday = dateKey(selectedDate) === dateKey(new Date());

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-ink/70">
        Sign in to use the workout journal.
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

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 rounded bg-aged" />
            <div className="h-24 rounded bg-aged" />
          </div>
        ) : (
          <>
            <form onSubmit={handleAddExercise} className="mb-6 flex gap-2">
              <ExerciseSearch
                value={newExerciseName}
                onChange={setNewExerciseName}
                onSubmit={handleQuickAdd}
                exerciseHistory={exerciseHistory}
              />
              <button
                type="submit"
                className="rounded bg-leather/30 px-4 py-2 font-medium text-ink hover:bg-leather/50"
              >
                Add
              </button>
            </form>

            <div className="space-y-4">
              {workout?.exercises?.length ? (
                workout.exercises.map((ex, idx) => (
                  <div
                    key={ex.id}
                    draggable
                    onDragStart={() => {
                      dragItem.current = idx;
                    }}
                    onDragEnter={() => {
                      dragOverItem.current = idx;
                      setDragOverIndex(idx);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnd={() => {
                      if (
                        dragItem.current !== null &&
                        dragOverItem.current !== null &&
                        dragItem.current !== dragOverItem.current
                      ) {
                        reorderExercises(dragItem.current, dragOverItem.current);
                      }
                      dragItem.current = null;
                      dragOverItem.current = null;
                      setDragOverIndex(null);
                    }}
                    className={`transition-all ${
                      dragOverIndex === idx && dragItem.current !== idx
                        ? "border-t-2 border-rust/50"
                        : ""
                    } ${
                      dragItem.current === idx ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex gap-2">
                      <div
                        className="flex cursor-grab items-center px-1 text-ink/30 hover:text-ink/60 active:cursor-grabbing"
                        title="Drag to reorder"
                      >
                        <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor">
                          <circle cx="3" cy="4" r="1.5" />
                          <circle cx="9" cy="4" r="1.5" />
                          <circle cx="3" cy="10" r="1.5" />
                          <circle cx="9" cy="10" r="1.5" />
                          <circle cx="3" cy="16" r="1.5" />
                          <circle cx="9" cy="16" r="1.5" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <ExerciseLog
                          exercise={ex}
                          onUpdate={(u) => updateExercise(ex.id, u)}
                          onUpdateSet={(i, u) => updateSet(ex.id, i, u)}
                          onAddSet={() => addSet(ex.id)}
                          onRemoveSet={(i) => removeSet(ex.id, i)}
                          onRemove={() => removeExercise(ex.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-ink/50">
                  No exercises logged. Add one above.
                </p>
              )}
            </div>
          </>
        )}
      </JournalCard>
    </div>
  );
}
