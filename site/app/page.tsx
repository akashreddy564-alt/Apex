import { Closing, Footer } from "@/components/landing/closing";
import { Difficulty } from "@/components/landing/difficulty";
import { Flyover } from "@/components/landing/flyover";
import { Friends } from "@/components/landing/friends";
import { AltitudeRail } from "@/components/landing/altitude-rail";
import { Gallery } from "@/components/landing/gallery";
import { Handoff } from "@/components/landing/handoff";
import { Hero } from "@/components/landing/hero";
import { Nav } from "@/components/landing/nav";
import { Rank } from "@/components/landing/rank";
import { Record } from "@/components/landing/record";
import { Year } from "@/components/landing/year";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <AltitudeRail />
      <main id="main">
        <Handoff label="Trailhead">
          <Hero />
        </Handoff>
        <Handoff label="Record">
          <Record />
        </Handoff>
        <Handoff label="Fly back" tone="dark">
          <Flyover />
        </Handoff>
        <Handoff label="Rank">
          <Rank />
        </Handoff>
        <Handoff label="Difficulty">
          <Difficulty />
        </Handoff>
        <Handoff label="Your year" tone="dark">
          <Year />
        </Handoff>
        <Handoff label="Friends">
          <Friends />
        </Handoff>
        <Handoff label="Screens">
          <Gallery />
        </Handoff>
        <div data-rail="Summit" data-snap data-tone="dark">
          <Closing />
        </div>
      </main>
      <Footer />
    </>
  );
}
