/**
 * Health Score Calculator
 * Transparent, documented scoring system normalized by page sample size.
 *
 * Categories and weights:
 * - SEO: 25%
 * - Technical: 20%
 * - Accessibility: 20%
 * - Structure: 15%
 * - Content: 10%
 * - Performance: 10%
 *
 * Deductions:
 * - CRITICAL: 15 points
 * - WARNING:   5 points
 * - INFO:      1 point
 *
 * Each category score is computed by assessing the average deductions
 * per analyzed page, preventing partial sample sizes from unfairly collapsing scores.
 */

export interface MinimalPage {
  id: string;
  statusCode?: number | null;
  isHttps?: boolean;
  hasViewport?: boolean;
  language?: string | null;
  wordCount?: number | null;
  responseSize?: number | null;
}

export interface MinimalIssue {
  pageId: string | null;
  type: string;
  severity: string;
}

export interface HealthScoreResult {
  overallScore: number;
  isLimited: boolean;
  pageCount: number;
  categoryScores: Record<string, { score: number; issues: number; weight: number }>;
}

const SEVERITY_DEDUCTIONS = {
  CRITICAL: 15,
  WARNING: 5,
  INFO: 1,
};

// Issue type to category mapping
export const ISSUE_CATEGORIES: Record<string, string> = {
  BROKEN_LINK: 'technical',
  SERVER_ERROR: 'technical',
  MISSING_VIEWPORT: 'technical',
  MISSING_LANGUAGE: 'technical',
  MIXED_CONTENT: 'technical',
  REDIRECT_CHAIN: 'technical',
  REDIRECT_LOOP: 'technical',

  MISSING_TITLE: 'seo',
  MISSING_META_DESCRIPTION: 'seo',
  DUPLICATE_TITLE: 'seo',
  DUPLICATE_META_DESCRIPTION: 'seo',
  LONG_TITLE: 'seo',
  SHORT_TITLE: 'seo',
  LONG_META_DESCRIPTION: 'seo',
  SHORT_META_DESCRIPTION: 'seo',
  MISSING_H1: 'seo',
  MULTIPLE_H1: 'seo',
  MISSING_CANONICAL: 'seo',
  MISSING_OG_TAGS: 'seo',
  MISSING_STRUCTURED_DATA: 'seo',
  NOINDEX: 'seo',

  MISSING_ALT_TEXT: 'accessibility',
  HEADING_HIERARCHY: 'accessibility',
  MISSING_FORM_LABELS: 'accessibility',

  ORPHAN_PAGE: 'structure',
  DEEP_PAGE: 'structure',

  LOW_WORD_COUNT: 'content',

  LARGE_PAGE: 'performance',
};

export const CATEGORY_WEIGHTS = {
  seo: 0.25,
  technical: 0.20,
  accessibility: 0.20,
  structure: 0.15,
  content: 0.10,
  performance: 0.10,
};

/**
 * Calculate the overall health score for a set of pages and issues,
 * normalized by the number of analyzed pages.
 */
export function calculateHealthScore(
  pages: MinimalPage[],
  issues: MinimalIssue[],
  options?: { isLimited?: boolean }
): number {
  if (pages.length === 0) return 0;

  const totalPages = pages.length;

  // Compute category deductions per page
  const categoryDeductions: Record<string, number> = {
    seo: 0,
    technical: 0,
    accessibility: 0,
    structure: 0,
    content: 0,
    performance: 0,
  };

  for (const issue of issues) {
    // If crawl was limited, do NOT heavily penalize structure for unconfirmed orphan status
    if (options?.isLimited && issue.type === 'ORPHAN_PAGE') {
      continue;
    }

    const category = ISSUE_CATEGORIES[issue.type] || 'technical';
    const deduction =
      SEVERITY_DEDUCTIONS[issue.severity as keyof typeof SEVERITY_DEDUCTIONS] || 1;
    categoryDeductions[category] = (categoryDeductions[category] || 0) + deduction;
  }

  // Each category starts at 100.
  // Average deduction per page scales down the category.
  const categoryScores: Record<string, number> = {};
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const totalCatDeduction = categoryDeductions[category] || 0;
    // Average deduction per analyzed page
    const avgDeductionPerPage = totalCatDeduction / totalPages;
    // Scale factor: An average of 1 warning per page (-5) reduces category to 85
    const categoryScore = Math.max(0, Math.min(100, Math.round(100 - avgDeductionPerPage * 3)));
    categoryScores[category] = categoryScore;

    totalWeightedScore += categoryScore * weight;
    totalWeight += weight;
  }

  const finalScore = Math.round((totalWeightedScore / totalWeight) * 10) / 10;
  return Math.max(0, Math.min(100, finalScore));
}

/**
 * Get detailed category scores normalized per page
 */
export function getCategoryScores(
  pagesOrCountOrIssues: number | MinimalPage[] | MinimalIssue[],
  maybeIssues?: MinimalIssue[],
  options?: { isLimited?: boolean }
): Record<string, { score: number; issues: number; weight: number }> {
  let count = 1;
  let issues: MinimalIssue[] = [];

  if (Array.isArray(pagesOrCountOrIssues) && maybeIssues === undefined) {
    // Called with getCategoryScores(issues)
    issues = pagesOrCountOrIssues as MinimalIssue[];
    count = Math.max(1, new Set(issues.map((i) => i.pageId).filter(Boolean)).size);
  } else if (typeof pagesOrCountOrIssues === 'number') {
    count = Math.max(1, pagesOrCountOrIssues);
    issues = maybeIssues || [];
  } else if (Array.isArray(pagesOrCountOrIssues)) {
    count = Math.max(1, pagesOrCountOrIssues.length);
    issues = maybeIssues || [];
  }

  const result: Record<string, { score: number; issues: number; weight: number }> = {};

  for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const categoryIssues = issues.filter(
      (i) => (ISSUE_CATEGORIES[i.type] || 'technical') === category
    );

    let totalDeduction = 0;
    for (const issue of categoryIssues) {
      if (options?.isLimited && issue.type === 'ORPHAN_PAGE') continue;
      const deduction =
        SEVERITY_DEDUCTIONS[issue.severity as keyof typeof SEVERITY_DEDUCTIONS] || 1;
      totalDeduction += deduction;
    }

    const avgDeductionPerPage = totalDeduction / count;
    const score = Math.max(0, Math.min(100, Math.round(100 - avgDeductionPerPage * 3)));

    result[category] = {
      score,
      issues: categoryIssues.length,
      weight,
    };
  }

  return result;
}
