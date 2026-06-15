export interface ParisEvent {
  id: string;
  title: string;
  description: string;
  coverUrl: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  dateDescription: string | null;
  placeName: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  tags: string[];
  priceType: string | null;
  contactUrl: string | null;
  audience: string | null;
}

export type Category = "all" | "enfants" | "cinema" | "exposition" | "spectacle" | "atelier" | "balade";

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "all", label: "Tout", emoji: "✨" },
  { id: "enfants", label: "Enfants", emoji: "👶" },
  { id: "spectacle", label: "Spectacles", emoji: "🎭" },
  { id: "exposition", label: "Expos", emoji: "🖼️" },
  { id: "cinema", label: "Cinéma", emoji: "🎬" },
  { id: "atelier", label: "Ateliers", emoji: "🎨" },
  { id: "balade", label: "Balades", emoji: "🌿" },
];
