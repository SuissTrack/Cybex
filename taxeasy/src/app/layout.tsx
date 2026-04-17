import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "TaxEasy — Déclaration d'impôt genevoise",
  description:
    "Déclarez vos impôts genevois facilement. Calcul ICC + IFD en temps réel, export GeTax .tax, conforme au guide AFC-GE 2025.",
  openGraph: {
    title: "TaxEasy",
    description: "Déclaration d'impôt genevoise automatisée — AFC-GE 2025",
    locale: "fr_CH",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
