import { useQuery } from "@tanstack/react-query";
import type { ParisEvent, Category } from "@/types/event";

const API_BASE = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records";

interface ApiRecord {
  id: string;
  title?: string;
  lead_text?: string;
  description?: string;
  cover_url?: string;
  date_start?: string;
  date_end?: string;
  date_description?: string;
  address_name?: string;
  address_street?: string;
  lat_lon?: { lat: number; lon: number };
  tags?: string;
  price_type?: string;
  contact_url?: string;
  audience?: string;
}

function toParisEvent(r: ApiRecord): ParisEvent {
  return {
    id: r.id ?? crypto.randomUUID(),
    title: r.title ?? "Sans titre",
    description: r.lead_text || r.description || "",
    coverUrl: r.cover_url || null,
    dateStart: r.date_start || null,
    dateEnd: r.date_end || null,
    dateDescription: r.date_description || null,
    placeName: r.address_name || null,
    address: r.address_street || null,
    lat: r.lat_lon?.lat ?? null,
    lon: r.lat_lon?.lon ?? null,
    tags: r.tags ? r.tags.split(";").map((t) => t.trim().toLowerCase()) : [],
    priceType: r.price_type || null,
    contactUrl: r.contact_url || null,
    audience: r.audience || null,
  };
}

async function fetchEvents(): Promise<ParisEvent[]> {
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  const params = new URLSearchParams({
    limit: "100",
    select: "title,lead_text,cover_url,date_start,date_end,date_description,address_name,address_street,lat_lon,tags,price_type,contact_url,audience",
    where: `date_end>='${now.toISOString().split("T")[0]}'`,
    order_by: "date_start ASC",
  });

  const res = await fetch(`${API_BASE}?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data = await res.json();
  return (data.results ?? []).map((r: ApiRecord) => toParisEvent(r));
}

function matchesCategory(event: ParisEvent, category: Category): boolean {
  if (category === "all") return true;

  const text = [...event.tags, event.title, event.description, event.audience ?? ""]
    .join(" ")
    .toLowerCase();

  const keywords: Record<Category, string[]> = {
    all: [],
    enfants: ["enfant", "famille", "jeune public", "kids", "bébé", "tout-petit", "3 ans", "4 ans", "5 ans", "6 ans", "ado"],
    cinema: ["cinéma", "cinema", "film", "projection", "séance"],
    exposition: ["exposition", "expo", "musée", "museum", "galerie", "art"],
    spectacle: ["spectacle", "théâtre", "theatre", "concert", "danse", "cirque", "marionnette", "conte"],
    atelier: ["atelier", "workshop", "créatif", "bricolage", "cuisine", "dessin"],
    balade: ["balade", "promenade", "visite", "jardin", "parc", "nature", "plein air"],
  };

  return keywords[category].some((kw) => text.includes(kw));
}

export function useParisEvents(category: Category = "all") {
  const query = useQuery({
    queryKey: ["paris-events"],
    queryFn: fetchEvents,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  const filtered = category === "all"
    ? query.data ?? []
    : (query.data ?? []).filter((e) => matchesCategory(e, category));

  return {
    events: filtered,
    allEvents: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
  };
}
