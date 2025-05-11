'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PassageLogin from '@/components/login';

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Hero Section */}
      <section className="w-full bg-gradient-to-br from-primary-100 to-secondary-100 py-16 md:py-24">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-16 md:mb-0">
            <h1 className="text-4xl md:text-6xl font-bold text-primary-900 mb-6">
              Your Relationship,<br />
              <span className="text-secondary-600">Beautifully Nestled</span>
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              A private, delightful space for couples to journal together, plan dates, and build a scrapbook of memories.
            </p>
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
              <PassageLogin />
            </div>
          </div>
          <div className="md:w-1/2 md:pl-12">
            {/* Placeholder for an illustration/image */}
            <div className="rounded-lg bg-white p-4 shadow-lg h-80 flex items-center justify-center">
              <p className="text-center text-gray-500">Couple Illustration</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-primary-800 mb-12">Everything You Need</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-primary-50 rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary-200 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary-800 text-xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold text-primary-800 mb-2">Daily Journal</h3>
              <p className="text-gray-600">
                Quick, fun daily prompts to keep you connected even on busy days.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-primary-50 rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary-200 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary-800 text-xl">🗓️</span>
              </div>
              <h3 className="text-xl font-semibold text-primary-800 mb-2">Date Planner</h3>
              <p className="text-gray-600">
                Plan and organize special moments together with ease.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-primary-50 rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary-200 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary-800 text-xl">📸</span>
              </div>
              <h3 className="text-xl font-semibold text-primary-800 mb-2">Shared Scrapbook</h3>
              <p className="text-gray-600">
                Create a beautiful memory archive you can revisit anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Callout */}
      <section className="w-full py-16 bg-secondary-50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-secondary-800 mb-4">Your Relationship, Your Space</h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
            Nestled is designed with privacy at its core. All your data is end-to-end encrypted and never shared.
          </p>
          <div className="bg-white inline-block rounded-full py-2 px-4 shadow-sm">
            <span className="text-lg text-secondary-700 font-medium">🔒 Private by Default</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-100 py-6">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} Nestled. All rights reserved.
          </div>
          <div className="space-x-4">
            <Link href="/privacy" className="text-sm text-gray-600 hover:text-primary-600">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-gray-600 hover:text-primary-600">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
