'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Zap, X, Menu, ArrowLeft } from 'lucide-react';

/**
 * Renders a responsive navigation bar with authentication options.
 *
 * The Navbar component utilizes session information to conditionally render links for settings, console, and logout actions. It also includes branding and a mobile menu toggle. The handleLogout function is called to sign out the user and refresh the session state. The component adapts its appearance based on the transparent prop and the open state for mobile navigation.
 *
 * @param {Object} props - The component props.
 * @param {Object} props.session - The current user session.
 * @param {Object} props.branding - The branding information for the application.
 * @param {boolean} [props.transparent=false] - Determines if the navbar should be transparent.
 * @returns {JSX.Element} The rendered Navbar component.
 */
export default function Navbar({ session, branding, transparent = false }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh(); // Ensure session state clears
  };

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 border-b border-white transition-colors duration-300 ${transparent ? 'border-transparent bg-transparent' : 'border-white/10 bg-black'}`}
    >
      <div className="container mx-auto grid h-16 grid-cols-2 md:grid-cols-12">
        {/* Logo Section */}
        <div className="col-span-1 flex items-center border-r border-white/20 px-4 md:col-span-3 md:px-6">
          <Link href="/" className="group flex cursor-pointer items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center bg-white transition-transform group-hover:rotate-180">
              <Zap className="h-3 w-3 fill-black text-black" />
            </div>
            {branding?.name ? (
              <span className="font-mono text-lg font-bold tracking-tighter text-white uppercase italic">
                {branding.name}
              </span>
            ) : (
              <span className="font-mono text-lg font-bold tracking-tighter text-white">
                ClawTrace<span className="text-zinc-500">//</span>OS
              </span>
            )}
          </Link>
        </div>

        {/* Center / Spacer */}
        <div className="col-span-5 hidden items-center border-r border-white/20 px-6 md:flex">
          <div className="flex gap-6 font-mono text-xs tracking-widest text-zinc-500 uppercase">
            {session && (
              <Link href="/dashboard/settings" className="transition-colors hover:text-white">
                SETTINGS
              </Link>
            )}
            <Link href="/changelog" className="transition-colors hover:text-white">
              CHANGELOG
            </Link>
            <Link href="/pricing" className="transition-colors hover:text-white">
              PRICING
            </Link>
            <Link href="/blog" className="transition-colors hover:text-white">
              BLOG
            </Link>
            <Link href="/docs" className="transition-colors hover:text-white">
              DOCS
            </Link>
            <button
              onClick={() => window.open('https://github.com/alexgutscher26/fleet', '_blank')}
              className="transition-colors hover:text-white"
            >
              GITHUB
            </button>
          </div>
        </div>

        {/* Auth Actions */}
        <div className="col-span-1 flex items-center justify-end md:col-span-4">
          {session ? (
            <div className="flex h-full w-full">
              <Link
                href="/dashboard"
                className="flex h-full flex-1 items-center justify-center border-r border-white/20 text-xs font-bold uppercase transition-colors hover:bg-white hover:text-black"
              >
                CONSOLE
              </Link>
              <button
                onClick={handleLogout}
                className="h-full w-24 text-xs font-bold text-red-500 uppercase transition-colors hover:bg-red-500 hover:text-black"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <div className="flex h-full w-full">
              <Link
                href="/login"
                className="flex h-full flex-1 items-center justify-center border-r border-white/20 text-xs text-white uppercase transition-colors hover:bg-white/10"
              >
                LOGIN
              </Link>
              <Link
                href="/register"
                className="flex h-full flex-1 items-center justify-center bg-white text-xs font-bold text-black uppercase transition-colors hover:bg-zinc-200"
              >
                GET KEY
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="flex h-full w-16 items-center justify-center border-l border-white/20 text-white md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="border-b border-white bg-black p-0 md:hidden">
          <Link
            href="/pricing"
            onClick={() => setOpen(false)}
            className="block w-full border-b border-white/10 p-4 text-left font-mono text-xs text-white uppercase hover:bg-white/10"
          >
            PRICING
          </Link>
          <Link
            href="/blog"
            onClick={() => setOpen(false)}
            className="block w-full border-b border-white/10 p-4 text-left font-mono text-xs text-white uppercase hover:bg-white/10"
          >
            BLOG
          </Link>
          {session ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block w-full border-b border-white/10 p-4 text-left font-mono text-xs text-white uppercase hover:bg-white/10"
              >
                CONSOLE
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setOpen(false);
                }}
                className="block w-full p-4 text-left font-mono text-xs text-red-500 uppercase hover:bg-red-500 hover:text-black"
              >
                LOGOUT
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block w-full border-b border-white/10 p-4 text-left font-mono text-xs text-white uppercase hover:bg-white/10"
              >
                LOGIN
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="block w-full bg-white p-4 text-left text-xs font-bold text-black uppercase"
              >
                GET KEY
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
