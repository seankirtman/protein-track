"use client";

interface ProteinProgressBarProps {
  current: number;
  eaten: number;
  goal: number;
  size?: "sm" | "md" | "lg";
}

export function ProteinProgressBar({
  current,
  eaten,
  goal,
  size = "md",
}: ProteinProgressBarProps) {
  const plannedPct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const eatenPct = goal > 0 ? Math.min(100, (eaten / goal) * 100) : 0;
  const goalMet = eaten >= goal;
  const sizeClass =
    size === "sm" ? "h-3" : size === "lg" ? "h-6" : "h-4";

  return (
    <div className="w-full">
      <div
        className={`${sizeClass} relative w-full overflow-hidden rounded-full bg-aged`}
      >
        {/* Planned bar (lighter, behind) */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${goalMet ? "bg-green-500/30" : "bg-rust/30"}`}
          style={{ width: `${plannedPct}%` }}
        />
        {/* Eaten bar (solid, in front) */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${goalMet ? "bg-green-500" : "bg-rust"}`}
          style={{ width: `${eatenPct}%` }}
        />
      </div>
      <div className="mt-1 flex items-center gap-3 font-mono text-sm">
        <span className="text-ink">
          <span className={`font-bold ${goalMet ? "text-green-600" : "text-rust"}`}>{eaten}g</span> eaten
        </span>
        {current > eaten && (
          <span className="text-ink/50">
            + {current - eaten}g planned
          </span>
        )}
        <span className="text-ink/40">/ {goal}g goal</span>
        {goalMet && <span className="text-green-600 text-xs font-bold">Goal hit!</span>}
      </div>
    </div>
  );
}
