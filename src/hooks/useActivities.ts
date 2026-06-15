import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Activity, Category } from "@/types/activity";

function getCurrentWeekKey(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

async function fetchActivities(): Promise<Activity[]> {
  const { data: latestRun } = await supabase
    .from("scraped_activities")
    .select("week_key")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const weekKey = latestRun?.week_key ?? getCurrentWeekKey();

  const { data, error } = await supabase
    .from("scraped_activities")
    .select("*")
    .eq("week_key", weekKey)
    .order("is_exceptional", { ascending: false })
    .order("category")
    .order("title");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    category: (["cinema", "theatre", "expo", "activite"].includes(row.category ?? "")
      ? row.category
      : "activite") as Category,
    title: row.title ?? "",
    description: row.description,
    location: row.location,
    arrondissement: row.arrondissement,
    duration: row.duration,
    booking_url: row.booking_url,
    badge: row.badge,
    poster_url: row.poster_url,
    is_exceptional: row.is_exceptional ?? false,
    date_start: row.date_start,
    date_end: row.date_end,
    showtimes: row.showtimes,
    cinema_name: row.cinema_name,
    cinema_url: row.cinema_url,
    source_url: row.source_url,
    travel_walk: row.travel_walk,
    travel_bike: row.travel_bike,
    travel_car: row.travel_car,
    week_key: row.week_key ?? weekKey,
  }));
}

export function useActivities(categoryFilter?: Category[]) {
  const query = useQuery({
    queryKey: ["activities"],
    queryFn: fetchActivities,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = categoryFilter?.length
    ? (query.data ?? []).filter((a) => categoryFilter.includes(a.category))
    : query.data ?? [];

  return {
    activities: filtered,
    allActivities: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
  };
}
