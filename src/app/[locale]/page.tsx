import { Hero } from "@/components/home/Hero";
import { Disciplines } from "@/components/home/Disciplines";
import { FeaturedAthletes } from "@/components/home/FeaturedAthletes";
import { LatestNews } from "@/components/home/LatestNews";
import { JoinCallout } from "@/components/home/JoinCallout";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Disciplines />
      <FeaturedAthletes />
      <LatestNews />
      <JoinCallout />
    </>
  );
}
