/**
 * Issue Detection Engine
 * Analyzes pages and generates classified, actionable issue records based on concrete evidence.
 */

export interface PageData {
  id: string;
  url: string;
  path: string;
  title: string | null;
  statusCode: number | null;
  titleLength: number | null;
  metaDescription: string | null;
  metaDescLength: number | null;
  h1: string | null;
  h2Count: number | null;
  canonical: string | null;
  robotsMeta: string | null;
  isIndexable: boolean;
  hasViewport: boolean;
  language: string | null;
  wordCount: number | null;
  imageCount: number | null;
  imagesWithoutAlt: number | null;
  missingFormLabels: number | null;
  headingHierarchyValid: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  isHttps: boolean;
  responseSize: number | null;
  depth: number | null;
  redirectUrl: string | null;
  redirectChain: string | null;
  inboundLinks?: { id: string }[];
  outboundLinks?: { id: string }[];
}

export interface IssueRecord {
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  evidence: string | null;
  recommendation: string | null;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  affectedPages: number;
}

export interface IssueTypeSummary {
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  recommendation: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  affectedPagesCount: number;
  sampleUrls: string[];
}

/**
 * Detect issues for a single page based on its data
 */
export function detectIssues(
  page: PageData,
  allPages: PageData[],
  options?: { isLimited?: boolean }
): IssueRecord[] {
  const issues: IssueRecord[] = [];

  // ─── HTTP & Status Code Issues ──────────────────────
  if (page.statusCode && page.statusCode >= 400) {
    if (page.statusCode === 404 || page.statusCode === 410) {
      issues.push({
        type: 'BROKEN_LINK',
        severity: 'CRITICAL',
        title: `Page returns HTTP ${page.statusCode}`,
        description: `This page returns an HTTP ${page.statusCode} status code (Not Found / Gone).`,
        evidence: JSON.stringify({ url: page.url, statusCode: page.statusCode }),
        recommendation: 'Fix or remove internal links pointing to this missing page, or restore the page content.',
        impact: 'HIGH',
        affectedPages: 1,
      });
    } else if (page.statusCode >= 500) {
      issues.push({
        type: 'SERVER_ERROR',
        severity: 'CRITICAL',
        title: `Server error (${page.statusCode})`,
        description: `This page returns an HTTP ${page.statusCode} server response error.`,
        evidence: JSON.stringify({ url: page.url, statusCode: page.statusCode }),
        recommendation: 'Investigate the server application logs and resolve the 5xx handler failure.',
        impact: 'HIGH',
        affectedPages: 1,
      });
    }
    return issues; // Do not analyze missing/error pages further
  }

  // ─── SEO Issues ─────────────────────────────────────

  // Missing title
  if (!page.title) {
    issues.push({
      type: 'MISSING_TITLE',
      severity: 'CRITICAL',
      title: 'Missing page title tag',
      description: 'This page has no <title> tag in its HTML head.',
      evidence: JSON.stringify({ url: page.url }),
      recommendation: 'Add an informative, unique <title> tag (50-60 characters).',
      impact: 'HIGH',
      affectedPages: 1,
    });
  } else {
    // Title length
    const tl = page.titleLength ?? page.title.length;
    if (tl < 10) {
      issues.push({
        type: 'SHORT_TITLE',
        severity: 'WARNING',
        title: 'Title tag too short',
        description: `Title tag is only ${tl} characters. Short titles under 30 characters underutilize search ranking potential.`,
        evidence: JSON.stringify({ url: page.url, title: page.title, length: tl }),
        recommendation: 'Expand the title to 40-60 characters with relevant primary keywords.',
        impact: 'MEDIUM',
        affectedPages: 1,
      });
    } else if (tl > 65) {
      issues.push({
        type: 'LONG_TITLE',
        severity: 'INFO',
        title: 'Title tag may truncate in SERPs',
        description: `Title tag is ${tl} characters. Search engines typically display up to 60 characters.`,
        evidence: JSON.stringify({ url: page.url, title: page.title, length: tl }),
        recommendation: 'Keep primary keyword phrases within the first 60 characters.',
        impact: 'LOW',
        affectedPages: 1,
      });
    }

    // Duplicate titles across crawled pages
    const duplicates = allPages.filter(
      (p) => p.id !== page.id && p.title && p.title === page.title
    );
    if (duplicates.length > 0) {
      issues.push({
        type: 'DUPLICATE_TITLE',
        severity: 'WARNING',
        title: 'Duplicate page title across routes',
        description: `This title is identical to ${duplicates.length} other crawled page(s).`,
        evidence: JSON.stringify({
          url: page.url,
          title: page.title,
          duplicateUrls: duplicates.slice(0, 5).map((d) => d.url),
        }),
        recommendation: 'Ensure every distinct page route has a distinct, descriptive title.',
        impact: 'MEDIUM',
        affectedPages: duplicates.length + 1,
      });
    }
  }

  // Missing meta description
  if (!page.metaDescription) {
    issues.push({
      type: 'MISSING_META_DESCRIPTION',
      severity: 'WARNING',
      title: 'Missing meta description',
      description: 'This page does not declare a <meta name="description"> tag.',
      evidence: JSON.stringify({ url: page.url }),
      recommendation: 'Add a concise meta description (120-160 characters) summarizing the page.',
      impact: 'MEDIUM',
      affectedPages: 1,
    });
  } else {
    const mdl = page.metaDescLength ?? page.metaDescription.length;
    if (mdl > 165) {
      issues.push({
        type: 'LONG_META_DESCRIPTION',
        severity: 'INFO',
        title: 'Meta description exceeds standard length',
        description: `Meta description is ${mdl} characters. Search engines truncate snippets beyond 160 characters.`,
        evidence: JSON.stringify({ url: page.url, length: mdl }),
        recommendation: 'Condense description to between 120 and 160 characters.',
        impact: 'LOW',
        affectedPages: 1,
      });
    }
  }

  // Missing H1
  if (!page.h1) {
    issues.push({
      type: 'MISSING_H1',
      severity: 'WARNING',
      title: 'Missing H1 heading',
      description: 'No <h1> heading tag was discovered on this page.',
      evidence: JSON.stringify({ url: page.url }),
      recommendation: 'Add a single top-level <h1> heading identifying the page topic.',
      impact: 'MEDIUM',
      affectedPages: 1,
    });
  }

  // Canonical tag check
  if (!page.canonical) {
    issues.push({
      type: 'MISSING_CANONICAL',
      severity: 'INFO',
      title: 'Missing canonical URL link',
      description: 'This page does not declare a <link rel="canonical"> tag.',
      evidence: JSON.stringify({ url: page.url }),
      recommendation: 'Add <link rel="canonical" href="..."> to prevent duplicate content ambiguity.',
      impact: 'LOW',
      affectedPages: 1,
    });
  }

  // Missing Open Graph tags
  if (!page.ogTitle && !page.ogDescription) {
    issues.push({
      type: 'MISSING_OG_TAGS',
      severity: 'INFO',
      title: 'Missing Open Graph metadata',
      description: 'Page lacks og:title and og:description tags for rich social media cards.',
      evidence: JSON.stringify({ url: page.url }),
      recommendation: 'Add Open Graph meta tags (og:title, og:description, og:image).',
      impact: 'LOW',
      affectedPages: 1,
    });
  }

  // ─── Technical & Mobile Issues ──────────────────────

  // Missing viewport
  if (!page.hasViewport) {
    issues.push({
      type: 'MISSING_VIEWPORT',
      severity: 'WARNING',
      title: 'Missing mobile viewport tag',
      description: 'The HTML head does not contain a viewport meta tag.',
      evidence: JSON.stringify({ url: page.url }),
      recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
      impact: 'MEDIUM',
      affectedPages: 1,
    });
  }

  // Missing language
  if (!page.language) {
    issues.push({
      type: 'MISSING_LANGUAGE',
      severity: 'WARNING',
      title: 'Missing document lang attribute',
      description: 'The <html> element does not specify a language attribute (e.g. lang="en").',
      evidence: JSON.stringify({ url: page.url }),
      recommendation: 'Add a lang attribute to the <html> tag to aid screen readers and search engines.',
      impact: 'MEDIUM',
      affectedPages: 1,
    });
  }

  // Insecure HTTP
  if (!page.isHttps) {
    issues.push({
      type: 'MIXED_CONTENT',
      severity: 'WARNING',
      title: 'Insecure protocol (HTTP)',
      description: 'This page is being served over unencrypted HTTP instead of HTTPS.',
      evidence: JSON.stringify({ url: page.url }),
      recommendation: 'Configure an SSL certificate and redirect all HTTP requests to HTTPS.',
      impact: 'MEDIUM',
      affectedPages: 1,
    });
  }

  // Redirect chain
  if (page.redirectChain) {
    try {
      const chain = JSON.parse(page.redirectChain);
      if (chain.length > 1) {
        issues.push({
          type: 'REDIRECT_CHAIN',
          severity: 'WARNING',
          title: `Redirect chain (${chain.length} hops)`,
          description: `Page involves ${chain.length} consecutive redirects before loading.`,
          evidence: JSON.stringify({ url: page.url, chain }),
          recommendation: 'Update internal links to target the final destination directly.',
          impact: 'MEDIUM',
          affectedPages: 1,
        });
      }
    } catch {
      // ignore parse error
    }
  }

  // Noindex directive
  if (!page.isIndexable) {
    issues.push({
      type: 'NOINDEX',
      severity: 'INFO',
      title: 'Page has noindex directive',
      description: 'Page specifies a noindex robots directive excluding it from search indexes.',
      evidence: JSON.stringify({ url: page.url, robotsMeta: page.robotsMeta }),
      recommendation: 'Ensure noindex is intentional for this route (e.g. admin or private page).',
      impact: 'LOW',
      affectedPages: 1,
    });
  }

  // ─── Accessibility Issues ──────────────────────────

  // Missing alt text
  if (page.imagesWithoutAlt && page.imagesWithoutAlt > 0) {
    issues.push({
      type: 'MISSING_ALT_TEXT',
      severity: 'WARNING',
      title: `${page.imagesWithoutAlt} image(s) missing alt text`,
      description: `Discovered ${page.imagesWithoutAlt} image element(s) without alt attributes.`,
      evidence: JSON.stringify({ url: page.url, count: page.imagesWithoutAlt }),
      recommendation: 'Add descriptive alt text to all informative images.',
      impact: 'MEDIUM',
      affectedPages: 1,
    });
  }

  // Heading hierarchy
  if (!page.headingHierarchyValid) {
    issues.push({
      type: 'HEADING_HIERARCHY',
      severity: 'INFO',
      title: 'Non-sequential heading hierarchy',
      description: 'Headings skip numerical levels or multiple H1 elements are declared.',
      evidence: JSON.stringify({ url: page.url }),
      recommendation: 'Maintain a sequential hierarchy (H1 -> H2 -> H3) for accessibility.',
      impact: 'LOW',
      affectedPages: 1,
    });
  }

  // Missing form labels
  if (page.missingFormLabels && page.missingFormLabels > 0) {
    issues.push({
      type: 'MISSING_FORM_LABELS',
      severity: 'WARNING',
      title: `${page.missingFormLabels} form input(s) missing labels`,
      description: `Discovered form inputs without matching <label> or aria-label attributes.`,
      evidence: JSON.stringify({ url: page.url, count: page.missingFormLabels }),
      recommendation: 'Associate all inputs with a descriptive <label for="..."> or aria-label.',
      impact: 'MEDIUM',
      affectedPages: 1,
    });
  }

  // ─── Structure & Orphan Check ───────────────────────
  // CRITICAL: A page is ONLY a confirmed orphan if:
  // 1. Crawl was NOT a partial/limited crawl
  // 2. Page has 0 inbound internal links
  // 3. Path is not root '/'
  // 4. Page is indexable and status 200 (not a redirect or error)
  const hasInboundLinks = (page.inboundLinks?.length ?? 0) > 0;
  if (!hasInboundLinks && page.path !== '/' && page.statusCode === 200 && page.isIndexable) {
    if (!options?.isLimited) {
      issues.push({
        type: 'ORPHAN_PAGE',
        severity: 'WARNING',
        title: 'Confirmed orphan page (zero inbound links)',
        description: 'Complete crawl confirmed that no internal pages link to this route.',
        evidence: JSON.stringify({ url: page.url, path: page.path }),
        recommendation: 'Link this page from relevant category hubs or main navigation.',
        impact: 'MEDIUM',
        affectedPages: 1,
      });
    }
  }

  // Deep page
  if (page.depth != null && page.depth > 4) {
    issues.push({
      type: 'DEEP_PAGE',
      severity: 'INFO',
      title: 'High click depth (>4 clicks from root)',
      description: `Page requires ${page.depth} clicks from the root page to reach.`,
      evidence: JSON.stringify({ url: page.url, depth: page.depth }),
      recommendation: 'Improve internal linking from higher-level category hubs.',
      impact: 'LOW',
      affectedPages: 1,
    });
  }

  return issues;
}

/**
 * Group raw issues into deduplicated issue types
 */
export function aggregateIssuesByType(issues: IssueRecord[]): IssueTypeSummary[] {
  const grouped = new Map<string, IssueTypeSummary>();

  for (const issue of issues) {
    if (!grouped.has(issue.type)) {
      let sampleUrl = '';
      if (issue.evidence) {
        try {
          const parsed = JSON.parse(issue.evidence);
          sampleUrl = parsed.url || '';
        } catch {
          // ignore
        }
      }

      grouped.set(issue.type, {
        type: issue.type,
        severity: issue.severity,
        title: issue.title,
        description: issue.description,
        recommendation: issue.recommendation || '',
        impact: issue.impact,
        affectedPagesCount: 1,
        sampleUrls: sampleUrl ? [sampleUrl] : [],
      });
    } else {
      const existing = grouped.get(issue.type)!;
      existing.affectedPagesCount += 1;
      if (issue.evidence && existing.sampleUrls.length < 5) {
        try {
          const parsed = JSON.parse(issue.evidence);
          if (parsed.url && !existing.sampleUrls.includes(parsed.url)) {
            existing.sampleUrls.push(parsed.url);
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return order[a.severity] - order[b.severity] || b.affectedPagesCount - a.affectedPagesCount;
  });
}
