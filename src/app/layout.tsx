import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduAi — Educational AI Platform",
  description: "AI-powered document processing, summarization, question and exam generation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
