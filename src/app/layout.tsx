import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://MockLAB.in";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MockLAB· Free Online Mock Tests for IBPS, SBI & RRB Exams",
    template: "%s | MockLAB",
  },
  description:
    "Practice full-length timed mock exams and sectional tests for IBPS PO, IBPS Clerk, SBI PO, SBI Clerk, and RRB Scale-I. Features official exam countdown timers, negative marking calculator, and instant answer evaluations.",
  applicationName: "MockLAB",
  authors: [{ name: "MockLABTeam" }],
  generator: "Next.js",
  keywords: [
    // Core Examination Keywords
    "IBPS PO Mock Test",
    "SBI PO Mock Test",
    "IBPS Clerk Mock Test",
    "SBI Clerk Mock Test",
    "IBPS RRB Officer Scale 1 Mock Test",
    "Banking Exam Preparation",
    // Sectional & Topic Keywords
    "Quantitative Aptitude Practice Test",
    "Reasoning Ability Puzzles Online Test",
    "English Language Bank Exam Mocks",
    "Computer Awareness Mock Test",
    "General Awareness for Banking",
    // Feature & User Intent Keywords
    "Free Banking Mock Test with Timer",
    "Online Test Series for Banking Exams",
    "IBPS Mock Test with Negative Marking",
    "Bank Exam Question Paper Parser",
    "Practice Mocks No Login Required",
  ],
  creator: "MockLAB",
  publisher: "MockLAB Education",
  category: "Education",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "MockLAB",
    title: "MockLAB · Free Online Mock Tests for IBPS, SBI & RRB",
    description:
      "Prepare for bank exams with high-precision sectional timers, authentic question palettes, and instant accuracy evaluation.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MockLAB - Online Banking Mock Examination Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MockLAB · Online Mock Examination Suite",
    description:
      "Practice timed IBPS PO, SBI PO, and RRB Prelims/Mains mock tests with negative marking and instant answer analysis.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Geographic and Regional Target Signals
  other: {
    "geo.region": "IN",
    "geo.placename": "India",
    "geo.position": "20.5937;78.9629",
    ICBM: "20.5937, 78.9629",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Answer Engine Optimization (AEO) Schema.org Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: "MockLAB",
        url: SITE_URL,
        applicationCategory: "EducationalApplication",
        operatingSystem: "All modern browsers (Chrome, Edge, Safari, Firefox)",
        browserRequirements: "Requires JavaScript. Requires HTML5.",
        description:
          "Web application for bank examination mock tests simulating official IBPS, SBI, and RRB computer-based exams.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
        },
      },
      {
        "@type": "EducationalOrganization",
        "@id": `${SITE_URL}/#organization`,
        name: "MockLAB",
        url: SITE_URL,
        logo: `${SITE_URL}/icon`,
        description:
          "Free testing and assessment workspace for banking aspirants targeting IBPS, SBI, RRB, and RBI recruitment examinations.",
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "How does the MockLAB mock exam countdown timer work?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "MockLAB enforces official IBPS and SBI exam patterns with automated sectional countdown timers (e.g. 20 minutes each for Quantitative Aptitude, Reasoning, and English Language). When a section's timer expires, the test automatically transitions to the next configured section.",
            },
          },
          {
            "@type": "Question",
            name: "Is negative marking calculated in the test results?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. MockLAB accurately calculates exam scores using the official banking marking scheme: +1.00 mark for every correct response and −0.25 penalty for every incorrect answer.",
            },
          },
          {
            "@type": "Question",
            name: "Can I import and test my own question papers?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. MockLAB includes an authoring studio that parses raw question text, pairs answer keys, attaches diagrams/figures, and saves tests directly to your account or browser storage.",
            },
          },
        ],
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[#fafafa] antialiased selection:bg-slate-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}