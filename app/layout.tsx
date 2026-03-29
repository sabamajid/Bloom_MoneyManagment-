import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-app",
});

export const metadata: Metadata = {
  title: "Bloom Money Management",
  description:
    "A modern personal expense tracker built with Next.js, Tailwind, and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} h-full`}>
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
