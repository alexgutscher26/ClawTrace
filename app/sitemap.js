import { blogPosts } from '@/lib/blog-data'

export const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://clawtrace.dev'

export default async function sitemap() {
  const blogs = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date).toISOString(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const routes = [
    '',
    '/blog',
    '/changelog',
    '/marketplace',
    '/pricing',
    '/docs',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))

  return [...routes, ...blogs]
}
