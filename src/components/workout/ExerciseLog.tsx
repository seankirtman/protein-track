"use client";

import { useState } from "react";
import type { Exercise, Set } from "@/types";

interface ExerciseLogProps {
  exercise: Exercise;
  onUpdate: (updates: Partial<Exercise>) => void;
  onUpdateSet: (setIndex: number, updates: Partial<Set>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onRemove: () => void;
  onInfoClick?: (exerciseName: string) => void;
}

export function ExerciseLog({
  exercise,
  onUpdate,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onRemove,
  onInfoClick,
}: ExerciseLogProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(exercise.name);

  const isCardio = exercise.type === "cardio";

  const handleNameBlur = () => {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== exercise.name) {
      onUpdate({ name: trimmed });
    } else {
      setNameValue(exercise.name);
    }
  };

  return (
    <div className={`rounded border p-3 sm:p-4 journal-lines ${exercise.completed ? "border-green-400/50 bg-green-50/40" : "border-leather/30 bg-white/60"}`}>
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="checkbox"
            checked={exercise.completed ?? false}
            onChange={(e) => onUpdate({ completed: e.target.checked })}
            className="h-4 w-4 flex-shrink-0 rounded border-leather/40 text-green-600 accent-green-600"
            title="Mark as completed"
          />
          {editingName ? (
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => e.key === "Enter" && handleNameBlur()}
              className="flex-1 min-w-0 rounded border border-leather/30 px-2 py-1 font-heading text-base sm:text-lg text-ink"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className={`font-heading text-base sm:text-lg font-bold hover:text-rust truncate ${exercise.completed ? "text-ink/50 line-through" : "text-ink"}`}
            >
              {exercise.name}
            </button>
          )}
          {isCardio && (
            <span className="rounded bg-rust/10 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium text-rust flex-shrink-0">
              cardio
            </span>
          )}
          {onInfoClick && (
            <button
              onClick={() => onInfoClick(exercise.name)}
              className="flex-shrink-0 rounded-full p-1 text-ink/40 hover:bg-rust/10 hover:text-rust transition-colors"
              title={`How to do ${exercise.name}`}
              aria-label={`Info: how to do ${exercise.name}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={onRemove}
          className="text-ink/50 hover:text-red-600 text-sm flex-shrink-0"
          aria-label="Remove exercise"
        >
          ×
        </button>
      </div>
      <div className="space-y-2">
        {isCardio ? (
          <>
            <div className="flex gap-2 sm:gap-4 text-xs text-ink/60 font-mono mb-2">
              <span className="w-8 sm:w-12">#</span>
              <span className="flex-1">Miles</span>
              <span className="flex-1">Minutes</span>
              {exercise.sets.length > 1 && <span className="w-5" />}
            </div>
            {exercise.sets.map((set, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-4">
                <span className="font-mono text-sm w-8 sm:w-12 text-ink/70">{i + 1}</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={set.distance || ""}
                  onChange={(e) =>
                    onUpdateSet(i, { distance: parseFloat(e.target.value) || 0 })
                  }
                  className="flex-1 min-w-0 rounded border border-leather/30 px-2 py-1 font-mono text-sm text-ink"
                  placeholder="0"
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={set.time || ""}
                  onChange={(e) =>
                    onUpdateSet(i, { time: parseFloat(e.target.value) || 0 })
                  }
                  className="flex-1 min-w-0 rounded border border-leather/30 px-2 py-1 font-mono text-sm text-ink"
                  placeholder="0"
                />
                {exercise.sets.length > 1 && (
                  <button
                    onClick={() => onRemoveSet(i)}
                    className="text-ink/50 hover:text-red-600 text-sm flex-shrink-0"
                    aria-label="Remove entry"
                  >
                    −
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={onAddSet}
              className="mt-2 text-sm text-rust hover:underline"
            >
              + Add entry
            </button>
          </>
        ) : (
          <>
            <div className="flex gap-2 sm:gap-4 text-xs text-ink/60 font-mono mb-2">
              <span className="w-8 sm:w-12">Set</span>
              <span className="flex-1">Reps</span>
              <span className="flex-1">Lbs</span>
              {exercise.sets.length > 1 && <span className="w-5" />}
            </div>
            {exercise.sets.map((set, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-4">
                <span className="font-mono text-sm w-8 sm:w-12 text-ink/70">{i + 1}</span>
                <input
                  type="number"
                  min={0}
                  value={set.reps || ""}
                  onChange={(e) =>
                    onUpdateSet(i, { reps: parseInt(e.target.value) || 0 })
                  }
                  className="flex-1 min-w-0 rounded border border-leather/30 px-2 py-1 font-mono text-sm text-ink"
                  placeholder="0"
                />
                <input
                  type="number"
                  min={0}
                  step={2.5}
                  value={set.weight || ""}
                  onChange={(e) =>
                    onUpdateSet(i, { weight: parseFloat(e.target.value) || 0 })
                  }
                  className="flex-1 min-w-0 rounded border border-leather/30 px-2 py-1 font-mono text-sm text-ink"
                  placeholder="0"
                />
                {exercise.sets.length > 1 && (
                  <button
                    onClick={() => onRemoveSet(i)}
                    className="text-ink/50 hover:text-red-600 text-sm flex-shrink-0"
                    aria-label="Remove set"
                  >
                    −
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={onAddSet}
              className="mt-2 text-sm text-rust hover:underline"
            >
              + Add set
            </button>
          </>
        )}
      </div>
    </div>
  );
}
