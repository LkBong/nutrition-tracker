"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { FoodItem } from "./FoodResultCard";

interface Props {
  onFoodsFound: (foods: FoodItem[]) => void;
}

export default function FoodSearchBar({ onFoodsFound }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<FoodItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/food/suggestions?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data: FoodItem[] = await res.json();
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
        }
      } catch {
        // suggestions are best-effort; ignore errors
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function pickSuggestion(food: FoodItem) {
    setShowSuggestions(false);
    setQuery("");
    onFoodsFound([food]);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setShowSuggestions(false);

    setLoading(true);
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      if (data.length === 0) {
        toast.info("No results found. Try a different description.");
      } else {
        onFoodsFound(data);
      }
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder='e.g. "2 eggs and toast"'
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          className="flex-1"
          autoComplete="off"
        />
        <Button
          type="submit"
          disabled={loading || query.trim().length < 2}
          variant="outline"
          size="icon"
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <li className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Previously logged
          </li>
          {suggestions.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(food)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between gap-2"
              >
                <span className="truncate capitalize">{food.name}</span>
                {food.calories_kcal != null && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {Math.round(food.calories_kcal)} kcal/100g
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
