// vercel.ts — static site + security headers
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  headers: [
    routes.header('/(.*)', [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    ]),
  ],
};
