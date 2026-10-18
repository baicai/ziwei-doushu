/** Public origin used for canonical URLs, sitemaps and share previews. */
const productionHostname = process.env.VERCEL_PROJECT_PRODUCTION_URL
  || (process.env.VERCEL_ENV === 'production' ? process.env.VERCEL_URL : undefined);
const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL
  || (productionHostname ? 'https://' + productionHostname : 'http://localhost:3000');

export const SITE_URL = configuredOrigin.replace(/\/+$/, '');
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
