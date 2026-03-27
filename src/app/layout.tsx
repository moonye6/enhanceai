import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EnhanceAI - 一键 AI 图片增强",
  description: "让每张照片都高清，仅需 $4.9/月",
  keywords: ["ai photo enhancer", "image upscaler", "ai image enhancer"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
