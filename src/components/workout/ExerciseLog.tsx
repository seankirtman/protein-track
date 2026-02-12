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
}

export function ExerciseLog({
  exercise,
  onUpdate,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onRemove,
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
    <div className={`rounded border p-4 journal-lines ${exercise.completed ? "border-green-400/50 bg-green-50/40" : "border-leather/30 bg-white/60"}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={exercise.completed ?? false}
            onChange={(e) => onUpdate({ completed: e.target.checked })}
            className="h-4 w-4 rounded border-leather/40 text-green-600 accent-green-600"
            title="Mark as completed"
          />
          {editingName ? (
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => e.key === "Enter" && handleNameBlur()}
              className="flex-1 rounded border border-leather/30 px-2 py-1 font-heading text-lg text-ink"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className={`font-heading text-lg font-bold hover:text-rust ${exercise.completed ? "text-ink/50 line-through" : "text-ink"}`}
            >
              {exercise.name}
            </button>
          )}
          {isCardio && (
            <span className="rounded bg-rust/10 px-2 py-0.5 text-xs font-medium text-rust">
              cardio
            </span>
          )}
        </div>
        <button
          onClick={onRemove}
          className="text-ink/50 hover:text-red-600 text-sm"
          aria-label="Remove exercise"
        >
          ×
        </button>
      </div>
      <div className="space-y-2">
        {isCardio ? (
          <>
            <div className="flex gap-4 text-xs text-ink/60 font-mono mb-2">
              <span className="w-12">#</span>
              <span className="w-20">Miles</span>
              <span className="w-20">Minutes</span>
            </div>
            {exercise.sets.map((set, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="font-mono text-sm w-12 text-ink/70">{i + 1}</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={set.distance || ""}
                  onChange={(e) =>
                    onUpdateSet(i, { distance: parseFloat(e.target.value) || 0 })
                  }
                  className="w-20 rounded border border-leather/30 px-2 py-1 font-mono text-sm text-ink"
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
                  className="w-20 rounded border border-leather/30 px-2 py-1 font-mono text-sm text-ink"
                  placeholder="0"
                />
                {exercise.sets.length > 1 && (
                  <button
                    onClick={() => onRemoveSet(i)}
                    className="text-ink/50 hover:text-red-600 text-sm"
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
            <div className="flex gap-4 text-xs text-ink/60 font-mono mb-2">
              <span className="w-12">Set</span>
              <span className="w-16">Reps</span>
              <span className="w-16">Lbs</span>
            </div>
            {exercise.sets.map((set, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="font-mono text-sm w-12 text-ink/70">{i + 1}</span>
                <input
                  type="number"
                  min={0}
                  value={set.reps || ""}
                  onChange={(e) =>
                    onUpdateSet(i, { reps: parseInt(e.target.value) || 0 })
                  }
                  className="w-16 rounded border border-leather/30 px-2 py-1 font-mono text-sm text-ink"
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
                  className="w-16 rounded border border-leather/30 px-2 py-1 font-mono text-sm text-ink"
                  placeholder="0"
                />
                {exercise.sets.length > 1 && (
                  <button
                    onClick={() => onRemoveSet(i)}
                    className="text-ink/50 hover:text-red-600 text-sm"
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
