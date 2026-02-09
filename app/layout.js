import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';

const font = Plus_Jakarta_Sans({ subsets: ['latin'] });

export const metadata = {
  title: 'Claw Fleet Orchestrator',
  description:
    'Scale your AI agents from 1 to 100 with centralized fleet management, real-time monitoring, and policy enforcement.',
};

import { FleetProvider } from '@/context/FleetContext';
import { AnalyticsProvider } from '@/context/AnalyticsProvider';
import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`bg-background min-h-screen antialiased ${font.className}`}>
        <FleetProvider>
          <AnalyticsProvider>
            <Toaster richColors position="top-right" theme="dark" />
            {children}
          </AnalyticsProvider>
        </FleetProvider>
      </body>
    </html>
  );
}
