import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';

const font = Plus_Jakarta_Sans({ subsets: ['latin'] });

export const metadata = {
  title: {
    default: 'ClawTrace Orchestrator',
    template: '%s | ClawTrace Orchestrator',
  },
  description:
    'Monitor and manage 1,000+ AI agents with sub-millisecond telemetry. The high-performance command center for autonomous silicon fleets.',
  keywords: [
    'sub-millisecond telemetry',
    'AI agents',
    'fleet management',
    'orchestration',
    'low-latency monitoring',
    'E2EE agents',
    'agent swarms',
    'policy guardrails',
  ],
  authors: [{ name: 'ClawTrace Team' }],
  creator: 'ClawTrace',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://clawtrace.dev',
    title: 'ClawTrace | Sub-ms Agent Orchestration',
    description:
      'Monitor and manage 1,000+ AI agents with sub-millisecond telemetry. The high-performance command center for autonomous silicon fleets.',
    siteName: 'ClawTrace',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClawTrace | Sub-ms Agent Orchestration',
    description:
      'Monitor and manage 1,000+ AI agents with sub-millisecond telemetry. The high-performance command center for autonomous silicon fleets.',
    creator: '@snackforcode',
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
import Script from 'next/script';

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
        <Script
          data-domain="clawtrace.dev"
          data-site-id="P-WGRVXRLDI0COPTS2SDHDG"
          src="/js/pixel.min.js"
          defer
        />
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
