"use client";

interface CalorieTrackerProps {
  eaten: number;
  goal: number;
  planned?: number;
}

export function CalorieTracker({ eaten, goal, planned = 0 }: CalorieTrackerProps) {
  const eatenPct = Math.min(100, goal > 0 ? (eaten / goal) * 100 : 0);
  const plannedPct = Math.min(100, goal > 0 ? (planned / goal) * 100 : 0);
  const isOver = eaten > goal;
  const goalMet = eaten >= goal;
  const withinTarget = goal > 0 && eaten >= goal * 0.8 && eaten <= goal * 1.2;
  const calorieColor = isOver ? "text-red-600" : withinTarget ? "text-green-600" : "text-rust";

  return (
    <div className="mt-4">
      <div className="flex items-end justify-between mb-1.5">
        <span className="text-xs font-medium text-ink/50 uppercase tracking-wider">Calories</span>
        <div className="font-mono text-xs text-ink/70">
          <span className={`font-bold ${calorieColor}`}>
            {eaten.toLocaleString()}
          </span>
          <span className="mx-1 text-ink/30">/</span>
          <span className="text-ink/60">{goal.toLocaleString()}</span>
        </div>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-aged/50">
        {/* Planned (ghost) bar */}
        {planned > eaten && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-rust/25 transition-all duration-500"
            style={{ width: `${plannedPct}%` }}
          />
        )}

        {/* Eaten bar */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
            isOver ? "bg-red-400" : withinTarget ? "bg-green-500" : "bg-rust"
          }`}
          style={{ width: `${eatenPct}%` }}
        />
      </div>

      <div className="mt-1 text-right text-[10px] text-ink/40">
        {eaten > goal
          ? `${(eaten - goal).toLocaleString()} over`
          : goalMet
          ? "Goal hit!"
          : `${(goal - eaten).toLocaleString()} remaining`}
      </div>
    </div>
  );
}
