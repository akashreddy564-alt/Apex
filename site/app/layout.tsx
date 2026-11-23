import type { Metadata, Viewport } from "next";
import { Anton, Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
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
      className={`${inter.variable} ${bricolage.variable} ${anton.variable} antialiased`}
    >
      <body className="grain min-h-full overflow-x-clip">{children}</body>
    </html>
  );
}
