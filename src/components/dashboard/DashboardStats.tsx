"use client";

import { useEffect, useState } from "react";
import { getNutritionDay, getWorkout } from "@/lib/database";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

type ExerciseStatus = "loading" | "not_yet" | "in_progress" | "completed";

interface DashboardStatsProps {
  userId: string;
  proteinGoal: number;
  calorieGoal?: number;
}

export function DashboardStats({ userId, proteinGoal, calorieGoal }: DashboardStatsProps) {
  const [proteinCurrent, setProteinCurrent] = useState<number | null>(null);
  const [caloriesCurrent, setCaloriesCurrent] = useState<number | null>(null);
  const [exerciseStatus, setExerciseStatus] = useState<ExerciseStatus>("loading");

  useEffect(() => {
    const today = dateKey(new Date());
    Promise.all([
      getNutritionDay(userId, today),
      getWorkout(userId, today),
    ])
      .then(([nutrition, workout]) => {
        setProteinCurrent(nutrition?.totalProtein ?? 0);
        // Sum calories from eaten food entries
        const eatenCals = nutrition?.foods
          ?.filter((f) => f.eaten)
          .reduce((s, f) => s + (f.calories ?? 0), 0) ?? 0;
        setCaloriesCurrent(eatenCals);
        const exercises = workout?.exercises ?? [];
        if (exercises.length === 0) {
          setExerciseStatus("not_yet");
        } else if (exercises.every((ex) => ex.completed)) {
          setExerciseStatus("completed");
        } else {
          setExerciseStatus("in_progress");
        }
      })
      .catch(() => {
        setProteinCurrent(0);
        setCaloriesCurrent(0);
        setExerciseStatus("not_yet");
      });
  }, [userId]);

  const exerciseLabel =
    exerciseStatus === "loading"
      ? "—"
      : exerciseStatus === "not_yet"
      ? "Not Yet"
      : exerciseStatus === "in_progress"
      ? "In Progress"
      : "Completed";

  const exerciseColor =
    exerciseStatus === "not_yet"
      ? "text-red-600"
      : exerciseStatus === "in_progress"
      ? "text-blue-600"
      : exerciseStatus === "completed"
      ? "text-green-600"
      : "text-ink";

  const proteinMet = proteinCurrent !== null && proteinCurrent >= proteinGoal;
  const proteinColor = proteinCurrent === null ? "text-ink" : proteinMet ? "text-green-600" : "text-red-600";

  const calorieMet = calorieGoal && caloriesCurrent !== null && caloriesCurrent >= calorieGoal;
  const calorieColor = caloriesCurrent === null ? "text-ink" : calorieMet ? "text-green-600" : "text-ink/80";

  return (
    <div className="grid grid-cols-3 gap-4 text-sm">
      <div>
        <span className="text-ink/60">Exercise Today</span>
        <p className={`font-mono text-lg font-bold ${exerciseColor}`}>
          {exerciseLabel}
        </p>
      </div>
      <div>
        <span className="text-ink/60">Protein</span>
        <p className="font-mono text-lg font-bold">
          <span className={proteinColor}>
            {proteinCurrent !== null ? `${proteinCurrent}g` : "—"}
          </span>
          <span className="text-sm font-normal text-ink/50">
            {" "}/ {proteinGoal}g
          </span>
        </p>
      </div>
      <div>
        <span className="text-ink/60">Calories</span>
        <p className="font-mono text-lg font-bold">
          <span className={calorieColor}>
            {caloriesCurrent !== null ? caloriesCurrent.toLocaleString() : "—"}
          </span>
          {calorieGoal ? (
            <span className="text-sm font-normal text-ink/50">
              {" "}/ {calorieGoal.toLocaleString()}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
