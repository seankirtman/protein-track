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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState("");
  const [userInput, setUserInput] = useState("");

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
      setUserInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    const text = userInput.trim();
    if (!text || loading) return;
    fetchRecommendations(text);
  };

  const handleClose = () => {
    setOpen(false);
    setRecommendations([]);
    setUserInput("");
    setError("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-6 w-full rounded-lg border-2 border-dashed border-leather/30 px-4 py-4 text-left hover:border-rust/40 transition-colors"
      >
        <span className="font-heading font-bold text-rust">Get Meal Recommendations</span>
        <br />
        <span className="text-xs text-ink/50">
          AI-powered meal suggestions to hit your protein goal
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="relative w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-lg bg-paper p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-ink">
                Meal Recommendations
              </h3>
              <button
                onClick={handleClose}
                className="text-ink/50 hover:text-ink text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Initial state — no recommendations yet */}
            {recommendations.length === 0 && !loading && (
              <div className="space-y-3">
                <p className="text-sm text-ink/60 mb-4">
                  Tell us what you&apos;re working with, or let AI suggest meals based on your day.
                </p>

                {/* Free-form input */}
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type ingredients, dietary preferences, or ask anything...&#10;e.g. &quot;I have chicken, rice, and broccoli&quot; or &quot;high protein vegetarian meals&quot;"
                  className="w-full rounded border border-leather/30 px-3 py-2 text-sm text-ink placeholder:text-ink/40 resize-none"
                  rows={3}
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleSend}
                    disabled={loading || !userInput.trim()}
                    className="rounded bg-rust px-4 py-2 text-sm font-medium text-white hover:bg-rust/90 disabled:opacity-50"
                  >
                    Find Meals
                  </button>
                  <button
                    onClick={() => fetchRecommendations()}
                    disabled={loading}
                    className="rounded border border-rust px-4 py-2 text-sm font-medium text-rust hover:bg-rust/10 disabled:opacity-50"
                  >
                    Inspire me from my foods
                  </button>
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="py-8 text-center text-ink/50">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-rust border-t-transparent mb-2" />
                <p className="text-sm">Finding meal ideas…</p>
              </div>
            )}

            {/* Recommendations list */}
            {recommendations.length > 0 && !loading && (
              <div className="space-y-4">
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

                {/* Follow-up input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask about #2, swap ingredients, add constraints..."
                    className="flex-1 rounded border border-leather/30 px-3 py-2 text-sm text-ink"
                    disabled={loading}
                  />
                  <button
                    onClick={handleSend}
                    disabled={loading || !userInput.trim()}
                    className="rounded bg-rust/20 px-3 py-2 text-sm text-rust hover:bg-rust/30 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => fetchRecommendations()}
                    disabled={loading}
                    className="text-sm text-ink/60 hover:underline disabled:opacity-50"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={() => {
                      setRecommendations([]);
                      setUserInput("");
                    }}
                    className="text-sm text-ink/60 hover:underline"
                  >
                    Start over
                  </button>
                </div>
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
