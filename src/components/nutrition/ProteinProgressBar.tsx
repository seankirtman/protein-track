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
    size === "sm" ? "h-2" : size === "lg" ? "h-3" : "h-2.5";

  return (
    <div className="w-full">
      <div className="flex items-end justify-between mb-1.5">
        <span className="text-xs font-medium text-ink/50 uppercase tracking-wider">Protein</span>
        <div className="font-mono text-xs text-ink/70">
          <span className={`font-bold ${goalMet ? "text-green-600" : "text-rust"}`}>{eaten}g</span>
          <span className="mx-1 text-ink/30">/</span>
          <span className="text-ink/60">{goal}g</span>
        </div>
      </div>
      <div
        className={`${sizeClass} relative w-full overflow-hidden rounded-full bg-aged/50`}
      >
        {/* Planned bar (lighter, behind) */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${goalMet ? "bg-green-500/30" : "bg-rust/25"}`}
          style={{ width: `${plannedPct}%` }}
        />
        {/* Eaten bar (solid, in front) */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${goalMet ? "bg-green-500" : "bg-rust"}`}
          style={{ width: `${eatenPct}%` }}
        />
      </div>
      <div className="mt-1 text-right text-[10px] text-ink/40">
        {goalMet ? "Goal hit!" : `${goal - eaten}g remaining`}
      </div>
    </div>
  );
}
