"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Common exercises as fallback when user has no history
const COMMON_EXERCISES = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Overhead Press",
  "Barbell Row",
  "Pull-up",
  "Chin-up",
  "Dumbbell Curl",
  "Tricep Pushdown",
  "Lateral Raise",
  "Leg Press",
  "Romanian Deadlift",
  "Incline Bench Press",
  "Cable Fly",
  "Lat Pulldown",
  "Seated Row",
  "Leg Curl",
  "Leg Extension",
  "Calf Raise",
  "Face Pull",
  "Dumbbell Press",
  "Hammer Curl",
  "Skull Crusher",
  "Hip Thrust",
  "Lunge",
  "Bulgarian Split Squat",
  "Front Squat",
  "Dip",
  "Push-up",
  "Plank",
  "Run",
  "Cycling",
  "Swimming",
  "Rowing",
  "Elliptical",
  "Stair Climber",
  "Jump Rope",
  "Walking",
  "Hiking",
  "Sprints",
];

interface ExerciseSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (name: string) => void;
  exerciseHistory: string[];
}

export function ExerciseSearch({
  value,
  onChange,
  onSubmit,
  exerciseHistory,
}: ExerciseSearchProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Merge user history with common exercises, deduped, history first
  const allExercises = useCallback(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const name of exerciseHistory) {
      const lower = name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(name);
      }
    }
    for (const name of COMMON_EXERCISES) {
      const lower = name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(name);
      }
    }
    return result;
  }, [exerciseHistory]);

  const query = value.trim().toLowerCase();
  const suggestions =
    query.length === 0
      ? exerciseHistory.length > 0
        ? exerciseHistory.slice(0, 8)
        : []
      : allExercises()
          .filter((name) => name.toLowerCase().includes(query))
          .slice(0, 8);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
    setHighlightIndex(-1);
    onSubmit(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setOpen(true);
        setHighlightIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => {
          if (value.trim() || exerciseHistory.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Add exercise (e.g. Bench Press)"
        className="w-full rounded border border-leather/30 px-3 py-2 text-ink"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded border border-leather/30 bg-white shadow-lg">
          {suggestions.map((name, i) => (
            <li key={name}>
              <button
                type="button"
                onMouseDown={() => handleSelect(name)}
                onMouseEnter={() => setHighlightIndex(i)}
                className={`w-full px-3 py-2 text-left text-sm ${
                  i === highlightIndex
                    ? "bg-rust/10 text-rust"
                    : "text-ink hover:bg-aged/30"
                }`}
              >
                {exerciseHistory.includes(name) && (
                  <span className="mr-1 text-xs text-leather">recent</span>
                )}
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
