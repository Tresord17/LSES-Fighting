// Données de démonstration reprises des maquettes.
// Elles seront remplacées par des requêtes Supabase (athlètes validés,
// actualités publiées) dès que la base sera en place.

export type Discipline = "sambo" | "mma";

export type AthleteCard = {
  id: string;
  name: string;
  discipline: Discipline;
  weightClassKg: number;
  city: string;
};

export type NewsItem = {
  id: string;
  title: { fr: string; en: string };
  publishedAt: string; // ISO 8601
};

export const DEMO_ATHLETES: AthleteCard[] = [
  { id: "1", name: "Mballa Armand", discipline: "sambo", weightClassKg: 74, city: "Yaoundé" },
  { id: "2", name: "Ngo Bell Sandra", discipline: "mma", weightClassKg: 62, city: "Douala" },
  { id: "3", name: "Tchouta Paul", discipline: "sambo", weightClassKg: 90, city: "Bafoussam" },
  { id: "4", name: "Essomba Linda", discipline: "sambo", weightClassKg: 58, city: "Yaoundé" },
];

export const DEMO_NEWS: NewsItem[] = [
  {
    id: "1",
    title: {
      fr: "Trois médailles au tournoi de Douala",
      en: "Three medals at the Douala tournament",
    },
    publishedAt: "2026-09-12",
  },
  {
    id: "2",
    title: {
      fr: "Un stage de sambo ouvert aux débutants à Yaoundé",
      en: "A sambo camp open to beginners in Yaoundé",
    },
    publishedAt: "2026-08-28",
  },
];
