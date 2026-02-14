import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { blogPosts } from '@/lib/blog-data';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'ClawTrace Blog | AI Agent Orchestration & Fleet Management',
  description:
    'Stay updated with the latest in autonomous AI agents, fleet orchestration, and enterprise AI security. Expert insights from the ClawTrace team.',
  openGraph: {
    title: 'ClawTrace Blog',
    description: 'Autonomous AI Agent Orchestration & Fleet Management',
    type: 'website',
  },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar transparent={false} />

      <main className="container mx-auto px-6 pt-32 pb-20">
        <header className="mb-16 max-w-2xl">
          <Badge
            variant="outline"
            className="mb-4 border-white/20 font-mono text-[10px] tracking-widest text-zinc-500 uppercase"
          >
            Intelligence Stream
          </Badge>
          <h1 className="mb-6 text-5xl leading-none font-black tracking-tighter uppercase italic">
            ClawTrace <span className="text-zinc-600">/</span> Blog
          </h1>
          <p className="text-lg leading-relaxed font-light text-zinc-400">
            Technical insights, industry analysis, and engineering updates from the forefront of
            agentic orchestration.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group relative flex h-full flex-col border border-white/10 bg-zinc-950/50 transition-all duration-300 hover:bg-white/5"
            >
              <div className="flex h-full flex-col p-8">
                <div className="mb-6 flex items-start justify-between">
                  <Badge className="h-5 rounded-none bg-white px-2 text-[9px] font-bold tracking-tighter text-black uppercase">
                    {post.category}
                  </Badge>
                  <span className="font-mono text-[10px] text-zinc-600 uppercase">{post.date}</span>
                </div>

                <h2 className="mb-4 text-xl font-bold tracking-tight uppercase italic transition-colors group-hover:text-emerald-400">
                  {post.title}
                </h2>

                <p className="mb-8 text-sm leading-relaxed font-light text-zinc-500 italic">
                  {post.description}
                </p>

                <div className="mt-auto flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
                    BY {post.author}
                  </span>
                  <div className="h-px w-8 bg-white/20 transition-all group-hover:w-12 group-hover:bg-white"></div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Newsletter / CTA */}
        <section className="mt-32 border-t border-white/10 pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <h3 className="mb-4 text-2xl font-bold tracking-tighter uppercase italic">
              Join the Fleet
            </h3>
            <p className="mx-auto mb-8 max-w-md text-zinc-500 italic">
              Subscribe to get the latest research on autonomous agent orchestration delivered to
              your inbox.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <input
                type="email"
                placeholder="EMAIL_ADDRESS"
                className="w-full border border-white/20 bg-black px-4 py-3 font-mono text-xs outline-none focus:border-white sm:w-64"
              />
              <button className="bg-white px-8 py-3 text-xs font-bold text-black uppercase transition-colors hover:bg-zinc-200">
                SUBSCRIBE
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
