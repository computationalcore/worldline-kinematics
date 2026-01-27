/**
 * Root layout for Worldline Kinematics.
 */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Worldline Kinematics',
  description: 'Cosmic Observer Motion Across Reference Frames',
  keywords: [
    'worldline',
    'kinematics',
    'cosmic',
    'space',
    'velocity',
    'physics',
    'reference frames',
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-neutral-950 text-white antialiased">{children}</body>
    </html>
  );
}
