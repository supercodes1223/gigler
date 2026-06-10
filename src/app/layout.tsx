import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gigler.ai";

const siteTitle = "Gigler — Your personal assistant, one text away";
const siteDescription =
  "Gigler is a personal assistant you text, call, and email like a real person. It remembers your life and actually gets things done. No app to download.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbfbfa",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | Gigler",
  },
  description: siteDescription,
  keywords: [
    "personal assistant",
    "AI assistant",
    "text assistant",
    "assistant you can text",
    "no-app assistant",
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
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Gigler — Text it. Call it. Email it. Done.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
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
      logo: `${siteUrl}/apple-icon`,
      description: siteDescription,
      sameAs: [],
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
      className={cn("antialiased font-sans", geist.variable, geistMono.variable)}
    >
      <head>
        <JsonLd />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
