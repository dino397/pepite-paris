import { useState } from "react";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import ActivityList from "@/components/ActivityList";
import MapPage from "@/components/MapPage";
import { useActivities } from "@/hooks/useActivities";
import type { Category } from "@/types/activity";

export default function Index() {
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [view, setView] = useState<"list" | "map">("list");

  const { activities, loading } = useActivities(
    selectedCategories.length > 0 ? selectedCategories : undefined
  );

  const toggleCategory = (cat: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <FilterBar
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        view={view}
        onViewChange={setView}
        count={activities.length}
      />
      {view === "list" ? (
        <ActivityList activities={activities} loading={loading} />
      ) : (
        <MapPage activities={activities} />
      )}
    </div>
  );
}
