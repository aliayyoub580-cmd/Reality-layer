/**
 * Crawl Engine
 * Queue-based website crawler with concurrent fetching,
 * accurate URL normalization, post-crawl internal link graph resolution,
 * BFS depth calculation, and transparent issue scoring.
 */

import { db } from '@/lib/db';
import { fetchPage } from './fetcher';
import { parseHtml } from './parser';
import { normalizeUrl, isInternalUrl, isCrawlableUrl, getUrlPath } from './normalizer';
import { detectIssues } from '../analyzer/issues';
import { calculateHealthScore } from '../scoring/health';

export interface CrawlOptions {
  maxPages: number;
  concurrency: number;
  delayMs: number;
  respectRobots: boolean;
}

const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
  maxPages: 100,
  concurrency: 3,
  delayMs: 400,
  respectRobots: true,
};

/**
 * Start crawling a project's website
 */
export async function startCrawl(
  projectId: string,
  options?: Partial<CrawlOptions>
): Promise<string> {
  const opts = { ...DEFAULT_CRAWL_OPTIONS, ...options };

  // Get project
  let project: { id: string; url: string; domain: string } | null = null;
  try {
    project = await db.project.findUnique({ where: { id: projectId } });
  } catch {}

  if (!project) {
    try {
      const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
      if (isSupabaseConfigured()) {
        const { data } = await supabaseAdmin.client
          .from('Project')
          .select('id, url, domain')
          .eq('id', projectId)
          .maybeSingle();
        if (data) project = data;
      }
    } catch {}
  }

  if (!project) throw new Error('Project not found');

  const crawlId = `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Create crawl record in local DB if writable
  try {
    await db.crawl.create({
      data: {
        id: crawlId,
        projectId,
        status: 'CRAWLING',
        startedAt: new Date(),
      },
    });

    await db.project.update({
      where: { id: projectId },
      data: { status: 'CRAWLING' },
    });
  } catch {}

  // Sync to Supabase
  try {
    const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
    if (isSupabaseConfigured()) {
      await supabaseAdmin.client.from('Crawl').upsert({
        id: crawlId,
        projectId,
        status: 'CRAWLING',
        startedAt: new Date().toISOString(),
      });
      await supabaseAdmin.client.from('Project').update({
        status: 'CRAWLING',
      }).eq('id', projectId);
    }
  } catch (sbErr) {
    console.warn('Supabase crawl start sync notice:', sbErr);
  }

  // Run crawl in background (non-blocking)
  executeCrawl(project.url, project.domain, projectId, crawlId, opts).catch(
    async (error) => {
      console.error('Crawl failed:', error);
      try {
        await db.crawl.update({
          where: { id: crawlId },
          data: {
            status: 'FAILED',
            errorMessage: error.message || 'Unknown error',
            completedAt: new Date(),
          },
        });
        await db.project.update({
          where: { id: projectId },
          data: { status: 'FAILED' },
        });
      } catch {}

      // Sync failure to Supabase
      try {
        const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
        if (isSupabaseConfigured()) {
          await supabaseAdmin.client.from('Crawl').update({
            status: 'FAILED',
            errorMessage: error.message || 'Unknown error',
            completedAt: new Date().toISOString(),
          }).eq('id', crawlId);
          await supabaseAdmin.client.from('Project').update({
            status: 'FAILED',
          }).eq('id', projectId);
        }
      } catch (sbErr) {
        console.warn('Supabase crawl fail sync notice:', sbErr);
      }
    }
  );

  return crawlId;
}

/**
 * Helper to discover URLs from sitemap.xml
 */
async function discoverSitemapUrls(startUrl: string, domain: string): Promise<string[]> {
  const discovered: string[] = [];
  try {
    const sitemapUrl = new URL('/sitemap.xml', startUrl).toString();
    const res = await fetchPage(sitemapUrl);
    if (res.statusCode === 200 && res.html) {
      const matches = res.html.matchAll(/<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/gi);
      for (const m of matches) {
        const u = normalizeUrl(m[1].trim(), startUrl, domain);
        if (u && isInternalUrl(u, domain) && isCrawlableUrl(u)) {
          discovered.push(u);
        }
      }
    }
  } catch (err) {
    console.warn('Sitemap discovery skipped:', err);
  }
  return discovered;
}

/**
 * Execute the crawl process
 */
/**
 * Execute the crawl process
 */
async function executeCrawl(
  startUrl: string,
  domain: string,
  projectId: string,
  crawlId: string,
  options: CrawlOptions
): Promise<void> {
  const visited = new Set<string>();
  const queue: string[] = [];
  let pagesAnalyzed = 0;
  const allCrawledPages: any[] = [];
  const allCrawlLinks: any[] = [];

  // Normalize the start URL with canonical domain
  const normalizedStart = normalizeUrl(startUrl, undefined, domain);
  if (!normalizedStart) throw new Error('Invalid start URL');

  queue.push(normalizedStart);

  // Discover URLs from sitemap if available
  const sitemapUrls = await discoverSitemapUrls(startUrl, domain);
  for (const sUrl of sitemapUrls) {
    if (!queue.includes(sUrl) && sUrl !== normalizedStart) {
      queue.push(sUrl);
    }
  }

  // Helper to sync crawl progress to both DB and Supabase
  const syncProgress = async (discovered: number, analyzed: number, total: number) => {
    try {
      await db.crawl.update({
        where: { id: crawlId },
        data: { pagesDiscovered: discovered, pagesAnalyzed: analyzed, totalPages: total },
      });
    } catch {}

    try {
      const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
      if (isSupabaseConfigured()) {
        await supabaseAdmin.client
          .from('Crawl')
          .update({ pagesDiscovered: discovered, pagesAnalyzed: analyzed, totalPages: total })
          .eq('id', crawlId);
      }
    } catch {}
  };

  // Process queue
  while (queue.length > 0 && pagesAnalyzed < options.maxPages) {
    // Take batch from queue
    const batchSize = Math.min(
      options.concurrency,
      queue.length,
      options.maxPages - pagesAnalyzed
    );
    const batch = queue.splice(0, batchSize);

    // Filter out already visited
    const toFetch = batch.filter((url) => {
      if (visited.has(url)) return false;
      visited.add(url);
      return true;
    });

    if (toFetch.length === 0) continue;

    // Fetch and store pages
    const results = await Promise.allSettled(
      toFetch.map((url) => processPage(url, domain, projectId, crawlId))
    );

    // Collect new URLs, pages, and links from results
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        pagesAnalyzed++;
        if (result.value.page) {
          allCrawledPages.push(result.value.page);
        }
        if (result.value.links?.length) {
          allCrawlLinks.push(...result.value.links);
        }

        // Add discovered internal links to queue
        for (const link of result.value.discoveredUrls) {
          const normalized = normalizeUrl(link, startUrl, domain);
          if (
            normalized &&
            !visited.has(normalized) &&
            !queue.includes(normalized) &&
            isInternalUrl(normalized, domain) &&
            isCrawlableUrl(normalized)
          ) {
            queue.push(normalized);
          }
        }
      }
    }

    // Update crawl progress
    await syncProgress(visited.size + queue.length, pagesAnalyzed, visited.size);

    // Rate limiting politeness delay
    if (queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }

  // Check if crawl reached max limit while queue was not empty
  const isLimited = queue.length > 0 && pagesAnalyzed >= options.maxPages;

  // Move to ANALYZING phase
  try {
    await db.crawl.update({
      where: { id: crawlId },
      data: { status: 'ANALYZING' },
    });
  } catch {}

  try {
    const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
    if (isSupabaseConfigured()) {
      await supabaseAdmin.client
        .from('Crawl')
        .update({ status: 'ANALYZING' })
        .eq('id', crawlId);
    }
  } catch {}

  // ─── STEP 1: RESOLVE INTERNAL LINK GRAPH (TARGET PAGE IDs) ───────────────────
  const urlToPageId = new Map<string, string>();
  for (const p of allCrawledPages) {
    urlToPageId.set(p.url, p.id);
    const norm = normalizeUrl(p.url, undefined, domain);
    if (norm) urlToPageId.set(norm, p.id);
    if (p.canonical) urlToPageId.set(p.canonical, p.id);
  }

  const adjacency = new Map<string, Set<string>>();

  for (const l of allCrawlLinks) {
    if (l.isInternal) {
      let targetPageId = urlToPageId.get(l.targetUrl);
      if (!targetPageId) {
        const normTarget = normalizeUrl(l.targetUrl, undefined, domain);
        if (normTarget) targetPageId = urlToPageId.get(normTarget);
      }

      if (targetPageId) {
        l.targetPageId = targetPageId;

        if (l.sourcePageId) {
          if (!adjacency.has(l.sourcePageId)) {
            adjacency.set(l.sourcePageId, new Set());
          }
          adjacency.get(l.sourcePageId)!.add(targetPageId);
        }

        // Try local link update non-blocking
        try {
          db.link.update({
            where: { id: l.id },
            data: { targetPageId },
          }).catch(() => {});
        } catch {}
      }
    }
  }

  // ─── STEP 2: CALCULATE TRUE BREADTH-FIRST SEARCH (BFS) DEPTH ─────────────────
  const rootPage =
    allCrawledPages.find((p) => p.url === normalizedStart || p.path === '/') ||
    allCrawledPages[0];

  const calculatedDepths = new Map<string, number>();

  if (rootPage) {
    const bfsQueue: { pageId: string; depth: number }[] = [
      { pageId: rootPage.id, depth: 0 },
    ];
    calculatedDepths.set(rootPage.id, 0);

    while (bfsQueue.length > 0) {
      const { pageId, depth } = bfsQueue.shift()!;
      const neighbors = adjacency.get(pageId) || new Set();

      for (const neighborId of neighbors) {
        if (!calculatedDepths.has(neighborId)) {
          calculatedDepths.set(neighborId, depth + 1);
          bfsQueue.push({ pageId: neighborId, depth: depth + 1 });
        }
      }
    }
  }

  // Update depths on Page records
  for (const p of allCrawledPages) {
    p.depth = calculatedDepths.get(p.id) ?? (p.path === '/' ? 0 : 1);
    try {
      db.page.update({
        where: { id: p.id },
        data: { depth: p.depth },
      }).catch(() => {});
    } catch {}
  }

  // ─── STEP 3: PREPARE ENRICHED PAGES & DETECT ISSUES ──────────────────────────
  const inboundMap = new Map<string, { id: string }[]>();
  const outboundMap = new Map<string, { id: string }[]>();

  for (const l of allCrawlLinks) {
    if (l.sourcePageId) {
      if (!outboundMap.has(l.sourcePageId)) outboundMap.set(l.sourcePageId, []);
      outboundMap.get(l.sourcePageId)!.push({ id: l.id });
    }
    if (l.targetPageId) {
      if (!inboundMap.has(l.targetPageId)) inboundMap.set(l.targetPageId, []);
      inboundMap.get(l.targetPageId)!.push({ id: l.id });
    }
  }

  for (const p of allCrawledPages) {
    p.inboundLinks = inboundMap.get(p.id) || [];
    p.outboundLinks = outboundMap.get(p.id) || [];
  }

  const allIssues: any[] = [];
  for (const page of allCrawledPages) {
    const issues = detectIssues(page, allCrawledPages, { isLimited });
    for (const issue of issues) {
      const issueRecord = {
        id: `issue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        projectId,
        crawlId,
        pageId: page.id,
        ...issue,
      };
      allIssues.push(issueRecord);

      try {
        db.issue.create({ data: issueRecord }).catch(() => {});
      } catch {}
    }
  }

  // ─── STEP 4: CALCULATE NORMALIZED HEALTH SCORES ──────────────────────────────
  const overallHealth = calculateHealthScore(allCrawledPages, allIssues, { isLimited });

  for (const page of allCrawledPages) {
    const pageIssues = allIssues.filter((i) => i.pageId === page.id);
    page.healthScore = calculateHealthScore([page], pageIssues, { isLimited });

    try {
      db.page.update({
        where: { id: page.id },
        data: { healthScore: page.healthScore },
      }).catch(() => {});
    } catch {}
  }

  // ─── STEP 5: SYNC ALL CRAWL ARTIFACTS TO SUPABASE ────────────────────────────
  try {
    const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
    if (isSupabaseConfigured()) {
      // 1. Batch upsert pages (chunks of 50)
      for (let i = 0; i < allCrawledPages.length; i += 50) {
        const chunk = allCrawledPages.slice(i, i + 50).map((p) => {
          const { inboundLinks, outboundLinks, ...rest } = p;
          return rest;
        });
        await supabaseAdmin.client.from('Page').upsert(chunk);
      }

      // 2. Batch upsert links (chunks of 100)
      for (let i = 0; i < allCrawlLinks.length; i += 100) {
        const chunk = allCrawlLinks.slice(i, i + 100);
        await supabaseAdmin.client.from('Link').upsert(chunk);
      }

      // 3. Batch insert issues (chunks of 50)
      for (let i = 0; i < allIssues.length; i += 50) {
        const chunk = allIssues.slice(i, i + 50);
        await supabaseAdmin.client.from('Issue').upsert(chunk);
      }
    }
  } catch (sbErr) {
    console.warn('Supabase bulk crawl sync notice:', sbErr);
  }

  // ─── STEP 6: FINALIZE CRAWL RECORD ───────────────────────────────────────────
  const limitNote = isLimited
    ? `Limited crawl: Sampled ${pagesAnalyzed} pages (${queue.length} additional URLs pending)`
    : null;

  try {
    await db.crawl.update({
      where: { id: crawlId },
      data: {
        status: 'COMPLETED',
        healthScore: overallHealth,
        pagesDiscovered: visited.size + queue.length,
        pagesAnalyzed,
        totalPages: visited.size,
        errorMessage: limitNote,
        completedAt: new Date(),
      },
    });

    await db.project.update({
      where: { id: projectId },
      data: {
        status: 'COMPLETED',
        healthScore: overallHealth,
      },
    });
  } catch {}

  try {
    const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
    if (isSupabaseConfigured()) {
      await supabaseAdmin.client.from('Crawl').upsert({
        id: crawlId,
        projectId,
        status: 'COMPLETED',
        healthScore: overallHealth,
        pagesDiscovered: visited.size + queue.length,
        pagesAnalyzed,
        totalPages: visited.size,
        errorMessage: limitNote,
        completedAt: new Date().toISOString(),
      });
      await supabaseAdmin.client.from('Project').update({
        status: 'COMPLETED',
        healthScore: overallHealth,
      }).eq('id', projectId);
    }
  } catch (sbErr) {
    console.warn('Supabase crawl completion notice:', sbErr);
  }
}

interface ProcessResult {
  discoveredUrls: string[];
  page?: any;
  links?: any[];
}

/**
 * Process a single page: fetch, parse, store
 */
async function processPage(
  url: string,
  domain: string,
  projectId: string,
  crawlId: string
): Promise<ProcessResult> {
  const discoveredUrls: string[] = [];
  const pageId = `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Fetch the page
  const fetchResult = await fetchPage(url);
  const path = getUrlPath(url);
  const isHttps = url.startsWith('https:');

  // If fetch failed or response has no HTML
  if (fetchResult.error || !fetchResult.html) {
    const errorPageRecord = {
      id: pageId,
      projectId,
      crawlId,
      url,
      path,
      statusCode: fetchResult.statusCode || null,
      contentType: fetchResult.contentType || null,
      responseSize: fetchResult.responseSize,
      loadTime: fetchResult.loadTime,
      isHttps,
      redirectUrl: fetchResult.redirectChain[0] || null,
      redirectChain:
        fetchResult.redirectChain.length > 0
          ? JSON.stringify(fetchResult.redirectChain)
          : null,
      isIndexable: false,
    };

    try {
      await db.page.create({ data: errorPageRecord });
    } catch {}

    return { discoveredUrls, page: errorPageRecord, links: [] };
  }

  // Parse HTML with baseDomain awareness
  const parsed = parseHtml(fetchResult.html, url, domain);

  // Normalize final stored URL
  const finalStoredUrl = normalizeUrl(fetchResult.finalUrl || url, url, domain) || url;

  // Create page record
  const pageRecord = {
    id: pageId,
    projectId,
    crawlId,
    url: finalStoredUrl,
    path,
    title: parsed.title,
    statusCode: fetchResult.statusCode,
    contentType: fetchResult.contentType,
    responseSize: fetchResult.responseSize,
    loadTime: fetchResult.loadTime,
    isHttps,
    titleLength: parsed.titleLength,
    metaDescription: parsed.metaDescription,
    metaDescLength: parsed.metaDescLength,
    canonical: parsed.canonical,
    robotsMeta: parsed.robotsMeta,
    h1: parsed.h1,
    h2Count: parsed.h2Count,
    ogTitle: parsed.ogTitle,
    ogDescription: parsed.ogDescription,
    ogImage: parsed.ogImage,
    twitterTitle: parsed.twitterTitle,
    twitterDescription: parsed.twitterDescription,
    structuredData:
      parsed.structuredData.length > 0
        ? JSON.stringify(parsed.structuredData)
        : null,
    isIndexable: parsed.isIndexable,
    hasViewport: parsed.hasViewport,
    language: parsed.language,
    wordCount: parsed.wordCount,
    imageCount: parsed.imageCount,
    imagesWithoutAlt: parsed.imagesWithoutAlt,
    missingFormLabels: parsed.missingFormLabels,
    headingHierarchyValid: parsed.headingHierarchyValid,
    headings: JSON.stringify(parsed.headings),
    linkCount: parsed.links.length,
    redirectUrl: fetchResult.redirectChain[0] || null,
    redirectChain:
      fetchResult.redirectChain.length > 0
        ? JSON.stringify(fetchResult.redirectChain)
        : null,
  };

  try {
    await db.page.create({ data: pageRecord });
  } catch {}

  // Process links extracted from page
  const pageLinks: any[] = [];
  for (const link of parsed.links) {
    const resolvedUrl = normalizeUrl(link.href, url, domain);
    if (!resolvedUrl) continue;

    const isInternal = isInternalUrl(resolvedUrl, domain);
    const linkRecord = {
      id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      crawlId,
      sourcePageId: pageId,
      sourceUrl: finalStoredUrl,
      targetUrl: resolvedUrl,
      anchorText: link.anchorText || null,
      isInternal,
      isFollowed: link.isFollowed,
      targetPageId: null,
    };

    pageLinks.push(linkRecord);

    try {
      db.link.create({ data: linkRecord }).catch(() => {});
    } catch {}

    if (isInternal && isCrawlableUrl(resolvedUrl)) {
      discoveredUrls.push(resolvedUrl);
    }
  }

  return { discoveredUrls, page: pageRecord, links: pageLinks };
}
