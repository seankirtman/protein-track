"use client";

interface ShortfallAlertProps {
  eatenProtein: number;
  plannedProtein: number;
  proteinGoal: number;
}

export function ShortfallAlert({ eatenProtein, plannedProtein, proteinGoal }: ShortfallAlertProps) {
  const hour = new Date().getHours();
  const eatenPct = proteinGoal > 0 ? (eatenProtein / proteinGoal) * 100 : 0;
  const planMeetsGoal = plannedProtein >= proteinGoal;
  const allEaten = eatenProtein >= proteinGoal;

  // If everything is eaten and goal is met, show nothing
  if (allEaten) return null;

  // Plan meets goal — green success message
  if (planMeetsGoal) {
    const remaining = Math.max(0, plannedProtein - eatenProtein);
    return (
      <div className="rounded-lg border-2 border-green-400/50 bg-green-50 px-4 py-3 text-ink">
        <p className="font-medium text-green-700">
          Plan is on track
        </p>
        <p className="mt-1 text-sm text-ink/80">
          You&apos;ve eaten <span className="font-mono font-bold">{eatenProtein}g</span> with{" "}
          <span className="font-mono font-bold">{remaining}g</span> still planned.
          Eat your remaining meals to hit your goal.
        </p>
      </div>
    );
  }

  // Behind checks (only show warning when behind schedule)
  const behindAtNoon = hour >= 12 && eatenPct < 40;
  const behindAtEvening = hour >= 18 && eatenPct < 70;

  if (!behindAtNoon && !behindAtEvening) return null;

  const remainingFromGoal = Math.max(0, proteinGoal - eatenProtein);
  const plannedNotEaten = Math.max(0, plannedProtein - eatenProtein);
  const gap = Math.max(0, remainingFromGoal - plannedNotEaten);

  return (
    <div className="rounded-lg border-2 border-rust/50 bg-rust/10 px-4 py-3 text-ink">
      <p className="font-medium text-rust">
        You&apos;re behind on protein
      </p>
      <p className="mt-1 text-sm text-ink/80">
        {eatenProtein}g eaten of {proteinGoal}g goal.
        {plannedNotEaten > 0 ? (
          gap > 0 ? (
            <> {plannedNotEaten}g planned, still <span className="font-mono font-bold text-rust">{gap}g short</span>.</>
          ) : (
            <> {plannedNotEaten}g planned — eat up to stay on track.</>
          )
        ) : (
          <> Plan some high-protein meals.</>
        )}
      </p>
    </div>
  );
}
