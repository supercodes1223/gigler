import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gigler.ai";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Gigler - AI That Lives in Your Texts | All Over Text. Simple. Just Done.",
    template: "%s | Gigler",
  },
  description:
    "Gigler is an AI assistant that lives in your text messages. Create Gigs — projects, tasks, anything you need done — by texting. No app. No dashboard. Just text it, it gets done.",
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
    title: "Gigler - AI That Lives in Your Texts",
    description:
      "Create Gigs by texting. Plan events, build websites, form an LLC, make reservations — all over text. Simple. Just done.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Gigler - All over text. Simple. Just done.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gigler - AI That Lives in Your Texts",
    description:
      "Create Gigs by texting. Plan events, build websites, form an LLC, make reservations — all over text.",
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
        "AI assistant that lives in your text messages. Create and manage Gigs by texting.",
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
        highPrice: "50",
        priceCurrency: "USD",
        offerCount: 4,
      },
      description:
        "AI that manages your gigs over text. Events, coding, business formation, creative work — text it, it gets done.",
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Gigler AI",
      description:
        "SMS-based AI assistant for managing projects, events, coding, business tasks, and more.",
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
          price: "20",
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
          price: "50",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <JsonLd />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
