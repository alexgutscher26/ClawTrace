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
    <div className="min-h-screen bg-black text-white">
      <Navbar transparent={false} />

      <main className="container mx-auto px-6 pt-32 pb-32">
        <div className="mx-auto max-w-3xl">
          {/* Breadcrumbs / Back */}
          <Link
            href="/blog"
            className="group mb-12 inline-flex items-center gap-2 font-mono text-xs tracking-widest text-zinc-500 uppercase transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
            BACK_TO_INTEL_STREAM
          </Link>

          <article>
            <header className="mb-12">
              <div className="mb-6 flex items-center gap-4">
                <Badge className="h-5 rounded-none bg-emerald-500 px-2 text-[9px] font-bold tracking-tighter text-black uppercase">
                  {post.category}
                </Badge>
                <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-600 uppercase">
                  <Clock className="h-3 w-3" />
                  {post.date}
                </div>
              </div>

              <h1 className="mb-8 text-4xl leading-[1.1] font-black tracking-tighter uppercase italic md:text-6xl">
                {post.title}
              </h1>

              <div className="flex items-center justify-between border-y border-white/10 py-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-none border border-white/20 bg-zinc-800 font-mono text-xs uppercase">
                    {post.author[0]}
                  </div>
                  <div>
                    <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                      AUTHOR
                    </div>
                    <div className="text-sm font-bold uppercase">{post.author}</div>
                  </div>
                </div>

                <button className="flex items-center gap-2 border border-white/5 p-2 font-mono text-[10px] tracking-widest text-zinc-500 uppercase transition-colors hover:border-white/20 hover:text-white">
                  <Share2 className="h-3 w-3" />
                  SHARE
                </button>
              </div>
            </header>

            {/* Post Content */}
            <div
              className="blog-content mb-20 max-w-none space-y-6 text-lg leading-relaxed font-light text-zinc-400 [&_h2]:mt-12 [&_h2]:mb-6 [&_h2]:border-l-4 [&_h2]:border-emerald-500 [&_h2]:pl-4 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:tracking-tight [&_h2]:text-white [&_h2]:uppercase [&_h2]:italic [&_li]:text-zinc-400 [&_p]:mb-6 [&_strong]:font-bold [&_strong]:text-white [&_ul]:mb-6 [&_ul]:list-inside [&_ul]:list-disc [&_ul]:space-y-2"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Post Footer */}
            <footer className="mt-20 border-t border-white/10 pt-12">
              <div className="border border-white/10 bg-zinc-950 p-8">
                <h3 className="mb-4 text-xl font-black tracking-tight uppercase italic">
                  Deploy your fleet today
                </h3>
                <p className="mb-6 max-w-md text-sm text-zinc-500">
                  ClawTrace provides the industrial-grade orchestration layer for your enterprise AI
                  agent deployment.
                </p>
                <Link
                  href="/register"
                  className="inline-block bg-white px-8 py-3 text-xs font-bold text-black uppercase transition-colors hover:bg-zinc-200"
                >
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
