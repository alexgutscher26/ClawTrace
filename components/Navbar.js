'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Zap, X, Menu, Terminal } from 'lucide-react';

/**
 * Renders a technical, industrial-style navigation bar with session management.
 *
 * The Navbar component utilizes the session state to conditionally render authentication actions. It features a grid-based layout and includes navigation items that can be either internal links or external buttons. The component also manages a mobile menu toggle and handles user logout, ensuring the session state is cleared and the user is redirected appropriately.
 *
 * @param {Object} props - The properties for the Navbar component.
 * @param {Object} props.session - The current user session.
 * @param {Object} props.branding - The branding information for the application.
 * @param {boolean} [props.transparent=false] - Indicates if the navbar should be transparent.
 * @returns {JSX.Element} The rendered Navbar component.
 */
export default function Navbar({ session, branding, transparent = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh(); // Ensure session state clears
  };

  const NavItem = ({ href, label, external = false }) => {
    if (external) {
      return (
        <button
          onClick={() => window.open(href, '_blank')}
          className="relative h-full px-6 flex items-center justify-center font-mono text-xs text-zinc-400 hover:text-white hover:bg-white/5 border-r border-white/10 uppercase tracking-widest transition-all group"
        >
          <span className="group-hover:translate-x-1 transition-transform duration-300">{label}</span>
          <span className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </button>
      )
    }
    return (
      <Link
        href={href}
        className="relative h-full px-6 flex items-center justify-center font-mono text-xs text-zinc-400 hover:text-white hover:bg-white/5 border-r border-white/10 uppercase tracking-widest transition-all group"
      >
        <span className="group-hover:translate-x-1 transition-transform duration-300">{label}</span>
        <span className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      </Link>
    );
  };

  const isHome = pathname === '/';

  return (
    <nav
      className={`fixed ${isHome ? 'top-8' : 'top-0'} right-0 left-0 z-40 border-y border-white/10 transition-all duration-300 bg-black/90 backdrop-blur-md`}
    >
      <div className="container mx-auto grid h-16 grid-cols-2 md:grid-cols-12">
        {/* Logo Section */}
        <div className="col-span-1 flex items-center border-r border-white/10 px-4 md:col-span-3 md:px-0">
          <Link href="/" className="group flex cursor-pointer items-center gap-3 pl-6 h-full w-full hover:bg-white/5 transition-colors">
            <div className="flex h-6 w-6 items-center justify-center border border-white/20 bg-black group-hover:border-emerald-500 transition-colors">
              <Terminal className="h-3 w-3 text-white group-hover:text-emerald-500" />
            </div>
            {branding?.name ? (
              <span className="font-mono text-sm font-bold tracking-tighter text-white uppercase transform group-hover:translate-x-1 transition-transform">
                {branding.name}
              </span>
            ) : (
              <span className="font-mono text-sm font-bold tracking-tighter text-white">
                CLAWTRACE<span className="text-zinc-600">//</span>OS
              </span>
            )}
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="col-span-6 hidden md:flex items-center h-full">
          <NavItem href="/dashboard/settings" label="Settings" />
          <NavItem href="/changelog" label="Logs" />
          <NavItem href="/docs" label="Manual" />
          <NavItem href="https://github.com/alexgutscher26/fleet" label="Source" external />
        </div>

        {/* Auth Actions */}
        <div className="col-span-1 flex items-center justify-end md:col-span-3">
          {session ? (
            <div className="flex h-full w-full">
              <Link
                href="/dashboard"
                className="flex h-full flex-1 items-center justify-center border-l border-white/10 bg-white text-black font-mono text-xs font-bold uppercase hover:bg-emerald-500 hover:text-black transition-colors"
              >
                Console
              </Link>
              <button
                onClick={handleLogout}
                className="h-full px-6 text-xs font-mono font-bold text-zinc-500 uppercase border-l border-white/10 hover:bg-red-500/10 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex h-full w-full font-mono">
              <Link
                href="/login"
                className="flex h-full flex-1 items-center justify-center border-l border-white/10 text-xs text-zinc-400 uppercase hover:text-white hover:bg-white/5 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="flex h-full flex-1 items-center justify-center border-l border-white/10 bg-white/5 text-xs font-bold text-white uppercase hover:bg-emerald-500 hover:text-black transition-colors"
              >
                Init_Key
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="flex h-full w-16 items-center justify-center border-l border-white/10 text-white md:hidden hover:bg-white/5"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {open && (
        <div className="border-b border-white/10 bg-black md:hidden animate-in slide-in-from-top-2">
          <Link
            href="/docs"
            onClick={() => setOpen(false)}
            className="block w-full border-b border-white/10 p-4 font-mono text-xs text-zinc-400 uppercase hover:text-white hover:bg-white/5"
          >
            Running Manual
          </Link>
          <Link
            href="/changelog"
            onClick={() => setOpen(false)}
            className="block w-full border-b border-white/10 p-4 font-mono text-xs text-zinc-400 uppercase hover:text-white hover:bg-white/5"
          >
            System Logs
          </Link>
          {session ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block w-full border-b border-white/10 p-4 font-mono text-xs text-emerald-500 font-bold uppercase hover:bg-white/5"
              >
                &gt; Open Console
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setOpen(false);
                }}
                className="block w-full p-4 font-mono text-xs text-red-500 uppercase hover:bg-red-500/10"
              >
                Terminate Session
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block w-full border-b border-white/10 p-4 font-mono text-xs text-white uppercase hover:bg-white/5"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="block w-full p-4 font-mono text-xs font-bold text-emerald-500 uppercase hover:bg-emerald-500/10"
              >
                Initialize Key
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
