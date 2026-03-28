import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EnhanceAI - AI Image Enhancement",
  description: "Upscale, denoise & sharpen your images with AI",
  keywords: ["ai photo enhancer", "image upscaler", "ai image enhancer"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
