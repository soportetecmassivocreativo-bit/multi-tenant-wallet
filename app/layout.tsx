import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Geist } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "M-Wallet",
  description: "Finanzas, cobros y facturación en la palma de la mano.",
  applicationName: "M-Wallet",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "M-Wallet" },
};

export const viewport: Viewport = {
  themeColor: "#3b5bdb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geist.variable} ${instrument.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-page text-ink font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
