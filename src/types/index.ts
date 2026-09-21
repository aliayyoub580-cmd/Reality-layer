// ─── Crawl Status ───────────────────────────────────────────

export type CrawlStatus =
  | 'QUEUED'
  | 'CRAWLING'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

// ─── Issue Severity ─────────────────────────────────────────

export type IssueSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

// ─── Issue Types ────────────────────────────────────────────

export type IssueType =
  | 'BROKEN_LINK'
  | 'MISSING_TITLE'
  | 'MISSING_META_DESCRIPTION'
  | 'DUPLICATE_TITLE'
  | 'DUPLICATE_META_DESCRIPTION'
  | 'LONG_TITLE'
  | 'SHORT_TITLE'
  | 'LONG_META_DESCRIPTION'
  | 'SHORT_META_DESCRIPTION'
  | 'MISSING_H1'
  | 'MULTIPLE_H1'
  | 'MISSING_CANONICAL'
  | 'MISSING_VIEWPORT'
  | 'MISSING_LANGUAGE'
  | 'MISSING_ALT_TEXT'
  | 'HEADING_HIERARCHY'
  | 'MISSING_FORM_LABELS'
  | 'ORPHAN_PAGE'
  | 'DEEP_PAGE'
  | 'LOW_WORD_COUNT'
  | 'REDIRECT_CHAIN'
  | 'REDIRECT_LOOP'
  | 'SERVER_ERROR'
  | 'MIXED_CONTENT'
  | 'MISSING_OG_TAGS'
  | 'MISSING_STRUCTURED_DATA'
  | 'NOINDEX'
  | 'LARGE_PAGE';

// ─── Page Status ────────────────────────────────────────────

export type PageStatus =
  | 'OK'
  | 'REDIRECT'
  | 'CLIENT_ERROR'
  | 'SERVER_ERROR'
  | 'TIMEOUT'
  | 'ERROR';

// ─── Page Type ──────────────────────────────────────────────

export type PageType =
  | 'homepage'
  | 'page'
  | 'blog-post'
  | 'blog-listing'
  | 'product'
  | 'category'
  | 'contact'
  | 'about'
  | 'service'
  | 'landing'
  | 'legal'
  | 'other';

// ─── Impact Level ───────────────────────────────────────────

export type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW';

// ─── Health Score ───────────────────────────────────────────

export interface HealthScore {
  overall: number;
  technical: number;
  seo: number;
  performance: number;
  accessibility: number;
  structure: number;
  content: number;
}

export interface HealthCategory {
  name: string;
  score: number;
  weight: number;
  issues: number;
  maxScore: number;
}

// ─── Graph Types ────────────────────────────────────────────

export interface GraphNode {
  id: string;
  url: string;
  path: string;
  title: string | null;
  healthScore: number | null;
  statusCode: number | null;
  depth: number | null;
  inboundCount: number;
  outboundCount: number;
  pageType: PageType;
  status: PageStatus;
  issueCount: number;
  isOrphan: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  anchorText: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Crawl Progress ─────────────────────────────────────────

export interface CrawlProgress {
  id: string;
  status: CrawlStatus;
  pagesDiscovered: number;
  pagesAnalyzed: number;
  totalPages: number;
  progress: number; // 0-100
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

// ─── Project Summary ────────────────────────────────────────

export interface ProjectSummary {
  id: string;
  name: string;
  domain: string;
  url: string;
  healthScore: number | null;
  totalPages: number;
  brokenLinks: number;
  seoIssues: number;
  orphanPages: number;
  lastCrawl: string | null;
  status: string;
}

// ─── Page Analysis ──────────────────────────────────────────

export interface PageAnalysis {
  url: string;
  path: string;
  title: string | null;
  statusCode: number | null;
  healthScore: number | null;
  depth: number | null;
  wordCount: number;
  inboundLinks: number;
  outboundLinks: number;
  seoScore: number;
  accessibilityScore: number;
  issues: IssueInfo[];
  headings: HeadingNode[];
}

export interface IssueInfo {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  evidence: string | null;
  recommendation: string | null;
  impact: ImpactLevel;
  affectedPages: number;
}

export interface HeadingNode {
  level: number;
  text: string;
  children: HeadingNode[];
}

// ─── Comparison ─────────────────────────────────────────────

export interface CrawlComparison {
  from: CrawlSnapshot;
  to: CrawlSnapshot;
  changes: ChangeItem[];
  summary: ChangeSummary;
}

export interface CrawlSnapshot {
  id: string;
  healthScore: number | null;
  totalPages: number;
  brokenLinks: number;
  seoIssues: number;
  date: string;
}

export interface ChangeItem {
  type: 'ADDED' | 'REMOVED' | 'MODIFIED';
  entityType: 'PAGE' | 'LINK' | 'METADATA' | 'STATUS';
  url: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  description: string;
}

export interface ChangeSummary {
  newPages: number;
  removedPages: number;
  metadataChanges: number;
  linkChanges: number;
  statusChanges: number;
  healthDelta: number | null;
}

// ─── Structure Analysis ─────────────────────────────────────

export interface DepthDistribution {
  depth: number;
  pageCount: number;
  pages: { url: string; title: string | null }[];
}

export interface OrphanPage {
  url: string;
  path: string;
  title: string | null;
  inboundLinks: number;
  discoveredVia: 'sitemap' | 'crawl' | 'redirect';
}

export interface StructuralFriction {
  targetUrl: string;
  targetTitle: string | null;
  path: string[];
  depth: number;
  explanation: string;
}

export interface ConnectivityScore {
  url: string;
  path: string;
  title: string | null;
  inbound: number;
  outbound: number;
  score: number;
}

export interface RemovalSimulation {
  pageUrl: string;
  pageTitle: string | null;
  affectedPages: number;
  affectedPaths: number;
  orphanCandidates: string[];
  brokenRelationships: {
    from: string;
    to: string;
    type: string;
  }[];
}

// ─── Report ─────────────────────────────────────────────────

export interface ReportData {
  project: ProjectSummary;
  healthScore: HealthScore;
  pages: { total: number; healthy: number; warning: number; critical: number };
  issues: { critical: IssueInfo[]; warning: IssueInfo[]; info: IssueInfo[] };
  seo: {
    score: number;
    missingTitles: number;
    missingDescriptions: number;
    duplicateTitles: number;
    missingH1: number;
    missingCanonical: number;
  };
  structure: {
    maxDepth: number;
    avgDepth: number;
    orphanPages: number;
    depthDistribution: DepthDistribution[];
  };
  crawlInfo: {
    date: string;
    duration: number;
    pagesAnalyzed: number;
  };
  recommendations: string[];
}

// ─── Navigation Flow ────────────────────────────────────────

export interface NavigationPath {
  from: string;
  to: string;
  path: string[];
  depth: number;
}

// ─── API Response Types ─────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
