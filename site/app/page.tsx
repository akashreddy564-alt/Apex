import { Closing, Footer } from "@/components/landing/closing";
import { Difficulty } from "@/components/landing/difficulty";
import { Flyover } from "@/components/landing/flyover";
import { Friends } from "@/components/landing/friends";
import { Gallery } from "@/components/landing/gallery";
import { Hero } from "@/components/landing/hero";
import { Nav } from "@/components/landing/nav";
import { Rank } from "@/components/landing/rank";
import { Record } from "@/components/landing/record";
import { SmoothScroll } from "@/components/landing/smooth";
import { TrailMarquee } from "@/components/landing/marquee";
import { Year } from "@/components/landing/year";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SmoothScroll />
      <Nav />
      <main id="main">
        <Hero />
        <TrailMarquee />
        <Record />
        <Flyover />
        <Rank />
        <Difficulty />
        <Year />
        <Friends />
        <Gallery />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
