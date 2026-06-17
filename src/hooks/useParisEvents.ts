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

const DEMO_EVENTS: ParisEvent[] = [
  { id: "1", title: "Vice-Versa 3", description: "Riley entre au lycée et découvre de nouvelles émotions complexes. Pixar signe un film drôle, émouvant et visuellement éblouissant pour toute la famille.", coverUrl: "https://cdn-s-www.leprogres.fr/images/3CCCE98E-92C2-4CFC-ADC2-38C3EA04E470/NW_raw/photo-1719391761.jpg", dateStart: "2026-06-20", dateEnd: "2026-06-30", dateDescription: "Sam & Dim, séances à 10h15 et 14h", placeName: "MK2 Odéon", address: "113 Boulevard Saint-Germain, 75006", lat: 48.8512, lon: 2.3388, tags: ["cinéma", "animation", "famille", "enfants"], priceType: "payant", contactUrl: "https://www.mk2.com", audience: "Jeune public" },
  { id: "2", title: "Mon voisin Totoro — Ressortie", description: "Deux sœurs s'installent à la campagne et découvrent des créatures magiques. Le chef-d'œuvre intemporel de Miyazaki ressort sur grand écran.", coverUrl: "https://media.senscritique.com/media/000004651498/0/mon_voisin_totoro.jpg", dateStart: "2026-06-18", dateEnd: "2026-06-25", dateDescription: "Tous les jours à 11h", placeName: "Forum des Images", address: "2 Rue du Cinéma, 75001", lat: 48.8618, lon: 2.3479, tags: ["cinéma", "animation", "ghibli", "enfants"], priceType: "payant", contactUrl: "https://www.forumdesimages.fr", audience: "Jeune public" },
  { id: "3", title: "Pirouette — Spectacle de marionnettes", description: "Marionnettes et danse mêlées dans un tourbillon coloré et poétique. Un spectacle vivant parfait pour initier les enfants aux arts de la scène.", coverUrl: null, dateStart: "2026-06-21", dateEnd: "2026-06-22", dateDescription: "Sam 15h / Dim 11h", placeName: "Théâtre Essaïon", address: "6 Rue Pierre au Lard, 75004", lat: 48.8589, lon: 2.3525, tags: ["spectacle", "théâtre", "marionnettes", "enfants"], priceType: "payant", contactUrl: "https://essaion-theatre.com", audience: "Jeune public, dès 3 ans" },
  { id: "4", title: "Le Petit Chaperon Rouge revisité", description: "Revisitation moderne et drôle du conte classique avec marionnettes géantes, musique live et participation du public. Les enfants adorent !", coverUrl: null, dateStart: "2026-06-21", dateEnd: "2026-06-22", dateDescription: "Sam & Dim 14h30", placeName: "Théâtre du Marais", address: "37 Rue Volta, 75003", lat: 48.8655, lon: 2.3567, tags: ["spectacle", "théâtre", "conte", "enfants"], priceType: "payant", contactUrl: "https://theatredumarais.fr", audience: "Jeune public, dès 2 ans" },
  { id: "5", title: "Digital Abysses — Expo immersive", description: "Plonger dans l'océan sans se mouiller ! Les enfants explorent, touchent et créent des créatures marines numériques dans cette exposition interactive.", coverUrl: "https://musee-en-herbe.com/wp-content/uploads/2024/11/DIGITAL-ABYSSES-SITE-INTERNET-1.jpg", dateStart: "2026-01-01", dateEnd: "2026-09-30", dateDescription: "Du mardi au dimanche, 10h-19h", placeName: "Musée en Herbe", address: "23 Rue de l'Arbre-Sec, 75001", lat: 48.8598, lon: 2.3438, tags: ["exposition", "musée", "immersif", "enfants", "art"], priceType: "payant", contactUrl: "https://museeenherbe.com", audience: "Jeune public, dès 3 ans" },
  { id: "6", title: "Concordance des temps — Atelier des Lumières", description: "Les plus grands tableaux de la Renaissance projetés en géant sur les murs et le sol. Une expérience immersive qui fascine petits et grands.", coverUrl: "https://www.atelier-lumieres.com/sites/default/files/styles/gallery/public/2024-02/ADL_CONCORDANCE_DES_TEMPS_CEZANNE_BAIN.jpg", dateStart: "2026-02-14", dateEnd: "2027-01-04", dateDescription: "Tous les jours 10h-18h, nocturne ven 22h", placeName: "Atelier des Lumières", address: "38 Rue Saint-Maur, 75011", lat: 48.8613, lon: 2.3809, tags: ["exposition", "art", "immersif", "numérique"], priceType: "payant", contactUrl: "https://www.atelier-lumieres.com", audience: "Tout public" },
  { id: "7", title: "Philharmonie des Enfants", description: "Toucher des instruments du monde entier, composer des sons, plonger dans la musique. L'espace permanent de découverte musicale pour les 4-10 ans.", coverUrl: null, dateStart: "2026-01-01", dateEnd: "2026-12-31", dateDescription: "Mer, sam, dim + vacances", placeName: "Philharmonie de Paris", address: "221 Avenue Jean Jaurès, 75019", lat: 48.8910, lon: 2.3934, tags: ["exposition", "musique", "enfants", "atelier"], priceType: "payant", contactUrl: "https://philharmoniedeparis.fr", audience: "4-10 ans" },
  { id: "8", title: "Atelier peinture fluo en famille", description: "Peinture UV, slime fluo et créations lumineuses. Chaque enfant repart avec son œuvre unique. Ambiance disco garantie !", coverUrl: null, dateStart: "2026-06-21", dateEnd: "2026-06-22", dateDescription: "Sam 10h30 & 14h30 / Dim 10h30", placeName: "Paint Invaders", address: "36 Rue de Cléry, 75002", lat: 48.8690, lon: 2.3466, tags: ["atelier", "créatif", "enfants", "peinture"], priceType: "payant", contactUrl: "https://paintinvaders.fr", audience: "Dès 4 ans" },
  { id: "9", title: "Cité des Enfants — Espace 5-12 ans", description: "Eau, lumière, corps humain : des dizaines d'expériences scientifiques interactives. L'espace 5-12 ans est grand ouvert pour l'été !", coverUrl: "https://www.cite-sciences.fr/fileadmin/_processed_/2/0/csm_cite-des-enfants-5-12-ans_01_7b7c8c3e8a.jpg", dateStart: "2026-06-15", dateEnd: "2026-08-31", dateDescription: "Mar-dim 10h-18h, séances toutes les 1h30", placeName: "Cité des Sciences", address: "30 Avenue Corentin Cariou, 75019", lat: 48.8958, lon: 2.3871, tags: ["atelier", "sciences", "enfants", "expériences"], priceType: "payant", contactUrl: "https://www.cite-sciences.fr", audience: "5-12 ans" },
  { id: "10", title: "Jardin d'Acclimatation — Week-end famille", description: "Attractions foraines, petit zoo, aires de jeux et balades en poney. Le parc au cœur du Bois de Boulogne est ouvert tout le week-end.", coverUrl: "https://www.jardindacclimatation.fr/sites/default/files/2023-06/jardin-acclimatation-manege.jpg", dateStart: "2026-06-20", dateEnd: "2026-06-21", dateDescription: "Sam & Dim 10h-19h", placeName: "Jardin d'Acclimatation", address: "Bois de Boulogne, 75116", lat: 48.8774, lon: 2.2631, tags: ["balade", "parc", "nature", "enfants", "plein air"], priceType: "Gratuit pour les -3 ans", contactUrl: "https://www.jardindacclimatation.fr", audience: "Tout public" },
  { id: "11", title: "Balade contée au Jardin du Luxembourg", description: "Promenade guidée pour les familles à travers les statues et fontaines du Luxembourg. Histoires, légendes et jeux en plein air.", coverUrl: null, dateStart: "2026-06-21", dateEnd: "2026-06-21", dateDescription: "Dim 10h30, durée 1h30", placeName: "Jardin du Luxembourg", address: "Rue de Médicis, 75006", lat: 48.8462, lon: 2.3372, tags: ["balade", "visite", "jardin", "conte", "enfants", "nature"], priceType: "Gratuit", contactUrl: null, audience: "Famille, dès 4 ans" },
  { id: "12", title: "Festival de cirque — Parc de la Villette", description: "Spectacles de cirque contemporain en plein air. Acrobaties, clowns et jonglage pour émerveiller toute la famille.", coverUrl: null, dateStart: "2026-06-18", dateEnd: "2026-06-29", dateDescription: "Mer-Dim 15h & 17h", placeName: "Parc de la Villette", address: "211 Avenue Jean Jaurès, 75019", lat: 48.8938, lon: 2.3900, tags: ["spectacle", "cirque", "enfants", "plein air"], priceType: "Gratuit", contactUrl: "https://lavillette.com", audience: "Tout public" },
];

async function fetchEvents(): Promise<ParisEvent[]> {
  const now = new Date();

  const params = new URLSearchParams({
    limit: "100",
    select: "title,lead_text,cover_url,date_start,date_end,date_description,address_name,address_street,lat_lon,tags,price_type,contact_url,audience",
    where: `date_end>='${now.toISOString().split("T")[0]}'`,
    order_by: "date_start ASC",
  });

  try {
    const res = await fetch(`${API_BASE}?${params}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const results = (data.results ?? []).map((r: ApiRecord) => toParisEvent(r));
    return results.length > 0 ? results : DEMO_EVENTS;
  } catch {
    return DEMO_EVENTS;
  }
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
