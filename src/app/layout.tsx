import type { Metadata } from "next";
import { Roboto_Slab, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  variable: "--font-roboto-slab",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Iron Ledger | Exercise & Protein Tracker",
  description: "Old-school weight lifting journal with protein tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${robotoSlab.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
