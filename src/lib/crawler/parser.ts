/**
 * HTML Parser
 * Extracts metadata, links, headings, and content from HTML pages.
 * Supports detection of client-rendered/dynamic SPAs and embedded JSON paths.
 */

import * as cheerio from 'cheerio';
import { isIgnoredScheme, normalizeUrl, isInternalUrl } from './normalizer';

export interface ParsedPage {
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescLength: number;
  canonical: string | null;
  robotsMeta: string | null;
  h1: string | null;
  h2Count: number;
  headings: HeadingItem[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  structuredData: string[];
  isIndexable: boolean;
  hasViewport: boolean;
  language: string | null;
  wordCount: number;
  imageCount: number;
  imagesWithoutAlt: number;
  missingFormLabels: number;
  headingHierarchyValid: boolean;
  links: ExtractedLink[];
  images: string[];
  scripts: string[];
  stylesheets: string[];
  isDynamicSpa: boolean;
}

export interface HeadingItem {
  level: number;
  text: string;
}

export interface ExtractedLink {
  href: string;
  anchorText: string;
  isFollowed: boolean;
  isInternal?: boolean;
}

/**
 * Parse an HTML document and extract all metadata, structure, and links
 */
export function parseHtml(html: string, pageUrl: string, baseDomain?: string): ParsedPage {
  const $ = cheerio.load(html);

  // Title
  const title = $('title').first().text().trim() || null;
  const titleLength = title?.length ?? 0;

  // Meta description
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() || null;
  const metaDescLength = metaDescription?.length ?? 0;

  // Canonical
  const rawCanonical = $('link[rel="canonical"]').attr('href')?.trim() || null;
  const canonical = rawCanonical ? normalizeUrl(rawCanonical, pageUrl, baseDomain) : null;

  // Robots meta
  const robotsMeta =
    $('meta[name="robots"]').attr('content')?.trim() ||
    $('meta[name="googlebot"]').attr('content')?.trim() ||
    null;

  // Indexability
  const isIndexable = !robotsMeta?.toLowerCase().includes('noindex');

  // Headings
  const headings: HeadingItem[] = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tagName = ((el as any).tagName || (el as any).name)?.toLowerCase();
    if (tagName) {
      const level = parseInt(tagName.replace('h', ''));
      const text = $(el).text().trim();
      if (text) {
        headings.push({ level, text });
      }
    }
  });

  const h1 = headings.find((h) => h.level === 1)?.text || null;
  const h2Count = headings.filter((h) => h.level === 2).length;

  // Validate heading hierarchy
  let headingHierarchyValid = true;
  const h1Count = headings.filter((h) => h.level === 1).length;
  if (h1Count > 1) headingHierarchyValid = false;
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i - 1].level + 1) {
      headingHierarchyValid = false;
      break;
    }
  }

  // Open Graph
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || null;
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || null;
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim() || null;

  // Twitter
  const twitterTitle = $('meta[name="twitter:title"]').attr('content')?.trim() || null;
  const twitterDescription = $('meta[name="twitter:description"]').attr('content')?.trim() || null;

  // Structured data
  const structuredData: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const content = $(el).html();
    if (content) structuredData.push(content.trim());
  });

  // Viewport
  const hasViewport = $('meta[name="viewport"]').length > 0;

  // Language
  const language = $('html').attr('lang')?.trim() || null;

  // Content analysis
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

  // Images
  const images: string[] = [];
  let imagesWithoutAlt = 0;
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) images.push(src);
    if ($(el).attr('alt') === undefined) imagesWithoutAlt++;
  });

  // Form labels
  let missingFormLabels = 0;
  $('input, select, textarea').each((_, el) => {
    const id = $(el).attr('id');
    const ariaLabel = $(el).attr('aria-label');
    const ariaLabelledby = $(el).attr('aria-labelledby');
    const type = $(el).attr('type');
    // Skip hidden and submit inputs
    if (type === 'hidden' || type === 'submit' || type === 'button') return;
    if (!ariaLabel && !ariaLabelledby) {
      if (!id || $(`label[for="${id}"]`).length === 0) {
        if ($(el).closest('label').length === 0) {
          missingFormLabels++;
        }
      }
    }
  });

  // Links extraction
  const linkSet = new Set<string>();
  const links: ExtractedLink[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim();
    if (!href || isIgnoredScheme(href)) return;

    const rel = $(el).attr('rel')?.toLowerCase() || '';
    const isFollowed = !rel.includes('nofollow');
    const anchorText = $(el).text().trim() || $(el).attr('title')?.trim() || $(el).attr('aria-label')?.trim() || '';

    const key = `${href}|${isFollowed}`;
    if (!linkSet.has(key)) {
      linkSet.add(key);
      links.push({ href, anchorText, isFollowed });
    }
  });

  // Scripts
  const scripts: string[] = [];
  let hasSpaScripts = false;
  $('script').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      scripts.push(src);
      if (
        src.includes('/_next/') ||
        src.includes('/static/js/') ||
        src.includes('bundle.js') ||
        src.includes('app.js') ||
        src.includes('polymer') ||
        src.includes('desktop_polymer')
      ) {
        hasSpaScripts = true;
      }
    } else {
      const inlineContent = $(el).html() || '';
      if (
        inlineContent.includes('ytInitialData') ||
        inlineContent.includes('__NEXT_DATA__') ||
        inlineContent.includes('__INITIAL_STATE__') ||
        inlineContent.includes('window.__data')
      ) {
        hasSpaScripts = true;
      }
    }
  });

  // Stylesheets
  const stylesheets: string[] = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) stylesheets.push(href);
  });

  // Dynamic / SPA Detection
  const hasSpaElement =
    $('#root, #app, #__next, ytd-app, [data-reactroot]').length > 0;
  const isDynamicSpa = hasSpaScripts || hasSpaElement || (links.length < 5 && scripts.length > 5);

  // If dynamic SPA has very few links in HTML, extract embedded navigation paths from inline JSON
  if (isDynamicSpa && links.length < 15) {
    const htmlSnippet = html.slice(0, 1024 * 1024); // search first 1MB of HTML for JSON paths
    // Look for common web paths: e.g. "url":"/watch?v=..." or "navigationEndpoint":{"url":"/feed/trending"}
    const pathMatches = htmlSnippet.matchAll(
      /["'](?:url|href|canonicalBaseUrl|webPageType|commandMetadata)["']\s*:\s*["'](\/[a-zA-Z0-9_\-\/]+(?:\?[a-zA-Z0-9_\-=&%]+)?)["']/g
    );

    const targetDomain = baseDomain || (new URL(pageUrl).hostname);

    for (const match of pathMatches) {
      const pathCandidate = match[1];
      if (
        pathCandidate.startsWith('/') &&
        !pathCandidate.startsWith('//') &&
        !pathCandidate.includes('.') &&
        pathCandidate.length > 1 &&
        pathCandidate.length < 100
      ) {
        const resolved = normalizeUrl(pathCandidate, pageUrl, targetDomain);
        if (resolved && isInternalUrl(resolved, targetDomain)) {
          const key = `${resolved}|true`;
          if (!linkSet.has(key)) {
            linkSet.add(key);
            links.push({
              href: pathCandidate,
              anchorText: pathCandidate.replace(/^\//, '').replace(/[-_/]/g, ' '),
              isFollowed: true,
              isInternal: true,
            });
          }
        }
      }
    }
  }

  return {
    title,
    titleLength,
    metaDescription,
    metaDescLength,
    canonical,
    robotsMeta,
    h1,
    h2Count,
    headings,
    ogTitle,
    ogDescription,
    ogImage,
    twitterTitle,
    twitterDescription,
    structuredData,
    isIndexable,
    hasViewport,
    language,
    wordCount,
    imageCount: images.length,
    imagesWithoutAlt,
    missingFormLabels,
    headingHierarchyValid,
    links,
    images,
    scripts,
    stylesheets,
    isDynamicSpa,
  };
}
