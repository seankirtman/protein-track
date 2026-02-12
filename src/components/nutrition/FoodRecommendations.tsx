"use client";

import { useState } from "react";

interface Recommendation {
  name: string;
  description: string;
  estimatedProtein: number;
}

interface FoodRecommendationsProps {
  foodsEaten: string[];
  proteinGoal: number;
  proteinCurrent: number;
  onSelect: (name: string, protein: number) => void;
}

export function FoodRecommendations({
  foodsEaten,
  proteinGoal,
  proteinCurrent,
  onSelect,
}: FoodRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchRecommendations = async (followUp?: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodsEaten,
          proteinGoal,
          proteinCurrent,
          currentRecommendations: recommendations.length > 0 ? recommendations : undefined,
          followUp: followUp || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRecommendations(data.recommendations ?? []);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    const text = message.trim();
    if (!text || loading) return;
    fetchRecommendations(text);
  };

  if (recommendations.length > 0) {
    return (
      <div className="mt-6 rounded border border-leather/30 bg-white/60 p-4">
        <h3 className="font-heading font-bold text-ink mb-3">
          High-protein suggestions
        </h3>
        <div className="space-y-2">
          {recommendations.map((r, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded border border-leather/20 px-3 py-2"
            >
              <span className="mt-0.5 flex-shrink-0 font-mono text-xs text-ink/40 w-5 text-right">
                {i + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink">{r.name}</p>
                <p className="text-xs text-ink/70">{r.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-sm text-rust">
                  +{r.estimatedProtein}g
                </span>
                <button
                  onClick={() => {
                    onSelect(r.name, r.estimatedProtein);
                    setRecommendations((prev) => prev.filter((_, j) => j !== i));
                  }}
                  className="rounded bg-rust/20 px-2 py-1 text-sm text-rust hover:bg-rust/30"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about #2, add constraints, swap ingredients..."
            className="flex-1 rounded border border-leather/30 px-3 py-2 text-sm text-ink"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className="rounded bg-rust/20 px-3 py-2 text-sm text-rust hover:bg-rust/30 disabled:opacity-50"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
        <div className="mt-2 flex gap-3">
          <button
            onClick={() => fetchRecommendations()}
            disabled={loading}
            className="text-sm text-ink/60 hover:underline disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            onClick={() => {
              setRecommendations([]);
              setMessage("");
            }}
            className="text-sm text-ink/60 hover:underline"
          >
            Close
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => fetchRecommendations()}
        disabled={loading}
        className="text-left text-sm text-rust hover:underline disabled:opacity-50"
      >
        {loading ? "Getting suggestions…" : (
          <>
            <span className="font-medium">Get Meal Recommendations</span>
            <br />
            <span className="text-xs text-ink/50">
              Utilizes ingredients used during the day and similar for recommended meals to fill gaps. Ask AI for preparation tips.
            </span>
          </>
        )}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
