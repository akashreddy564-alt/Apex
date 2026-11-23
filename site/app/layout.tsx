import type { Metadata, Viewport } from "next";
import { Anton, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });

const DESCRIPTION =
  "Apex records your hike, flies you back over it in 3D, and ranks it against every trail you've done.";

export const metadata: Metadata = {
  title: "Apex: rank every trail you climb",
  description: DESCRIPTION,
  openGraph: {
    title: "Apex: rank every trail you climb",
    description: DESCRIPTION,
    type: "website",
    images: [{ url: "/screens/light-07-trail-page.png", width: 780, height: 1688, alt: "The Apex trail page" }],
  },
  twitter: { card: "summary_large_image", title: "Apex: rank every trail you climb", description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#F5F1E8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${anton.variable} antialiased`}
    >
      <head>
        {/* General Sans from Fontshare (ITF Free Font License, free for commercial use). */}
        <link href="https://api.fontshare.com" rel="preconnect" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain min-h-full overflow-x-clip">{children}</body>
    </html>
  );
}
