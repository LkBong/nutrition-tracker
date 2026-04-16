"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FoodResultCard, { type FoodItem } from "./FoodResultCard";

interface Props {
  onFoodSelected: (food: FoodItem) => void;
}

export default function FoodSearchBar({ onFoodSelected }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data);
      if (data.length === 0) toast.info("No results found. Try a different description.");
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder='e.g. "2 eggs and toast"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
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

      {searched && results.length > 0 && (
        <div className="space-y-2">
          {results.map((food) => (
            <FoodResultCard key={food.id ?? food.name} food={food} onSelect={onFoodSelected} />
          ))}
        </div>
      )}
    </div>
  );
}
