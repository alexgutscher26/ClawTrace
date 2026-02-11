import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { blogPosts } from '@/lib/blog-data';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export const metadata = {
    title: 'ClawTrace Blog | AI Agent Orchestration & Fleet Management',
    description: 'Stay updated with the latest in autonomous AI agents, fleet orchestration, and enterprise AI security. Expert insights from the ClawTrace team.',
    openGraph: {
        title: 'ClawTrace Blog',
        description: 'Autonomous AI Agent Orchestration & Fleet Management',
        type: 'website',
    },
};

export default function BlogPage() {
    return (
        <div className="bg-black min-h-screen text-white">
            <Navbar transparent={false} />

            <main className="container mx-auto px-6 pt-32 pb-20">
                <header className="mb-16 max-w-2xl">
                    <Badge variant="outline" className="mb-4 border-white/20 text-zinc-500 font-mono tracking-widest uppercase text-[10px]">
                        Intelligence Stream
                    </Badge>
                    <h1 className="text-5xl font-black tracking-tighter uppercase italic mb-6 leading-none">
                        ClawTrace <span className="text-zinc-600">/</span> Blog
                    </h1>
                    <p className="text-zinc-400 text-lg font-light leading-relaxed">
                        Technical insights, industry analysis, and engineering updates from the forefront of agentic orchestration.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {blogPosts.map((post) => (
                        <Link key={post.slug} href={`/blog/${post.slug}`} className="group relative flex flex-col h-full border border-white/10 bg-zinc-950/50 hover:bg-white/5 transition-all duration-300">
                            <div className="p-8 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <Badge className="bg-white text-black font-bold text-[9px] uppercase tracking-tighter rounded-none h-5 px-2">
                                        {post.category}
                                    </Badge>
                                    <span className="font-mono text-[10px] text-zinc-600 uppercase">
                                        {post.date}
                                    </span>
                                </div>

                                <h2 className="text-xl font-bold tracking-tight mb-4 group-hover:text-emerald-400 transition-colors uppercase italic">
                                    {post.title}
                                </h2>

                                <p className="text-zinc-500 text-sm leading-relaxed mb-8 font-light italic">
                                    {post.description}
                                </p>

                                <div className="mt-auto flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                                        BY {post.author}
                                    </span>
                                    <div className="w-8 h-px bg-white/20 group-hover:w-12 group-hover:bg-white transition-all"></div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Newsletter / CTA */}
                <section className="mt-32 border-t border-white/10 pt-20">
                    <div className="max-w-4xl mx-auto text-center">
                        <h3 className="text-2xl font-bold uppercase italic tracking-tighter mb-4">
                            Join the Fleet
                        </h3>
                        <p className="text-zinc-500 mb-8 max-w-md mx-auto italic">
                            Subscribe to get the latest research on autonomous agent orchestration delivered to your inbox.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <input
                                type="email"
                                placeholder="EMAIL_ADDRESS"
                                className="bg-black border border-white/20 px-4 py-3 font-mono text-xs focus:border-white outline-none w-full sm:w-64"
                            />
                            <button className="bg-white text-black font-bold uppercase text-xs px-8 py-3 hover:bg-zinc-200 transition-colors">
                                SUBSCRIBE
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
