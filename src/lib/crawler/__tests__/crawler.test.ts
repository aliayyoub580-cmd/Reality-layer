import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUrl,
  isInternalUrl,
  isCrawlableUrl,
  isIgnoredScheme,
  getUrlPath,
} from '../normalizer';
import { parseHtml } from '../parser';
import { calculateHealthScore, getCategoryScores } from '../../scoring/health';
import { detectIssues, aggregateIssuesByType, type PageData } from '../../analyzer/issues';
import { buildGraphData } from '../../graph/builder';

describe('URL Normalization', () => {
  test('strips tracking and analytics parameters', () => {
    const raw = 'https://www.example.com/products/item?utm_source=google&utm_medium=cpc&id=123&fbclid=XYZ123';
    const normalized = normalizeUrl(raw);
    assert.equal(normalized, 'https://www.example.com/products/item?id=123');
  });

  test('removes URL fragments and normalizes trailing slashes', () => {
    const raw = 'https://www.example.com/about/#team';
    const normalized = normalizeUrl(raw);
    assert.equal(normalized, 'https://www.example.com/about');

    const root = 'https://www.example.com/';
    assert.equal(normalizeUrl(root), 'https://www.example.com/');
  });

  test('canonicalizes hostname and scheme to target domain', () => {
    const raw = 'http://example.com/pricing';
    const normalized = normalizeUrl(raw, undefined, 'www.example.com');
    assert.equal(normalized, 'https://www.example.com/pricing');
  });

  test('ignores non-HTTP schemes and anchor fragments', () => {
    assert.equal(isIgnoredScheme('mailto:test@example.com'), true);
    assert.equal(isIgnoredScheme('tel:+1234567890'), true);
    assert.equal(isIgnoredScheme('javascript:void(0)'), true);
    assert.equal(isIgnoredScheme('#section'), true);
    assert.equal(isIgnoredScheme('data:image/png;base64,...'), true);
    assert.equal(isIgnoredScheme('blob:https://example.com/xyz'), true);

    assert.equal(normalizeUrl('javascript:alert(1)'), null);
    assert.equal(normalizeUrl('mailto:user@example.com'), null);
    assert.equal(normalizeUrl('#main-content'), null);
  });

  test('distinguishes internal vs external URLs', () => {
    assert.equal(isInternalUrl('https://www.youtube.com/watch?v=abc', 'youtube.com'), true);
    assert.equal(isInternalUrl('https://youtube.com/feed/explore', 'www.youtube.com'), true);
    assert.equal(isInternalUrl('https://google.com', 'youtube.com'), false);
  });

  test('filters non-crawlable media and asset extensions', () => {
    assert.equal(isCrawlableUrl('https://example.com/page'), true);
    assert.equal(isCrawlableUrl('https://example.com/image.png'), false);
    assert.equal(isCrawlableUrl('https://example.com/style.css'), false);
    assert.equal(isCrawlableUrl('https://example.com/bundle.js'), false);
    assert.equal(isCrawlableUrl('https://example.com/document.pdf'), false);
  });
});

describe('HTML & Dynamic Link Parser', () => {
  test('extracts canonical URL tag and normalizes it', () => {
    const html = `
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="https://example.com/canonical-page/?utm_source=test" />
        </head>
        <body><a href="/internal">Link</a></body>
      </html>
    `;
    const parsed = parseHtml(html, 'https://example.com/current', 'example.com');
    assert.equal(parsed.canonical, 'https://example.com/canonical-page');
    assert.equal(parsed.title, 'Test Page');
  });

  test('detects client-rendered SPA / dynamic architecture and extracts embedded navigation paths', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dynamic Media Portal</title>
          <script src="/static/js/desktop_polymer.js"></script>
          <script>
            var ytInitialData = {
              "navigationEndpoint": { "url": "/feed/trending" },
              "browseEndpoint": { "canonicalBaseUrl": "/channel/UCTest" }
            };
          </script>
        </head>
        <body>
          <ytd-app></ytd-app>
          <a href="/about">About</a>
        </body>
      </html>
    `;
    const parsed = parseHtml(html, 'https://www.youtube.com/', 'www.youtube.com');
    assert.equal(parsed.isDynamicSpa, true);
    // Verified that it extracted the embedded JSON paths as well as the static link
    const hrefs = parsed.links.map((l) => l.href);
    assert.ok(hrefs.includes('/about'));
    assert.ok(hrefs.includes('/feed/trending'));
  });
});

describe('Orphan Page Classification & Link Graph', () => {
  test('never marks pages as confirmed orphans during a limited/partial crawl', () => {
    const unlinkedPage: PageData = {
      id: 'p2',
      url: 'https://example.com/unlinked',
      path: '/unlinked',
      title: 'Unlinked Page',
      statusCode: 200,
      titleLength: 13,
      metaDescription: 'A valid meta description that has proper length.',
      metaDescLength: 46,
      h1: 'Heading',
      h2Count: 1,
      canonical: 'https://example.com/unlinked',
      robotsMeta: null,
      isIndexable: true,
      hasViewport: true,
      language: 'en',
      wordCount: 300,
      imageCount: 1,
      imagesWithoutAlt: 0,
      missingFormLabels: 0,
      headingHierarchyValid: true,
      ogTitle: 'Unlinked Page',
      ogDescription: 'Description',
      isHttps: true,
      responseSize: 15000,
      depth: 1,
      redirectUrl: null,
      redirectChain: null,
      inboundLinks: [], // 0 inbound links
      outboundLinks: [],
    };

    // On a limited crawl:
    const limitedIssues = detectIssues(unlinkedPage, [unlinkedPage], { isLimited: true });
    const orphanIssue = limitedIssues.find((i) => i.type === 'ORPHAN_PAGE');
    assert.equal(orphanIssue, undefined, 'Limited crawl must NOT generate confirmed ORPHAN_PAGE issue');

    // On a complete crawl:
    const completeIssues = detectIssues(unlinkedPage, [unlinkedPage], { isLimited: false });
    const confirmedOrphan = completeIssues.find((i) => i.type === 'ORPHAN_PAGE');
    assert.ok(confirmedOrphan, 'Full crawl with 0 inbound links should report confirmed orphan');
  });

  test('Digital Twin graph builder creates edges when links have targetPageId and guards orphans', () => {
    const pages = [
      {
        id: 'page-1',
        url: 'https://example.com/',
        path: '/',
        title: 'Home',
        healthScore: 95,
        statusCode: 200,
        depth: 0,
        isIndexable: true,
        inboundLinks: [],
        outboundLinks: [{ id: 'link-1' }],
        issues: [],
      },
      {
        id: 'page-2',
        url: 'https://example.com/about',
        path: '/about',
        title: 'About',
        healthScore: 92,
        statusCode: 200,
        depth: 1,
        isIndexable: true,
        inboundLinks: [{ id: 'link-1' }],
        outboundLinks: [],
        issues: [],
      },
    ];

    const links = [
      {
        id: 'link-1',
        sourcePageId: 'page-1',
        targetPageId: 'page-2', // resolved targetPageId!
        isInternal: true,
      },
    ];

    const graph = buildGraphData(pages, links, { isLimited: true });
    assert.equal(graph.nodes.length, 2);
    assert.equal(graph.edges.length, 1);
    assert.equal(graph.edges[0].source, 'page-1');
    assert.equal(graph.edges[0].target, 'page-2');
    assert.equal(graph.nodes[1].isOrphan, false);
  });
});

describe('Health Scoring Algorithm', () => {
  test('normalizes deductions per page so minor warnings do not destroy site health to 0', () => {
    // 100 pages, each having 1 minor WARNING (e.g. title too short)
    const pages = Array.from({ length: 100 }, (_, i) => ({
      id: `p-${i}`,
      statusCode: 200,
      isHttps: true,
      hasViewport: true,
      language: 'en',
      wordCount: 500,
      responseSize: 20000,
    }));

    const issues = Array.from({ length: 100 }, (_, i) => ({
      pageId: `p-${i}`,
      type: 'SHORT_TITLE',
      severity: 'WARNING', // -5 points
    }));

    // In the old formula, 100 * -5 = -500 wiped the score completely to 0!
    // In our normalized formula, an average of 1 warning per page should yield a healthy score in the high 80s / 90s:
    const score = calculateHealthScore(pages, issues);
    assert.ok(score >= 80, `Expected score >= 80, got ${score}`);

    const categoryScores = getCategoryScores(pages.length, issues);
    assert.ok(categoryScores.seo.score >= 80, `Expected SEO category score >= 80, got ${categoryScores.seo.score}`);
  });

  test('does not penalize structure category for unverified orphans on limited crawls', () => {
    const pages = Array.from({ length: 50 }, (_, i) => ({
      id: `p-${i}`,
      statusCode: 200,
      isHttps: true,
      hasViewport: true,
      language: 'en',
      wordCount: 500,
      responseSize: 20000,
    }));

    const issues = [
      { pageId: 'p-1', type: 'ORPHAN_PAGE', severity: 'WARNING' },
      { pageId: 'p-2', type: 'ORPHAN_PAGE', severity: 'WARNING' },
    ];

    const scoreLimited = calculateHealthScore(pages, issues, { isLimited: true });
    const categoryScoresLimited = getCategoryScores(pages.length, issues, { isLimited: true });

    assert.equal(categoryScoresLimited.structure.score, 100);
    assert.equal(scoreLimited, 100);
  });
});

describe('Issue Deduplication & Aggregation', () => {
  test('aggregates identical issue types into unique categories with affected count', () => {
    const rawIssues = [
      {
        type: 'MISSING_META_DESCRIPTION',
        severity: 'WARNING' as const,
        title: 'Missing meta description',
        description: 'No meta description declared.',
        evidence: JSON.stringify({ url: 'https://example.com/page-1' }),
        recommendation: 'Add meta description.',
        impact: 'MEDIUM' as const,
        affectedPages: 1,
      },
      {
        type: 'MISSING_META_DESCRIPTION',
        severity: 'WARNING' as const,
        title: 'Missing meta description',
        description: 'No meta description declared.',
        evidence: JSON.stringify({ url: 'https://example.com/page-2' }),
        recommendation: 'Add meta description.',
        impact: 'MEDIUM' as const,
        affectedPages: 1,
      },
      {
        type: 'BROKEN_LINK',
        severity: 'CRITICAL' as const,
        title: 'Page returns HTTP 404',
        description: '404 error.',
        evidence: JSON.stringify({ url: 'https://example.com/broken' }),
        recommendation: 'Fix link.',
        impact: 'HIGH' as const,
        affectedPages: 1,
      },
    ];

    const aggregated = aggregateIssuesByType(rawIssues);
    assert.equal(aggregated.length, 2, 'Should have exactly 2 distinct issue types');
    assert.equal(aggregated[0].type, 'BROKEN_LINK', 'CRITICAL issue should sort first');
    assert.equal(aggregated[1].type, 'MISSING_META_DESCRIPTION');
    assert.equal(aggregated[1].affectedPagesCount, 2, 'Should aggregate 2 affected pages');
    assert.equal(aggregated[1].sampleUrls.length, 2);
  });
});
