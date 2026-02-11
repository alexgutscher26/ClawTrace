import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { blogPosts } from '@/lib/blog-data';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Share2 } from 'lucide-react';

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const post = blogPosts.find((p) => p.slug === slug);

    if (!post) return {};

    return {
        title: `${post.title} | ClawTrace Blog`,
        description: post.description,
        openGraph: {
            title: post.title,
            description: post.description,
            type: 'article',
            publishedTime: post.date,
            authors: [post.author],
        },
    };
}

export default async function BlogPostPage({ params }) {
    const { slug } = await params;
    const post = blogPosts.find((p) => p.slug === slug);

    if (!post) {
        notFound();
    }

    return (
        <div className="bg-black min-h-screen text-white">
            <Navbar transparent={false} />

            <main className="container mx-auto px-6 pt-32 pb-32">
                <div className="max-w-3xl mx-auto">
                    {/* Breadcrumbs / Back */}
                    <Link href="/blog" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12 font-mono text-xs uppercase tracking-widest group">
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        BACK_TO_INTEL_STREAM
                    </Link>

                    <article>
                        <header className="mb-12">
                            <div className="flex items-center gap-4 mb-6">
                                <Badge className="bg-emerald-500 text-black font-bold text-[9px] uppercase tracking-tighter rounded-none h-5 px-2">
                                    {post.category}
                                </Badge>
                                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600 uppercase">
                                    <Clock className="w-3 h-3" />
                                    {post.date}
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-[1.1] mb-8">
                                {post.title}
                            </h1>

                            <div className="flex items-center justify-between border-y border-white/10 py-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-zinc-800 rounded-none flex items-center justify-center border border-white/20 uppercase font-mono text-xs">
                                        {post.author[0]}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">AUTHOR</div>
                                        <div className="text-sm font-bold uppercase">{post.author}</div>
                                    </div>
                                </div>

                                <button className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-mono text-[10px] uppercase tracking-widest p-2 border border-white/5 hover:border-white/20">
                                    <Share2 className="w-3 h-3" />
                                    SHARE
                                </button>
                            </div>
                        </header>

                        {/* Post Content */}
                        <div
                            className="blog-content max-w-none mb-20 space-y-6 text-zinc-400 text-lg leading-relaxed font-light
                [&_h2]:text-2xl [&_h2]:font-black [&_h2]:uppercase [&_h2]:italic [&_h2]:tracking-tight [&_h2]:text-white [&_h2]:border-l-4 [&_h2]:border-emerald-500 [&_h2]:pl-4 [&_h2]:mt-12 [&_h2]:mb-6
                [&_p]:mb-6
                [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-2 [&_ul]:mb-6
                [&_li]:text-zinc-400
                [&_strong]:text-white [&_strong]:font-bold"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />

                        {/* Post Footer */}
                        <footer className="border-t border-white/10 pt-12 mt-20">
                            <div className="bg-zinc-950 border border-white/10 p-8">
                                <h3 className="text-xl font-black uppercase italic mb-4 tracking-tight">Deploy your fleet today</h3>
                                <p className="text-zinc-500 text-sm mb-6 max-w-md">
                                    ClawTrace provides the industrial-grade orchestration layer for your enterprise AI agent deployment.
                                </p>
                                <Link href="/register" className="inline-block bg-white text-black font-bold uppercase text-xs px-8 py-3 hover:bg-zinc-200 transition-colors">
                                    GET STARTED FREE
                                </Link>
                            </div>
                        </footer>
                    </article>
                </div>
            </main>
        </div>
    );
}
