import type { Metadata } from "next";
import "./globals.css";
import PwaProvider from "@/components/pwa-provider";

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
    icon: "data:image/svg+xml,%3Csvg%20width%3D%22192%22%20height%3D%22192%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22192%22%20height%3D%22192%22%20fill%3D%22%23EF6F6C%22%20rx%3D%2220%25%22%20ry%3D%2220%25%22%20%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%22%20font-weight%3D%22bold%22%20font-size%3D%2276.8%22%20fill%3D%22white%22%3EN%3C%2Ftext%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2270%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%22%20font-size%3D%2219.2%22%20fill%3D%22white%22%3ENestled%3C%2Ftext%3E%3C%2Fsvg%3E",
    apple: "data:image/svg+xml,%3Csvg%20width%3D%22192%22%20height%3D%22192%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22192%22%20height%3D%22192%22%20fill%3D%22%23EF6F6C%22%20rx%3D%2220%25%22%20ry%3D%2220%25%22%20%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%22%20font-weight%3D%22bold%22%20font-size%3D%2276.8%22%20fill%3D%22white%22%3EN%3C%2Ftext%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2270%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%22%20font-size%3D%2219.2%22%20fill%3D%22white%22%3ENestled%3C%2Ftext%3E%3C%2Fsvg%3E"
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
        <link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg%20width%3D%22192%22%20height%3D%22192%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22192%22%20height%3D%22192%22%20fill%3D%22%23EF6F6C%22%20rx%3D%2220%25%22%20ry%3D%2220%25%22%20%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%22%20font-weight%3D%22bold%22%20font-size%3D%2276.8%22%20fill%3D%22white%22%3EN%3C%2Ftext%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2270%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%22%20font-size%3D%2219.2%22%20fill%3D%22white%22%3ENestled%3C%2Ftext%3E%3C%2Fsvg%3E" />
        <script src="https://cdn.passage.id/passage-web.js"></script>
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <PwaProvider>
          {children}
        </PwaProvider>
      </body>
    </html>
  );
}
