import type { Metadata } from "next";

import { LegalPage, Section } from "@/components/landing/legal";
import { SUPPORT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy Policy · Apex",
  description: "What Apex keeps, who sees it, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      intro="Apex records your hikes so you can rank them and share them with friends. This page says what we keep, who can see it, and how to take it back."
      title="Privacy Policy"
    >
      <Section title="What Apex keeps">
        <ul>
          <li>
            <b>Your account:</b> your email address (to sign in), and the name and username you pick.
          </li>
          <li>
            <b>Your hikes:</b> the route, distance, climb and time of hikes you record, plus any notes and
            photos you add, and how you rank them.
          </li>
          <li>
            <b>Social activity:</b> friends, friend requests, groups you create or join, likes, comments,
            reports and blocks.
          </li>
          <li>
            <b>School or work:</b> if you verify a school or work email, we keep only the part after the @
            (for example uw.edu) and when you verified. We never store the full address.
          </li>
        </ul>
        <p>
          Without an account, everything stays on your phone. Apex has no ads, sells nothing about you,
          and uses no third-party tracking or advertising SDKs.
        </p>
      </Section>

      <Section title="Location">
        <p>
          Apex uses your location only while you’re recording a hike, including with the screen off, so it
          can draw your route and measure your climb. It doesn’t track you at any other time. You can
          change location access in iOS Settings at any time.
        </p>
      </Section>

      <Section title="Who sees what">
        <ul>
          <li>
            <b>Friends</b> (people you both agreed to add) see your ranked hikes, routes, photos and notes.
            The first and last 300 m of every recorded route are cut off, so where you parked or live
            isn’t shown.
          </li>
          <li>
            <b>Group and school or company members</b> see your name, your climb totals and your place on
            the board. They don’t see your hikes, routes or photos unless they’re also your friend.
          </li>
          <li>
            <b>Anyone signed in</b> can find you by username and see your name.
          </li>
          <li>Blocking someone hides you from each other.</li>
        </ul>
      </Section>

      <Section title="Services we use">
        <p>Apex relies on a few providers, who process data only to run the app:</p>
        <ul>
          <li>Supabase: account sign-in, database and photo storage.</li>
          <li>Resend: sending sign-in and verification emails.</li>
          <li>Mapbox: map tiles for the 3D flyover.</li>
          <li>Open-Meteo and OpenTopoData: weather and elevation for trails (no personal data sent).</li>
          <li>Vercel: hosting this website.</li>
        </ul>
      </Section>

      <Section title="Your choices">
        <ul>
          <li>Download your hikes as GPX and CSV from Settings → Delete account, before or without deleting.</li>
          <li>
            Delete your account from Settings → Delete account. Your profile, hikes, photos, rankings, posts,
            comments and memberships are removed from our servers.
          </li>
          <li>Leave a group or a school or company board whenever you like.</li>
        </ul>
      </Section>

      <Section title="Children">
        <p>Apex isn’t meant for children under 13, and we don’t knowingly collect their data.</p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes in a way that matters, we’ll update the date above and tell you in the app.
          Questions? Email{" "}
          <a className="link-draw font-medium" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          or see the <a className="link-draw font-medium" href="/support">support page</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
