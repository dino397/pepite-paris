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
  google_maps_url?: string;
}

export interface FutureEvent {
  id: number;
  emoji: string;
  title: string;
  description: string;
  date: string;
  location: string;
  arrondissement: string;
  booking_url: string;
  age: string;
}


import posterPerduRetrouve from "@/assets/poster-perdu-retrouve.jpg";
import posterLoups from "@/assets/poster-loups.jpg";
import posterVaiana2 from "@/assets/poster-vaiana2.jpg";
import posterPirouette from "@/assets/poster-pirouette.jpg";
import posterArbreSansFin from "@/assets/poster-arbre-sans-fin.jpg";
import posterFeeChaussettes from "@/assets/poster-fee-chaussettes.jpg";
import posterDigitalAbysse from "@/assets/poster-digital-abysse.jpg";
import posterRenaissance from "@/assets/poster-renaissance.jpg";
import posterPhilharmonie from "@/assets/poster-philharmonie.jpg";
import posterSmileWorld from "@/assets/poster-smile-world.jpg";
import posterPeintureFluo from "@/assets/poster-peinture-fluo.jpg";
import posterCiteEnfants from "@/assets/poster-cite-enfants.jpg";

export const mockActivities: Activity[] = [
  {
    id: 1,
    category: "cinema",
    title: "Perdu ? Retrouvé !",
    description: "Un garçon et son pingouin séparés par le monde entier. Doux, drôle, touchant — un court-métrage animé qui fait du bien.",
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
    badge: "dessin animé · dès 3 ans",
    poster_url: posterPerduRetrouve,
    google_maps_url: "https://maps.google.com/?q=MK2+Od%C3%A9on+Paris",
    cinemas: [
      { name: "MK2 Odéon", url: "https://www.mk2.com/salle/mk2-odeon", arrondissement: "6ème", travel_walk: "12 min", showtimes: "Sam 10h15 / Dim 10h30" },
      { name: "Les Ursulines", url: "https://www.studiodesursulines.com", arrondissement: "5ème", travel_walk: "15 min", showtimes: "Dim 11h" }
    ]
  },
  {
    id: 2,
    category: "cinema",
    title: "Loups tendres et loufoques",
    description: "Courts-métrages animés sur des loups drôles et attachants. Une séance légère, pleine d'humour et de tendresse.",
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
    badge: "animation · dès 3 ans",
    poster_url: posterLoups,
    google_maps_url: "https://maps.google.com/?q=Cin%C3%A9ma+Escurial+Paris+13",
    cinemas: [
      { name: "Escurial", url: "https://www.cinema-escurial.fr", arrondissement: "13ème", travel_walk: "25 min", showtimes: "Dim 11h" },
      { name: "MK2 Beaubourg", url: "https://www.mk2.com/salle/mk2-beaubourg", arrondissement: "3ème", travel_walk: "22 min", showtimes: "Sam 10h" }
    ]
  },
  {
    id: 12,
    category: "cinema",
    title: "Vaiana 2",
    description: "Vaiana reprend la mer pour une mission encore plus grande, entourée d'une nouvelle équipe de navigateurs. Disney au sommet de sa forme, coloré et entraînant.",
    date: "2025-03-29",
    location: "MK2 Beaubourg",
    arrondissement: "3ème",
    duration: "100 min",
    booking_url: "https://www.mk2.com/film/vaiana-2",
    travel_walk: "20 min",
    travel_bike: "8 min",
    travel_car: "9 min",
    is_exceptional: false,
    is_future: false,
    badge: "Disney · dès 4 ans",
    poster_url: posterVaiana2,
    google_maps_url: "https://maps.google.com/?q=MK2+Beaubourg+Paris+3",
    cinemas: [
      { name: "MK2 Beaubourg", url: "https://www.mk2.com/film/vaiana-2", arrondissement: "3ème", travel_walk: "20 min", showtimes: "Sam 10h / Dim 10h15" },
      { name: "Le Grand Rex", url: "https://www.legrandrex.com", arrondissement: "2ème", travel_walk: "28 min", showtimes: "Sam & Dim 10h30" }
    ]
  },
  {
    id: 3,
    category: "theatre",
    title: "Pirouette",
    description: "Marionnettes et danse mêlées dans un tourbillon coloré et poétique. Un spectacle vivant parfait pour initier vos enfants aux arts de la scène en douceur.",
    date: "2025-03-29",
    location: "Théâtre Essaïon",
    arrondissement: "4ème",
    duration: "~45 min",
    booking_url: "https://essaion-theatre.com/spectacle/pirouette-la-danse-des-4-saisons/",
    travel_walk: "20 min",
    travel_bike: "8 min",
    travel_car: "10 min",
    is_exceptional: false,
    is_future: false,
    poster_url: posterPirouette,
    google_maps_url: "https://maps.google.com/?q=Th%C3%A9%C3%A2tre+Essa%C3%AFon+Paris+4",
  },
  {
    id: 4,
    category: "theatre",
    title: "L'Arbre sans fin",
    description: "Hipollène tombe au cœur d'un arbre immense et entame un voyage poétique pour apprendre à grandir. D'après Claude Ponti, dès 3 ans.",
    date: "2025-03-29",
    location: "Théâtre Essaïon",
    arrondissement: "4ème",
    duration: "~50 min",
    booking_url: "https://essaion-theatre.com/spectacle/larbre-sans-fin/",
    travel_walk: "20 min",
    travel_bike: "8 min",
    travel_car: "10 min",
    is_exceptional: true,
    is_future: false,
    poster_url: posterArbreSansFin,
    google_maps_url: "https://maps.google.com/?q=Th%C3%A9%C3%A2tre+Essa%C3%AFon+Paris+4",
  },
  {
    id: 5,
    category: "theatre",
    title: "La Fée des chaussettes",
    description: "Luciole, petite fée adepte du sommeil, devient malgré elle la fée des chaussettes. Un spectacle musical tendre et drôle pour Ariel dès 2 ans.",
    date: "2025-03-29",
    location: "Théâtre du Marais",
    arrondissement: "3ème",
    duration: "~45 min",
    booking_url: "https://theatredumarais.fr/spectacle/la-fee-des-chaussettes/",
    travel_walk: "22 min",
    travel_bike: "9 min",
    travel_car: "11 min",
    is_exceptional: false,
    is_future: false,
    poster_url: posterFeeChaussettes,
    google_maps_url: "https://maps.google.com/?q=Th%C3%A9%C3%A2tre+du+Marais+Paris+3",
  },
  {
    id: 6,
    category: "expo",
    title: "Digital Abysses",
    description: "Plonger dans l'océan sans se mouiller ! Ariel touche, explore et crée des créatures marines dans cette expo immersive.",
    date: "2025-03-29",
    location: "Musée en Herbe",
    arrondissement: "1er",
    duration: "~1h30",
    booking_url: "https://museeenherbe.seetickets.com/content/digital-abysses",
    travel_walk: "22 min",
    travel_bike: "9 min",
    travel_car: "12 min",
    is_exceptional: false,
    is_future: false,
    poster_url: posterDigitalAbysse,
    google_maps_url: "https://maps.google.com/?q=Mus%C3%A9e+en+Herbe+Paris+1",
  },
  {
    id: 7,
    category: "expo",
    title: "Renaissance",
    description: "Des tableaux de maîtres projetés en géant sur les murs. Gala sera éblouie par les couleurs immenses.",
    date: "2025-03-29",
    location: "Atelier des Lumières",
    arrondissement: "11ème",
    duration: "~1h",
    booking_url: "https://www.atelier-lumieres.com/fr/programme/renaissance-de-vinci-raphael-michel-ange",
    travel_walk: "35 min",
    travel_bike: "15 min",
    travel_car: "18 min",
    is_exceptional: true,
    is_future: false,
    poster_url: posterRenaissance,
    google_maps_url: "https://maps.google.com/?q=Atelier+des+Lumi%C3%A8res+Paris+11",
  },
  {
    id: 8,
    category: "expo",
    title: "Philharmonie des Enfants",
    description: "Toucher des instruments, composer des sons, plonger dans la musique. Ariel et Gala adorent.",
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
    poster_url: posterPhilharmonie,
    google_maps_url: "https://maps.google.com/?q=Philharmonie+de+Paris",
  },
  {
    id: 9,
    category: "activite",
    title: "Smile World",
    description: "Trampolines géants, karting électrique, parcours motricité. Gala va s'éclater pendant des heures.",
    date: "2025-03-29",
    location: "Smile World",
    arrondissement: "15ème",
    duration: "~2h",
    booking_url: "https://smileworld.fr/reservation/",
    travel_walk: "18 min",
    travel_bike: "6 min",
    travel_car: "8 min",
    is_exceptional: false,
    is_future: false,
    poster_url: posterSmileWorld,
    google_maps_url: "https://maps.google.com/?q=Smile+World+Paris+15",
  },
  {
    id: 10,
    category: "activite",
    title: "Atelier peinture fluo",
    description: "Peinture UV et slime fluo à créer soi-même. Ariel et Gala repartent avec leurs œuvres.",
    date: "2025-03-29",
    location: "Paint Invaders",
    arrondissement: "2ème",
    duration: "~1h30",
    booking_url: "https://paintinvaders.fr/reserver",
    travel_walk: "25 min",
    travel_bike: "10 min",
    travel_car: "12 min",
    is_exceptional: false,
    is_future: false,
    poster_url: posterPeintureFluo,
    google_maps_url: "https://maps.google.com/?q=Paint+Invaders+Paris+2",
  },
  {
    id: 11,
    category: "activite",
    title: "Cité des Enfants",
    description: "Eau, lumière, corps : des expériences scientifiques conçues exprès pour leur âge. Fascinant pour les deux.",
    date: "2025-03-29",
    location: "Cité des Sciences",
    arrondissement: "19ème",
    duration: "~1h30",
    booking_url: "https://www.cite-sciences.fr/fr/visite/programme/expositions/la-cite-des-enfants",
    travel_walk: "45 min",
    travel_bike: "20 min",
    travel_car: "23 min",
    is_exceptional: false,
    is_future: false,
    poster_url: posterCiteEnfants,
    google_maps_url: "https://maps.google.com/?q=Cit%C3%A9+des+Sciences+Paris",
  }
];

export const mockFutureWeekend = {
  label: "5 & 6 avril",
  events: [
    { emoji: "📖", title: "Maison des Histoires — Atelier conte", location: "6ème", day: "Sam", time: "10h30", url: "https://www.104.fr/evenements/maison-des-petits" },
    { emoji: "🎡", title: "Jardin d'Acclimatation ouvert", location: "16ème", day: "Sam & Dim", time: "10h00", url: "https://www.jardindacclimatation.fr" },
    { emoji: "🖼️", title: "Musée en Herbe — Expo printemps", location: "1er", day: "Dim", time: "11h00", url: "https://www.musee-en-herbe.com/agenda" }
  ]
};

export const mockFutureEvents: FutureEvent[] = [
  {
    id: 100,
    emoji: "🥚",
    title: "Eggxtraordinaire — Expo Pâques",
    description: "94 artistes revisitent l'œuf de Pâques. Gratuit, parfait pour Ariel et Gala.",
    date: "3 avr – 3 mai 2025",
    location: "Galerie Joseph",
    arrondissement: "3ème",
    booking_url: "https://eggxtraordinaire.com",
    age: "3+"
  },
  {
    id: 101,
    emoji: "🗾",
    title: "Passion Japon",
    description: "Expo immersive sur le Japon. Réserve vite : tarif early bird jusqu'au 5 avril.",
    date: "5 avr – 1 juin 2025",
    location: "Parc des Expos",
    arrondissement: "15ème",
    booking_url: "https://www.passionjapon.fr",
    age: "4+"
  },
  {
    id: 102,
    emoji: "🎪",
    title: "Festival Rêves d'enfants",
    description: "Spectacles, ateliers et contes. Gratuit mais places limitées — à réserver vite.",
    date: "12–13 avr 2025",
    location: "Centre Culturel Coréen",
    arrondissement: "6ème",
    booking_url: "https://www.coree-culture.org",
    age: "3+"
  },
  {
    id: 103,
    emoji: "🎻",
    title: "Philharmonie Explore",
    description: "Parcours musical immersif pour les enfants. Plus que quelques places disponibles.",
    date: "19–20 avr 2025",
    location: "Philharmonie",
    arrondissement: "19ème",
    booking_url: "https://philharmoniedeparis.fr/fr/philharmonie-des-enfants",
    age: "4+"
  },
  {
    id: 104,
    emoji: "🎷",
    title: "Alice Swing",
    description: "Conte musical jazz au pays des merveilles. Dernières places — ne pas attendre.",
    date: "26–27 avr 2025",
    location: "Théâtre Dunois",
    arrondissement: "13ème",
    booking_url: "https://www.theatredunois.org",
    age: "3+"
  }
];
