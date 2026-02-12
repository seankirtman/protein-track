"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const COMMON_FOODS = [
  "Chicken Breast",
  "Ground Turkey",
  "Salmon",
  "Tuna",
  "Eggs",
  "Greek Yogurt",
  "Cottage Cheese",
  "Whey Protein Shake",
  "Steak",
  "Ground Beef",
  "Pork Chop",
  "Tilapia",
  "Shrimp",
  "Tofu",
  "Lentils",
  "Black Beans",
  "Chickpeas",
  "Oatmeal",
  "Rice",
  "Pasta",
  "Bread",
  "Milk",
  "Cheese",
  "Almonds",
  "Peanut Butter",
  "Banana",
  "Apple",
  "Broccoli",
  "Sweet Potato",
  "Avocado",
  "Protein Bar",
];

interface FoodSearchProps {
  value: string;
  onChange: (value: string) => void;
  foodHistory: string[];
  placeholder?: string;
}

export function FoodSearch({
  value,
  onChange,
  foodHistory,
  placeholder = "Food name",
}: FoodSearchProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const allFoods = useCallback(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const name of foodHistory) {
      const lower = name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(name);
      }
    }
    for (const name of COMMON_FOODS) {
      const lower = name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(name);
      }
    }
    return result;
  }, [foodHistory]);

  const query = value.trim().toLowerCase();
  const suggestions =
    query.length === 0
      ? foodHistory.length > 0
        ? foodHistory.slice(0, 8)
        : []
      : allFoods()
          .filter((name) => name.toLowerCase().includes(query))
          .slice(0, 8);

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
    <div ref={wrapperRef} className="relative flex-1 min-w-[140px]">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => {
          if (value.trim() || foodHistory.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
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
                {foodHistory.includes(name) && (
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
