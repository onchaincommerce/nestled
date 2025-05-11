import type { Metadata } from "next";
import "./globals.css";
import PwaProvider from "./components/pwa-provider";

export const metadata: Metadata = {
  title: "Nestled - Shared Journal & Memory App for Couples",
  description: "A private, delightful space for couples to journal together, plan dates, and curate a shared scrapbook.",
  manifest: "/manifest.json",
  themeColor: "#EF6F6C",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nestled"
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Nestled" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <PwaProvider>
          {children}
        </PwaProvider>
      </body>
    </html>
  );
}
