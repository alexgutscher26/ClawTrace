import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';

const font = Plus_Jakarta_Sans({ subsets: ['latin'] });

export const metadata = {
  title: {
    default: 'Claw Fleet Orchestrator',
    template: '%s | Claw Fleet Orchestrator',
  },
  description:
    'Scale your AI agents from 1 to 100 with centralized fleet management, real-time monitoring, and policy enforcement.',
  keywords: ['AI agents', 'fleet management', 'orchestration', 'monitoring', 'policy enforcement', 'SaaS', 'LLM ops'],
  authors: [{ name: 'OpenClaw Team' }],
  creator: 'OpenClaw',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://claw.openclaw.ai',
    title: 'Claw Fleet Orchestrator',
    description:
      'Scale your AI agents from 1 to 100 with centralized fleet management, real-time monitoring, and policy enforcement.',
    siteName: 'Claw Fleet Orchestrator',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Claw Fleet Orchestrator',
    description:
      'Scale your AI agents from 1 to 100 with centralized fleet management, real-time monitoring, and policy enforcement.',
    creator: '@snackforcode',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import { Suspense } from 'react';
import { FleetProvider } from '@/context/FleetContext';
import { AnalyticsProvider } from '@/context/AnalyticsProvider';
import { Toaster } from 'sonner';
import { CommandPalette } from '@/components/CommandPalette';

/**
 * Renders the root layout of the application with children components.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`bg-background min-h-screen antialiased ${font.className}`}
        suppressHydrationWarning
      >
        <FleetProvider>
          <Suspense fallback={null}>
            <AnalyticsProvider>
              <Toaster richColors position="top-right" theme="dark" />
              <CommandPalette />
              {children}
            </AnalyticsProvider>
          </Suspense>
        </FleetProvider>
      </body>
    </html>
  );
}
