import { Map as MapIcon, List } from "lucide-react";
import { CATEGORIES, type Category } from "@/types/activity";

interface FilterBarProps {
  selectedCategories: Category[];
  onToggleCategory: (cat: Category) => void;
  view: "list" | "map";
  onViewChange: (view: "list" | "map") => void;
  count: number;
}

export default function FilterBar({ selectedCategories, onToggleCategory, view, onViewChange, count }: FilterBarProps) {
  return (
    <div className="sticky top-0 z-30 px-4 py-3" style={{ background: "hsl(42 38% 96% / 0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid hsl(38 22% 84% / 0.5)" }}>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => {
          const active = selectedCategories.length === 0 || selectedCategories.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => onToggleCategory(cat.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: active ? "hsl(40 35% 99%)" : "transparent",
                border: `1px solid ${active ? "hsl(38 22% 78%)" : "hsl(38 22% 88%)"}`,
                color: active ? "hsl(30 25% 30%)" : "hsl(30 15% 60%)",
                fontFamily: "'Nunito', sans-serif",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          );
        })}

        <div className="flex-1" />

        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={() => onViewChange("list")}
            className="p-2 rounded-xl transition-all"
            style={{
              background: view === "list" ? "hsl(40 35% 99%)" : "transparent",
              border: `1px solid ${view === "list" ? "hsl(38 22% 78%)" : "transparent"}`,
              color: view === "list" ? "hsl(30 25% 30%)" : "hsl(30 15% 60%)",
            }}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewChange("map")}
            className="p-2 rounded-xl transition-all"
            style={{
              background: view === "map" ? "hsl(40 35% 99%)" : "transparent",
              border: `1px solid ${view === "map" ? "hsl(38 22% 78%)" : "transparent"}`,
              color: view === "map" ? "hsl(30 25% 30%)" : "hsl(30 15% 60%)",
            }}
          >
            <MapIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground/50 mt-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
        {count} activité{count > 1 ? "s" : ""} cette semaine
      </p>
    </div>
  );
}
