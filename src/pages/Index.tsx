import { useState } from "react";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import EventList from "@/components/EventList";
import EventMap from "@/components/EventMap";
import { useParisEvents } from "@/hooks/useParisEvents";
import type { Category } from "@/types/event";

export default function Index() {
  const [category, setCategory] = useState<Category>("all");
  const [view, setView] = useState<"list" | "map">("list");
  const { events, loading, error } = useParisEvents(category);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <FilterBar
        category={category}
        onCategoryChange={setCategory}
        view={view}
        onViewChange={setView}
        count={events.length}
      />
      {view === "list" ? (
        <EventList events={events} loading={loading} error={error} />
      ) : (
        <EventMap events={events} />
      )}
    </div>
  );
}
