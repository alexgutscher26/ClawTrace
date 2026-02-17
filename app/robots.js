import { baseUrl } from './sitemap'

/**
 * Generates a robots.txt configuration object.
 */
export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/', '/login/', '/register/', '/checkout/', '/api/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
