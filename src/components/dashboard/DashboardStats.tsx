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
}

export function DashboardStats({ userId, proteinGoal }: DashboardStatsProps) {
  const [proteinCurrent, setProteinCurrent] = useState<number | null>(null);
  const [exerciseStatus, setExerciseStatus] = useState<ExerciseStatus>("loading");

  useEffect(() => {
    const today = dateKey(new Date());
    Promise.all([
      getNutritionDay(userId, today),
      getWorkout(userId, today),
    ])
      .then(([nutrition, workout]) => {
        setProteinCurrent(nutrition?.totalProtein ?? 0);
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

  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span className="text-ink/60">Exercise Today</span>
        <p className={`font-mono text-lg font-bold ${exerciseColor}`}>
          {exerciseLabel}
        </p>
      </div>
      <div>
        <span className="text-ink/60">Protein Consumed</span>
        <p className="font-mono text-lg font-bold">
          <span className={proteinColor}>
            {proteinCurrent !== null ? `${proteinCurrent}g` : "—"}
          </span>
          <span className="text-sm font-normal text-ink/50">
            {" "}/ {proteinGoal}g
          </span>
        </p>
      </div>
    </div>
  );
}
