export const mockWeather = [
  { day: "Samedi", icon: "☁️", desc: "Nuageux", min: 8, max: 14 },
  { day: "Dimanche", icon: "☀️", desc: "Ensoleillé", min: 10, max: 16 }
];

export const mockCalendarEvents = [
  { title: "Brunch chez les grands-parents", day: "Dimanche", time: "11h00" }
];

export const mockBookings = [
  { event_name: "Cirque Bouglione", event_date: "2025-03-29", location: "Cirque d'Hiver", notes: "Samedi 14h" }
];

export interface Cinema {
  name: string;
  url: string;
  arrondissement: string;
  travel_walk: string;
  showtimes: string;
}

export interface Activity {
  id: number;
  category: "cinema" | "theatre" | "expo" | "activite";
  title: string;
  description: string;
  date: string;
  location: string;
  arrondissement: string;
  duration: string;
  booking_url: string;
  travel_walk: string;
  travel_bike: string;
  travel_car: string;
  is_exceptional: boolean;
  is_future: boolean;
  badge?: string;
  cinemas?: Cinema[];
  poster_url?: string;
}

export interface FutureEvent {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  arrondissement: string;
  booking_url: string;
  age: string;
}

export const mockActivities: Activity[] = [
  {
    id: 1,
    category: "cinema",
    title: "Perdu ? Retrouvé !",
    description: "Un garçon trouve un pingouin perdu. Traversée de l'océan ensemble.",
    date: "2025-03-29",
    location: "MK2 Odéon",
    arrondissement: "6ème",
    duration: "45 min",
    booking_url: "https://www.mk2.com/salle/mk2-odeon",
    travel_walk: "12 min",
    travel_bike: "5 min",
    travel_car: "4 min",
    is_exceptional: false,
    is_future: false,
    badge: "dessin animé · 45 min",
    poster_url: "https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=300&h=420&fit=crop",
    cinemas: [
      { name: "MK2 Odéon", url: "https://www.mk2.com/salle/mk2-odeon", arrondissement: "6ème", travel_walk: "12 min", showtimes: "Sam 10h15 / Dim 10h30" },
      { name: "Les Ursulines", url: "https://www.studiodesursulines.com", arrondissement: "5ème", travel_walk: "15 min", showtimes: "Dim 11h" }
    ]
  },
  {
    id: 2,
    category: "cinema",
    title: "Loups tendres et loufoques",
    description: "Courts-métrages animés sur les loups. Drôle et tendre pour les tout-petits.",
    date: "2025-03-29",
    location: "Escurial",
    arrondissement: "13ème",
    duration: "50 min",
    booking_url: "https://www.cinema-escurial.fr",
    travel_walk: "25 min",
    travel_bike: "10 min",
    travel_car: "12 min",
    is_exceptional: false,
    is_future: false,
    badge: "dessin animé · 50 min",
    poster_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=420&fit=crop",
    cinemas: [
      { name: "Escurial", url: "https://www.cinema-escurial.fr", arrondissement: "13ème", travel_walk: "25 min", showtimes: "Dim 11h" },
      { name: "MK2 Beaubourg", url: "https://www.mk2.com/salle/mk2-beaubourg", arrondissement: "3ème", travel_walk: "22 min", showtimes: "Sam 10h" }
    ]
  },
  {
    id: 3,
    category: "theatre",
    title: "Pirouette",
    description: "Danse et marionnettes. Tourbillon de couleurs pour les petits.",
    date: "2025-03-29",
    location: "Théâtre Essaïon",
    arrondissement: "4ème",
    duration: "~45 min",
    booking_url: "https://www.essaion-theatre.com",
    travel_walk: "20 min",
    travel_bike: "8 min",
    travel_car: "10 min",
    is_exceptional: false,
    is_future: false,
    poster_url: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=300&h=420&fit=crop",
  },
  {
    id: 4,
    category: "theatre",
    title: "L'Arbre sans fin",
    description: "Conte de Claude Ponti adapté au théâtre. Voyage poétique et drôle.",
    date: "2025-03-29",
    location: "Théâtre du Lucernaire",
    arrondissement: "6ème",
    duration: "~50 min",
    booking_url: "https://www.lucernaire.fr",
    travel_walk: "5 min",
    travel_bike: "2 min",
    travel_car: "3 min",
    is_exceptional: true,
    is_future: false,
    poster_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=420&fit=crop",
  },
  {
    id: 5,
    category: "theatre",
    title: "Le Petit Chaperon Rouge",
    description: "Théâtre de marionnettes poétique. Mise en scène lumineuse et moderne.",
    date: "2025-03-29",
    location: "Théâtre Dunois",
    arrondissement: "13ème",
    duration: "~40 min",
    booking_url: "https://www.theatredunois.org",
    travel_walk: "28 min",
    travel_bike: "11 min",
    travel_car: "13 min",
    is_exceptional: false,
    is_future: false,
    poster_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=420&fit=crop",
  },
  {
    id: 6,
    category: "expo",
    title: "Digital Abysse",
    description: "Plongée interactive dans les fonds marins. Toucher, explorer, créer.",
    date: "2025-03-29",
    location: "Musée en Herbe",
    arrondissement: "1er",
    duration: "~1h30",
    booking_url: "https://www.musee-en-herbe.com/agenda",
    travel_walk: "22 min",
    travel_bike: "9 min",
    travel_car: "12 min",
    is_exceptional: false,
    is_future: false,
    poster_url: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=300&h=420&fit=crop",
  },
  {
    id: 7,
    category: "expo",
    title: "Renaissance",
    description: "Projections immersives de chefs-d'œuvre. Lumières et couleurs géantes.",
    date: "2025-03-29",
    location: "Atelier des Lumières",
    arrondissement: "11ème",
    duration: "~1h",
    booking_url: "https://www.atelier-lumieres.com",
    travel_walk: "35 min",
    travel_bike: "15 min",
    travel_car: "18 min",
    is_exceptional: true,
    is_future: false,
    poster_url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&h=420&fit=crop",
  },
  {
    id: 8,
    category: "expo",
    title: "Philharmonie des Enfants",
    description: "Parcours musical interactif. Sons, instruments et découvertes.",
    date: "2025-03-29",
    location: "Philharmonie de Paris",
    arrondissement: "19ème",
    duration: "~1h15",
    booking_url: "https://philharmoniedeparis.fr/fr/philharmonie-des-enfants",
    travel_walk: "45 min",
    travel_bike: "20 min",
    travel_car: "22 min",
    is_exceptional: false,
    is_future: false,
    poster_url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=300&h=420&fit=crop",
  },
  {
    id: 9,
    category: "activite",
    title: "Smile World",
    description: "Trampolines, karting électrique et parcours motricité.",
    date: "2025-03-29",
    location: "Smile World",
    arrondissement: "15ème",
    duration: "~2h",
    booking_url: "https://smileworld.fr",
    travel_walk: "18 min",
    travel_bike: "6 min",
    travel_car: "8 min",
    is_exceptional: false,
    is_future: false
  },
  {
    id: 10,
    category: "activite",
    title: "Atelier peinture fluo",
    description: "Art fluo et slime UV. Les enfants repartent avec leur création.",
    date: "2025-03-29",
    location: "Paint Invaders",
    arrondissement: "2ème",
    duration: "~1h30",
    booking_url: "https://paintinvaders.fr/reserver",
    travel_walk: "25 min",
    travel_bike: "10 min",
    travel_car: "12 min",
    is_exceptional: false,
    is_future: false
  },
  {
    id: 11,
    category: "activite",
    title: "Cité des Enfants",
    description: "Expériences scientifiques interactives. Eau, lumière, matière.",
    date: "2025-03-29",
    location: "Cité des Sciences",
    arrondissement: "19ème",
    duration: "~1h30",
    booking_url: "https://www.cite-sciences.fr/fr/visite/programme/expositions/la-cite-des-enfants",
    travel_walk: "45 min",
    travel_bike: "20 min",
    travel_car: "23 min",
    is_exceptional: false,
    is_future: false
  }
];

export const mockFutureWeekend = {
  label: "5 & 6 avril 2025",
  events: [
    { title: "Maison des Histoires — Atelier conte", location: "6ème", day: "Sam", time: "10h30" },
    { title: "Jardin d'Acclimatation ouvert", location: "16ème", day: "Sam & Dim", time: "10h00" },
    { title: "Musée en Herbe — Expo printemps", location: "1er", day: "Dim", time: "11h00" }
  ]
};

export const mockFutureEvents: FutureEvent[] = [
  {
    id: 100,
    title: "Eggxtraordinaire — Expo Pâques",
    description: "94 artistes revisitent l'œuf de Pâques. Gratuit sur réservation.",
    date: "3 avr – 3 mai 2025",
    location: "Galerie Joseph",
    arrondissement: "3ème",
    booking_url: "https://eggxtraordinaire.com",
    age: "3+"
  },
  {
    id: 101,
    title: "Passion Japon",
    description: "Expo immersive Japon. Tarif early bird jusqu'au 5 avril.",
    date: "5 avr – 1 juin 2025",
    location: "Parc des Expos",
    arrondissement: "15ème",
    booking_url: "https://www.passionjapon.fr",
    age: "4+"
  },
  {
    id: 102,
    title: "Festival Rêves d'enfants",
    description: "Spectacles, ateliers et contes. Gratuit, places limitées.",
    date: "12–13 avr 2025",
    location: "Centre Culturel Coréen",
    arrondissement: "6ème",
    booking_url: "https://www.coree-culture.org",
    age: "3+"
  },
  {
    id: 103,
    title: "Philharmonie Explore",
    description: "Parcours musical immersif pour les enfants. Dernières places.",
    date: "19–20 avr 2025",
    location: "Philharmonie",
    arrondissement: "19ème",
    booking_url: "https://philharmoniedeparis.fr/fr/philharmonie-des-enfants",
    age: "4+"
  },
  {
    id: 104,
    title: "Alice Swing",
    description: "Conte musical jazz au pays des merveilles. Dernières places.",
    date: "26–27 avr 2025",
    location: "Théâtre Dunois",
    arrondissement: "13ème",
    booking_url: "https://www.theatredunois.org",
    age: "3+"
  }
];
