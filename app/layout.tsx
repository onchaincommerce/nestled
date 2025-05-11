import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nestled - Shared Journal & Memory App for Couples",
  description: "A private, delightful space for couples to journal together, plan dates, and curate a shared scrapbook.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
