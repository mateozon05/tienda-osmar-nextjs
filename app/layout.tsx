import type { Metadata } from "next";
import { DM_Sans, Syne, Epilogue, Manrope } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
});

const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-epilogue",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Distribuidora Osmar – Artículos de Limpieza",
  description: "Mayorista y minorista de artículos de limpieza. Tigre, Buenos Aires.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${dmSans.variable} ${syne.variable} ${epilogue.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
