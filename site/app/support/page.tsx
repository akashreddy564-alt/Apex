import type { Metadata } from "next";

import { LegalPage, Section } from "@/components/landing/legal";
import { SUPPORT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Support · Apex",
  description: "Help with Apex: signing in, recording, friends, groups and your account.",
};

export default function SupportPage() {
  return (
    <LegalPage
      intro="Answers to the common questions, and how to reach a person when they don’t cover it."
      title="Support"
    >
      <Section title="Contact">
        <p>
          Email{" "}
          <a className="link-draw font-medium" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          . We answer within two working days, and reports of harmful content within 24 hours.
        </p>
        <p>
          You can also report a post, comment or person from the app (the ••• menu), and we review it within
          24 hours.
        </p>
      </Section>

      <Section title="Signing in">
        <ul>
          <li>Enter your email in Settings and open the link on the same phone, or type the 6-digit code from the email.</li>
          <li>No email? Check spam, wait a minute, then send another link.</li>
        </ul>
      </Section>

      <Section title="Recording a hike">
        <ul>
          <li>Slide to start on Log. Apex keeps recording with the screen off.</li>
          <li>
            If the route stops drawing, check that location access is set to “While Using” or “Always” in iOS
            Settings → Apex → Location.
          </li>
          <li>Recording works with no signal; your hike uploads when you’re back online.</li>
        </ul>
      </Section>

      <Section title="Friends, groups and boards">
        <ul>
          <li>Add friends from Social by username, QR code or invite link.</li>
          <li>Join a group with its 6-character code. Boards count recorded hikes, Monday to Sunday.</li>
          <li>
            To join your school or company board, verify a school or work email from Social. Personal email
            addresses can’t be used.
          </li>
        </ul>
      </Section>

      <Section title="Your account">
        <ul>
          <li>Download your hikes as GPX and CSV from Settings → Delete account (you don’t have to delete).</li>
          <li>Delete your account from Settings → Delete account. It can’t be undone.</li>
          <li>
            Read the <a className="link-draw font-medium" href="/privacy">Privacy Policy</a> and{" "}
            <a className="link-draw font-medium" href="/terms">Terms</a>.
          </li>
        </ul>
      </Section>
    </LegalPage>
  );
}
