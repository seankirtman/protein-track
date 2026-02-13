"use client";

interface CalorieTrackerProps {
  eaten: number;
  goal: number;
  planned?: number;
}

export function CalorieTracker({ eaten, goal, planned = 0 }: CalorieTrackerProps) {
  const eatenPct = Math.min(100, (eaten / goal) * 100);
  const plannedPct = Math.min(100, (planned / goal) * 100);
  
  return (
    <div className="mt-4">
      <div className="flex items-end justify-between mb-1.5">
        <span className="text-xs font-medium text-ink/50 uppercase tracking-wider">Calories</span>
        <div className="font-mono text-xs text-ink/70">
          <span className="font-bold text-ink">{eaten.toLocaleString()}</span>
          <span className="mx-1 text-ink/30">/</span>
          {goal.toLocaleString()}
        </div>
      </div>
      
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-aged/30">
        {/* Planned (ghost) bar */}
        {planned > eaten && (
          <div 
            className="absolute inset-y-0 left-0 bg-ink/10"
            style={{ width: `${plannedPct}%` }}
          />
        )}
        
        {/* Eaten bar */}
        <div 
          className={`absolute inset-y-0 left-0 transition-all duration-500 ${
            eaten > goal ? "bg-red-400" : "bg-ink/60"
          }`}
          style={{ width: `${eatenPct}%` }}
        />
      </div>
      
      {/* Optional: Show remaining or surplus */}
      <div className="mt-1 text-right text-[10px] text-ink/40">
        {eaten > goal 
          ? `${(eaten - goal).toLocaleString()} over`
          : `${(goal - eaten).toLocaleString()} remaining`
        }
      </div>
    </div>
  );
}
