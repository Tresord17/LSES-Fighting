// Actualités de démonstration reprises des maquettes, en attendant
// l'espace superviseur qui permettra de publier les vraies.

export type NewsItem = {
  id: string;
  title: { fr: string; en: string };
  publishedAt: string; // ISO 8601
};

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
