import { baseUrl } from './sitemap'

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
