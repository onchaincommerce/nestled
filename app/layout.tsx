import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nestled - Shared Journal & Memory App for Couples",
  description: "A private, delightful space for couples to journal together, plan dates, and curate a shared scrapbook.",
  manifest: "/manifest.json",
  themeColor: "#5571F5",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nestled"
  },
  icons: {
    icon: "/icons/favicon.ico",
    shortcut: "/icons/favicon-16x16.png",
    apple: "/icons/apple-touch-icon.png",
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
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" href="/icons/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <script src="https://cdn.passage.id/passage-web.js"></script>
      </head>
      <body className="min-h-screen text-gray-900">
        {children}
      </body>
    </html>
  );
}
