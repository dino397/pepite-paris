export type Category = "cinema" | "theatre" | "expo" | "activite";

export interface Activity {
  id: string;
  category: Category;
  title: string;
  description: string | null;
  location: string | null;
  arrondissement: string | null;
  duration: string | null;
  booking_url: string | null;
  badge: string | null;
  poster_url: string | null;
  is_exceptional: boolean;
  date_start: string | null;
  date_end: string | null;
  showtimes: string | null;
  cinema_name: string | null;
  cinema_url: string | null;
  source_url: string | null;
  travel_walk: string | null;
  travel_bike: string | null;
  travel_car: string | null;
  week_key: string;
}

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "cinema", label: "Cinéma", emoji: "🎬" },
  { id: "theatre", label: "Théâtre & Spectacles", emoji: "🎭" },
  { id: "expo", label: "Expositions & Musées", emoji: "🖼️" },
  { id: "activite", label: "Activités", emoji: "🌿" },
];
