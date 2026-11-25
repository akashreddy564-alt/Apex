import type { Metadata } from "next";

import { LegalPage, Section } from "@/components/landing/legal";
import { SUPPORT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Terms · Apex",
  description: "The rules for using Apex and sharing hikes with friends.",
};

export default function TermsPage() {
  return (
    <LegalPage
      intro="By creating an account in Apex you agree to these terms. They’re short: share your hikes, be decent to other hikers, and stay safe outside."
      title="Terms of Use"
    >
      <Section title="What you can’t post">
        <p>Apex has zero tolerance for objectionable content or abusive users. Don’t post or send:</p>
        <ul>
          <li>Hateful, harassing, threatening or bullying content.</li>
          <li>Sexual content, or anything that involves minors inappropriately.</li>
          <li>Violent or graphic content, or content that encourages self-harm.</li>
          <li>Spam, scams, or impersonation of another person.</li>
          <li>Other people’s private information, or photos you don’t have the right to share.</li>
        </ul>
      </Section>

      <Section title="Reports and blocks">
        <p>
          You can report any post, comment or account, and block anyone, from the app. We review reports
          within 24 hours. Content that breaks these rules is removed, and the people who post it can lose
          their account.
        </p>
      </Section>

      <Section title="Your content">
        <p>
          Your hikes, photos and notes are yours. You give Apex permission to store them and show them to the
          people you choose (see the <a className="link-draw font-medium" href="/privacy">Privacy Policy</a>).
          Delete them, or your whole account, from the app at any time.
        </p>
      </Section>

      <Section title="Leaderboards and verification">
        <p>
          Boards count recorded hikes only, with limits on what one hike can add. Don’t fake recordings or use
          someone else’s school or work email. We may remove anyone who does.
        </p>
      </Section>

      <Section title="Safety outside">
        <p>
          Trail data, difficulty ratings, weather and routes are guides, not guarantees. Conditions change.
          You’re responsible for your own safety: check conditions, carry what you need, and turn back when
          it’s right to. Apex isn’t an emergency service.
        </p>
      </Section>

      <Section title="The service">
        <p>
          Apex is provided as is. We work to keep it running and your data safe, but can’t promise it will
          always be available or free of errors. We may change these terms; if a change matters, we’ll ask
          you to agree again in the app.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms? Email{" "}
          <a className="link-draw font-medium" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
