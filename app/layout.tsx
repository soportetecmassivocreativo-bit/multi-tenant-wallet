import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Geist } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AdaptiveFavicon } from "@/components/providers/adaptive-favicon";
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
  title: "Massivo-Wallet",
  description: "Finanzas, cobros y facturación en la palma de la mano.",
  applicationName: "Massivo-Wallet",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Massivo-Wallet" },
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
        <ThemeProvider>
          <AdaptiveFavicon />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
