import { Hero } from "@/components/home/Hero";
import { Ticker } from "@/components/home/Ticker";
import { Disciplines } from "@/components/home/Disciplines";
import { FeaturedAthletes } from "@/components/home/FeaturedAthletes";
import { LatestNews } from "@/components/home/LatestNews";
import { JoinCallout } from "@/components/home/JoinCallout";

// Régénérée toutes les cinq minutes pour afficher les dernières fiches
export const revalidate = 300;

export default function HomePage() {
  return (
    <>
      <Hero />
      <Ticker />
      <Disciplines />
      <FeaturedAthletes />
      <LatestNews />
      <JoinCallout />
    </>
  );
}
