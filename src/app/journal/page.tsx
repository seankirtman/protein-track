"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkouts } from "@/hooks/useWorkouts";
import Link from "next/link";
import { JournalCard } from "@/components/layout/JournalCard";
import { ExerciseLog } from "@/components/workout/ExerciseLog";
import { ExerciseSearch } from "@/components/workout/ExerciseSearch";
import { getExerciseNames, getWorkout } from "@/lib/database";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function JournalPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newExerciseName, setNewExerciseName] = useState("");
  const [exerciseHistory, setExerciseHistory] = useState<string[]>([]);
  const [showCopyPicker, setShowCopyPicker] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [showSurpriseModal, setShowSurpriseModal] = useState(false);
  const [surpriseInput, setSurpriseInput] = useState("");
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const [surpriseError, setSurpriseError] = useState("");
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
    importExercises,
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

  const handleCopyFromDate = async (sourceDateStr: string) => {
    if (!user) return;
    setCopyLoading(true);
    setCopyError("");
    try {
      const sourceWorkout = await getWorkout(user.id, sourceDateStr);
      if (!sourceWorkout || !sourceWorkout.exercises.length) {
        setCopyError("No workout found for that date.");
        return;
      }
      importExercises(sourceWorkout.exercises);
      setShowCopyPicker(false);
    } catch {
      setCopyError("Failed to load workout.");
    } finally {
      setCopyLoading(false);
    }
  };

  const handleSurpriseMe = async () => {
    const input = surpriseInput.trim();
    // Parse optional duration: "45 min", "1 hour", "20 minute workout"
    let durationMinutes = 30;
    const minMatch = input.match(/(\d+)\s*(?:min|minute)/i);
    const hrMatch = input.match(/(\d+)\s*(?:hr|hour)/i);
    if (minMatch) durationMinutes = Math.min(120, Math.max(10, parseInt(minMatch[1], 10)));
    else if (hrMatch) durationMinutes = Math.min(120, Math.max(10, parseInt(hrMatch[1], 10) * 60));

    setSurpriseLoading(true);
    setSurpriseError("");
    try {
      const res = await fetch("/api/ai/workout-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput: input || "Give me a balanced full-body workout",
          durationMinutes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate workout");
      if (!data.exercises?.length) throw new Error("No exercises returned");
      importExercises(data.exercises);
      setShowSurpriseModal(false);
      setSurpriseInput("");
    } catch (err) {
      setSurpriseError(err instanceof Error ? err.message : "Failed to generate workout.");
    } finally {
      setSurpriseLoading(false);
    }
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

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-ink/70">
        Sign in to use the workout journal.
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

        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-10 rounded bg-aged/30" />
            <div className="h-20 rounded bg-aged/20" />
            <div className="h-20 rounded bg-aged/20" />
          </div>
        ) : (
          <>
            <form onSubmit={handleAddExercise} className="mb-3 sm:mb-4 flex gap-2">
              <ExerciseSearch
                value={newExerciseName}
                onChange={setNewExerciseName}
                onSubmit={handleQuickAdd}
                exerciseHistory={exerciseHistory}
              />
              <button
                type="submit"
                className="rounded bg-leather/30 px-3 py-2 sm:px-4 text-sm sm:text-base font-medium text-ink hover:bg-leather/50 flex-shrink-0"
              >
                Add
              </button>
            </form>

            {/* Copy from another day */}
            <div className="mb-4 sm:mb-6">
              {showCopyPicker ? (
                <div className="rounded border border-leather/30 bg-white/60 p-3 space-y-2">
                  <p className="text-xs sm:text-sm font-medium text-ink">
                    Pick a date to copy exercises from:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      max={dateKey(new Date())}
                      onChange={(e) => {
                        if (e.target.value) handleCopyFromDate(e.target.value);
                      }}
                      disabled={copyLoading}
                      className="flex-1 min-w-0 rounded border border-leather/30 px-2 py-1.5 text-sm text-ink focus:border-rust focus:outline-none disabled:opacity-50"
                    />
                    <button
                      onClick={() => {
                        setShowCopyPicker(false);
                        setCopyError("");
                      }}
                      className="rounded px-3 py-1.5 text-xs sm:text-sm text-ink/60 hover:bg-aged/50 flex-shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                  {copyLoading && (
                    <p className="text-xs text-ink/50">Loading workout…</p>
                  )}
                  {copyError && (
                    <p className="text-xs text-red-600">{copyError}</p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowCopyPicker(true)}
                  className="text-xs sm:text-sm text-rust hover:underline"
                >
                  Copy from another day
                </button>
              )}
            </div>

            {/* Surprise me */}
            <div className="mb-4 sm:mb-6">
              <button
                onClick={() => setShowSurpriseModal(true)}
                className="text-xs sm:text-sm text-rust hover:underline"
              >
                Surprise me
              </button>
            </div>

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

      {/* Surprise me modal */}
      {showSurpriseModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="relative w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-lg bg-white border-2 border-leather/40 p-4 sm:p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-ink">
                Surprise me
              </h3>
              <button
                onClick={() => {
                  setShowSurpriseModal(false);
                  setSurpriseInput("");
                  setSurpriseError("");
                }}
                className="text-ink/50 hover:text-ink text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-ink/60 mb-3">
              Describe the workout you want — e.g. &quot;upper body focus&quot;, &quot;leg day&quot;, &quot;quick abs&quot;, &quot;full body with cardio&quot;. AI will design a ~30 min workout using dumbbells, barbell, squat rack, and ab equipment.
            </p>
            <textarea
              value={surpriseInput}
              onChange={(e) => setSurpriseInput(e.target.value)}
              placeholder="e.g. Upper body and abs, or Leave blank for a general full-body workout"
              className="w-full rounded border border-leather/30 px-3 py-2 text-sm text-ink placeholder:text-ink/40 resize-none mb-4"
              rows={3}
            />
            {surpriseError && (
              <p className="text-sm text-red-600 mb-3">{surpriseError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSurpriseMe}
                disabled={surpriseLoading}
                className="rounded bg-rust px-4 py-2 text-sm font-medium text-white hover:bg-rust/90 disabled:opacity-50"
              >
                {surpriseLoading ? "Generating…" : "Generate workout"}
              </button>
              <button
                onClick={() => {
                  setShowSurpriseModal(false);
                  setSurpriseInput("");
                  setSurpriseError("");
                }}
                className="rounded px-4 py-2 text-sm text-ink/60 hover:bg-aged/50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
