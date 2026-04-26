import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://enhanceai.online";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "EnhanceAI — Free AI Image Enhancer & 4× Super Resolution",
    template: "%s | EnhanceAI",
  },
  description:
    "Enhance your images for free with AI-powered 4× super resolution. Upscale, denoise & sharpen photos instantly. No software to install — works in your browser.",
  keywords: [
    "ai image enhancer",
    "ai photo enhancer",
    "image upscaler",
    "super resolution",
    "upscale image",
    "4x upscale",
    "enhance photo quality",
    "free image enhancer",
    "ai upscaler online",
    "image quality enhancer",
  ],
  authors: [{ name: "EnhanceAI" }],
  creator: "EnhanceAI",
  publisher: "EnhanceAI",
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
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "EnhanceAI",
    title: "EnhanceAI — Free AI Image Enhancer & 4× Super Resolution",
    description:
      "Enhance your images for free with AI-powered 4× super resolution. Upscale, denoise & sharpen photos instantly in your browser.",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "EnhanceAI — AI Image Enhancement",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EnhanceAI — Free AI Image Enhancer & 4× Super Resolution",
    description:
      "Enhance your images for free with AI-powered 4× super resolution. Works in your browser, no software needed.",
    images: [`${siteUrl}/og-image.png`],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "EnhanceAI",
    url: siteUrl,
    description:
      "AI-powered image enhancement tool that upscales images to 4× resolution with super resolution technology.",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free plan — 3 enhancements total",
      },
      {
        "@type": "Offer",
        price: "4.90",
        priceCurrency: "USD",
        description: "Pro Monthly — 100 enhancements per month",
      },
      {
        "@type": "Offer",
        price: "49.00",
        priceCurrency: "USD",
        description: "Pro Lifetime — unlimited access",
      },
    ],
    featureList: [
      "4× AI Super Resolution",
      "Noise Reduction",
      "Detail Recovery",
      "JPEG/PNG/WebP Support",
      "Browser-based Processing",
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is AI image enhancement?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "AI image enhancement uses deep learning models to intelligently upscale images, recovering fine details, removing noise, and sharpening edges that traditional methods can't achieve.",
        },
      },
      {
        "@type": "Question",
        name: "How much does EnhanceAI cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "EnhanceAI offers 3 free enhancements total. For heavy users, our Pro plan starts at $4.9/month with 100 enhancements per month and up to 8× upscaling.",
        },
      },
      {
        "@type": "Question",
        name: "What image formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We support JPEG, PNG, and WebP formats. Maximum file size is 5MB.",
        },
      },
      {
        "@type": "Question",
        name: "Is my data safe?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely. Images are processed in real-time on secure edge servers. We don't permanently store your original or enhanced images on our servers.",
        },
      },
      {
        "@type": "Question",
        name: "How does the 4× upscaling work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We use AuraSR v2, a state-of-the-art super-resolution AI model. It analyzes your image and generates new pixels with realistic details, effectively quadrupling the resolution.",
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        {/* Google Fonts preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS prefetch & preconnect for critical third-party origins */}
        <link rel="dns-prefetch" href="https://accounts.google.com" />
        <link rel="preconnect" href="https://accounts.google.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.paypal.com" />
        <link rel="preconnect" href="https://www.paypal.com" crossOrigin="anonymous" />

        {/* JSON-LD structured data — inlined for instant SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
