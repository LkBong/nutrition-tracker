"use client";

import { useState } from "react";
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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;

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
  );
}
