/**
 * URL Normalizer
 * Normalizes URLs so equivalent URLs don't create duplicate pages or broken graphs.
 */

const TRACKING_PARAM_PREFIXES = ['utm_'];
const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'msclkid',
  'mc_eid',
  'zanpid',
  '_ga',
  '_gl',
  'ref',
  'ref_src',
  'source',
  'feature', // common video/campaign feature tracking query
]);

const IGNORED_SCHEMES = [
  'javascript:',
  'mailto:',
  'tel:',
  'data:',
  'blob:',
  'sms:',
  'callto:',
  'whatsapp:',
  'about:',
  'intent:',
];

/**
 * Check if raw string is an ignored non-http scheme or page anchor
 */
export function isIgnoredScheme(rawUrl: string): boolean {
  const trimmed = rawUrl.trim().toLowerCase();
  if (trimmed === '' || trimmed === '#' || trimmed.startsWith('#')) return true;
  for (const scheme of IGNORED_SCHEMES) {
    if (trimmed.startsWith(scheme)) return true;
  }
  return false;
}

/**
 * Normalize a URL by:
 * - Ignoring javascript/mailto/tel/blob/data/fragment links
 * - Resolving relative URLs against baseUrl
 * - Lowercasing protocol and hostname
 * - Canonicalizing hostname casing and www/non-www if matching canonicalDomain
 * - Removing URL fragments (#...)
 * - Removing tracking/marketing query parameters
 * - Sorting remaining query parameters
 * - Normalizing trailing slashes consistently (strip except root /)
 * - Safely decoding and re-encoding paths
 */
export function normalizeUrl(
  rawUrl: string,
  baseUrl?: string,
  canonicalDomain?: string
): string | null {
  try {
    const urlStr = rawUrl.trim();
    if (!urlStr || isIgnoredScheme(urlStr)) return null;

    // Resolve relative URLs
    let parsed: URL;
    try {
      if (baseUrl) {
        parsed = new URL(urlStr, baseUrl);
      } else {
        parsed = new URL(urlStr);
      }
    } catch {
      return null;
    }

    // Only handle http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // Remove fragment
    parsed.hash = '';

    // Lowercase protocol and hostname
    let protocol = parsed.protocol.toLowerCase();
    let hostname = parsed.hostname.toLowerCase();

    // Canonicalize domain if provided (e.g. youtube.com vs www.youtube.com)
    if (canonicalDomain) {
      const cleanCanonical = canonicalDomain
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .split('/')[0]
        .split(':')[0];

      const cleanHost = hostname.replace(/^www\./, '');
      const cleanTarget = cleanCanonical.replace(/^www\./, '');

      if (cleanHost === cleanTarget) {
        hostname = cleanCanonical;
        protocol = 'https:'; // standard secure web default for internal links
      }
    }

    // Remove default ports
    let port = parsed.port;
    if (
      (protocol === 'http:' && port === '80') ||
      (protocol === 'https:' && port === '443')
    ) {
      port = '';
    }

    // Normalize path
    let path = parsed.pathname || '/';
    // Remove trailing slash (keep root /)
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    // Decode and re-encode path properly
    try {
      path = decodeURIComponent(path);
      // Clean duplicate consecutive slashes in path (except protocol)
      path = path.replace(/\/+/g, '/');
    } catch {
      // Keep as-is if decoding fails
    }

    // Filter out tracking query parameters
    const params = new URLSearchParams(parsed.search);
    const cleanedParams = new URLSearchParams();

    for (const [key, value] of params.entries()) {
      const lowerKey = key.toLowerCase();
      const isTracking =
        TRACKING_PARAMS.has(lowerKey) ||
        TRACKING_PARAM_PREFIXES.some((prefix) => lowerKey.startsWith(prefix));

      if (!isTracking) {
        cleanedParams.append(key, value);
      }
    }

    // Sort remaining query parameters for consistent matching
    const sortedParams = new URLSearchParams([...cleanedParams.entries()].sort());
    const queryString = sortedParams.toString();

    // Build normalized URL
    let normalized = `${protocol}//${hostname}`;
    if (port) normalized += `:${port}`;
    normalized += path;
    if (queryString) normalized += `?${queryString}`;

    return normalized;
  } catch {
    return null;
  }
}

/**
 * Extract the base URL (protocol + hostname + port) from a full URL
 */
export function getBaseUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}`;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is internal (same hostname or www variant)
 */
export function isInternalUrl(url: string, baseDomain: string): boolean {
  try {
    const parsed = new URL(url);
    const cleanDomain = baseDomain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split(':')[0]
      .replace(/^www\./, '');

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return host === cleanDomain;
  } catch {
    return false;
  }
}

/**
 * Get the path from a URL
 */
export function getUrlPath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname || '/';
  } catch {
    return '/';
  }
}

/**
 * Check if a URL should be crawled (skip assets, external protocols, etc.)
 */
export function isCrawlableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // Skip common non-page resources
    const path = parsed.pathname.toLowerCase();
    const skipExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp', '.avif',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.zip', '.tar', '.gz', '.rar', '.7z',
      '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv',
      '.css', '.js', '.json', '.xml', '.rss', '.atom',
      '.woff', '.woff2', '.ttf', '.eot', '.otf',
      '.map', '.ts', '.tsx',
    ];

    for (const ext of skipExtensions) {
      if (path.endsWith(ext)) return false;
    }

    return true;
  } catch {
    return false;
  }
}
