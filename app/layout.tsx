import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "AI-Powered Data Storytelling — Moderating the Emotional Tone of Data Narratives",
    template: "%s · AI-Powered Data Storytelling",
  },
  description:
    "An agentic approach to data storytelling: a general LLM generates a data story, an agentic LLM moderates its emotional tone, and a lightweight factual check keeps it honest. A TU Dresden CMS Team Project.",
  keywords: [
    "data storytelling",
    "agentic AI",
    "emotional tone moderation",
    "LLM",
    "narrative visualization",
    "TU Dresden",
  ],
  authors: [{ name: "Team — AI-Powered Data Storytelling" }],
  openGraph: {
    title: "AI-Powered Data Storytelling",
    description:
      "Same numbers, two tones. An agentic pipeline that moderates the emotional tone of generated data narratives.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
