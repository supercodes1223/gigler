import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gigler.ai";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06b6d4",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Gigler — AI Gig Worker for Real Work",
    template: "%s | Gigler",
  },
  description:
    "Gigler turns simple text, email, or voice requests into completed work — coding, planning, documents, workflows, and more.",
  keywords: [
    "AI assistant",
    "SMS assistant",
    "text AI",
    "gig work",
    "AI event planner",
    "AI coding assistant",
    "AI business consultant",
    "AI over text",
    "no-app AI",
  ],
  authors: [{ name: "Gigler" }],
  creator: "Gigler",
  publisher: "Gigler",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Gigler",
    title: "Gigler — AI Gig Worker for Real Work",
    description:
      "Gigler turns simple text, email, or voice requests into completed work — coding, planning, documents, workflows, and more.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Gigler — AI Gig Worker for Real Work",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gigler — AI Gig Worker for Real Work",
    description:
      "Gigler turns simple text, email, or voice requests into completed work — coding, planning, documents, workflows, and more.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: siteUrl,
  },
};

function JsonLd() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Gigler",
      url: siteUrl,
      logo: `${siteUrl}/icon.png`,
      description:
        "AI gig worker that turns simple text, email, or voice requests into completed work.",
      sameAs: [],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Gigler",
      url: siteUrl,
      applicationCategory: "Productivity",
      operatingSystem: "Any (SMS-based)",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "0",
        highPrice: "100",
        priceCurrency: "USD",
        offerCount: 4,
      },
      description:
        "AI gig worker for coding, planning, documents, workflows, and real work through text, email, or voice.",
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Gigler AI",
      description:
        "AI gig worker for managing projects, events, coding, business tasks, and more.",
      brand: { "@type": "Brand", name: "Gigler" },
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "USD",
          description: "5 active gigs, SMS only, basic AI",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "25",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            billingDuration: "P1M",
          },
          description:
            "Unlimited gigs, voice calls, group gigs, unlimited deliverables",
        },
        {
          "@type": "Offer",
          name: "Team",
          price: "100",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            billingDuration: "P1M",
          },
          description: "Up to 10 users, shared workspaces, team admin",
        },
      ],
    },
  ];

  return (
    <>
      {structuredData.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        <JsonLd />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
