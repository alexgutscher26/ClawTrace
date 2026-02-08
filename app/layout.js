import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'

const font = Plus_Jakarta_Sans({ subsets: ['latin'] })

export const metadata = {
  title: 'OpenClaw Fleet Orchestrator',
  description: 'Scale your AI agents from 1 to 100 with centralized fleet management, real-time monitoring, and policy enforcement.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`min-h-screen bg-background antialiased ${font.className}`}>
        {children}
      </body>
    </html>
  )
}
