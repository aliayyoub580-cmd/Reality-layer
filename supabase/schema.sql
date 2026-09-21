-- ============================================================================
-- RealityLayer — Supabase PostgreSQL Schema
-- ============================================================================
-- Compatible with Supabase SQL Editor and Prisma ORM
-- Tables and columns are quoted to match Prisma's case-sensitive conventions.

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop Tables (if recreating schema from scratch - uncomment if needed)
-- DROP TABLE IF EXISTS "AuditLog" CASCADE;
-- DROP TABLE IF EXISTS "ShareLink" CASCADE;
-- DROP TABLE IF EXISTS "CrawlChange" CASCADE;
-- DROP TABLE IF EXISTS "Issue" CASCADE;
-- DROP TABLE IF EXISTS "Link" CASCADE;
-- DROP TABLE IF EXISTS "Page" CASCADE;
-- DROP TABLE IF EXISTS "Crawl" CASCADE;
-- DROP TABLE IF EXISTS "Project" CASCADE;
-- DROP TABLE IF EXISTS "VerificationToken" CASCADE;
-- DROP TABLE IF EXISTS "Session" CASCADE;
-- DROP TABLE IF EXISTS "Account" CASCADE;
-- DROP TABLE IF EXISTS "User" CASCADE;

-- ============================================================================
-- AUTHENTICATION & USER MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3) WITH TIME ZONE,
    "password" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) WITH TIME ZONE NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) WITH TIME ZONE NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- ============================================================================
-- PROJECT MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "crawlLimit" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'IDLE', -- IDLE, CRAWLING, COMPLETED, FAILED
    "healthScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Project_userId_domain_key" ON "Project"("userId", "domain");
CREATE INDEX IF NOT EXISTS "Project_userId_idx" ON "Project"("userId");

-- ============================================================================
-- CRAWL JOBS & RUNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Crawl" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED, CRAWLING, ANALYZING, COMPLETED, FAILED, CANCELLED
    "pagesDiscovered" INTEGER NOT NULL DEFAULT 0,
    "pagesAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "healthScore" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) WITH TIME ZONE,
    "completedAt" TIMESTAMP(3) WITH TIME ZONE,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Crawl_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Crawl_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Crawl_projectId_idx" ON "Crawl"("projectId");
CREATE INDEX IF NOT EXISTS "Crawl_projectId_createdAt_idx" ON "Crawl"("projectId", "createdAt");

-- ============================================================================
-- PAGES (DIGITAL TWIN NODES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Page" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "projectId" TEXT NOT NULL,
    "crawlId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "statusCode" INTEGER,
    "contentType" TEXT,
    "responseSize" INTEGER,
    "loadTime" INTEGER, -- in milliseconds
    "healthScore" DOUBLE PRECISION,
    "depth" INTEGER,

    -- SEO Metrics
    "titleLength" INTEGER,
    "metaDescription" TEXT,
    "metaDescLength" INTEGER,
    "canonical" TEXT,
    "robotsMeta" TEXT,
    "h1" TEXT,
    "h2Count" INTEGER DEFAULT 0,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "twitterTitle" TEXT,
    "twitterDescription" TEXT,
    "structuredData" TEXT, -- JSON payload
    "isIndexable" BOOLEAN NOT NULL DEFAULT true,

    -- Content Metrics
    "wordCount" INTEGER DEFAULT 0,
    "headings" TEXT, -- JSON payload of heading structure
    "imageCount" INTEGER DEFAULT 0,
    "linkCount" INTEGER DEFAULT 0,

    -- Technical Metrics
    "isHttps" BOOLEAN NOT NULL DEFAULT false,
    "hasViewport" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT,
    "redirectUrl" TEXT,
    "redirectChain" TEXT, -- JSON payload

    -- Accessibility Metrics
    "imagesWithoutAlt" INTEGER DEFAULT 0,
    "missingFormLabels" INTEGER DEFAULT 0,
    "headingHierarchyValid" BOOLEAN NOT NULL DEFAULT true,

    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Page_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Page_crawlId_fkey" FOREIGN KEY ("crawlId") REFERENCES "Crawl"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Page_projectId_crawlId_url_key" ON "Page"("projectId", "crawlId", "url");
CREATE INDEX IF NOT EXISTS "Page_projectId_idx" ON "Page"("projectId");
CREATE INDEX IF NOT EXISTS "Page_crawlId_idx" ON "Page"("crawlId");
CREATE INDEX IF NOT EXISTS "Page_projectId_url_idx" ON "Page"("projectId", "url");

-- ============================================================================
-- LINKS (DIGITAL TWIN EDGES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Link" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "projectId" TEXT NOT NULL,
    "crawlId" TEXT NOT NULL,
    "sourcePageId" TEXT,
    "targetPageId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "anchorText" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "isFollowed" BOOLEAN NOT NULL DEFAULT true,
    "statusCode" INTEGER,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Link_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Link_crawlId_fkey" FOREIGN KEY ("crawlId") REFERENCES "Crawl"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Link_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Link_targetPageId_fkey" FOREIGN KEY ("targetPageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Link_projectId_idx" ON "Link"("projectId");
CREATE INDEX IF NOT EXISTS "Link_crawlId_idx" ON "Link"("crawlId");
CREATE INDEX IF NOT EXISTS "Link_sourcePageId_idx" ON "Link"("sourcePageId");
CREATE INDEX IF NOT EXISTS "Link_targetPageId_idx" ON "Link"("targetPageId");
CREATE INDEX IF NOT EXISTS "Link_sourceUrl_idx" ON "Link"("sourceUrl");
CREATE INDEX IF NOT EXISTS "Link_targetUrl_idx" ON "Link"("targetUrl");

-- ============================================================================
-- ISSUES & AUDIT FINDINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Issue" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "projectId" TEXT NOT NULL,
    "crawlId" TEXT NOT NULL,
    "pageId" TEXT,
    "type" TEXT NOT NULL,     -- BROKEN_LINK, MISSING_TITLE, MISSING_META_DESC, etc.
    "severity" TEXT NOT NULL, -- CRITICAL, WARNING, INFO
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT,          -- JSON payload
    "recommendation" TEXT,
    "impact" TEXT,            -- HIGH, MEDIUM, LOW
    "affectedPages" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Issue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Issue_crawlId_fkey" FOREIGN KEY ("crawlId") REFERENCES "Crawl"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Issue_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Issue_projectId_idx" ON "Issue"("projectId");
CREATE INDEX IF NOT EXISTS "Issue_crawlId_idx" ON "Issue"("crawlId");
CREATE INDEX IF NOT EXISTS "Issue_pageId_idx" ON "Issue"("pageId");
CREATE INDEX IF NOT EXISTS "Issue_severity_idx" ON "Issue"("severity");
CREATE INDEX IF NOT EXISTS "Issue_type_idx" ON "Issue"("type");

-- ============================================================================
-- CRAWL SNAPSHOT CHANGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS "CrawlChange" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "projectId" TEXT NOT NULL,
    "crawlId" TEXT NOT NULL,
    "previousCrawlId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL, -- ADDED, REMOVED, MODIFIED
    "entityType" TEXT NOT NULL, -- PAGE, LINK, METADATA, STATUS
    "entityUrl" TEXT,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawlChange_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CrawlChange_crawlId_fkey" FOREIGN KEY ("crawlId") REFERENCES "Crawl"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrawlChange_previousCrawlId_fkey" FOREIGN KEY ("previousCrawlId") REFERENCES "Crawl"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CrawlChange_projectId_idx" ON "CrawlChange"("projectId");
CREATE INDEX IF NOT EXISTS "CrawlChange_crawlId_idx" ON "CrawlChange"("crawlId");

-- ============================================================================
-- PUBLIC SHARING
-- ============================================================================

CREATE TABLE IF NOT EXISTS "ShareLink" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "projectId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) WITH TIME ZONE,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ShareLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShareLink_token_key" ON "ShareLink"("token");
CREATE INDEX IF NOT EXISTS "ShareLink_projectId_idx" ON "ShareLink"("projectId");
CREATE INDEX IF NOT EXISTS "ShareLink_token_idx" ON "ShareLink"("token");

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT,
    "projectId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_projectId_idx" ON "AuditLog"("projectId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");

-- ============================================================================
-- AUTOMATIC TIMESTAMP UPDATERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_updated_at ON "User";
CREATE TRIGGER set_user_updated_at
    BEFORE UPDATE ON "User"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_project_updated_at ON "Project";
CREATE TRIGGER set_project_updated_at
    BEFORE UPDATE ON "Project"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NEWS ARTICLES & REFRESH (006_news & 007_fix_news_safe_delete)
-- ============================================================================

CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  image_url TEXT,
  article_url TEXT NOT NULL,
  news_site TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_news_site ON news(news_site);
CREATE INDEX IF NOT EXISTS idx_news_fetched_at ON news(fetched_at DESC);

CREATE OR REPLACE FUNCTION update_news_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_news_updated_at ON news;
CREATE TRIGGER set_news_updated_at
  BEFORE UPDATE ON news
  FOR EACH ROW
  EXECUTE FUNCTION update_news_updated_at_column();

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_news" ON news;
CREATE POLICY "service_role_all_news"
  ON news FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_read_news" ON news;
CREATE POLICY "anon_read_news"
  ON news FOR SELECT TO anon, authenticated USING (true);

-- Atomic News Replacement with Safe-Delete Guard (007_fix_news_safe_delete)
CREATE OR REPLACE FUNCTION replace_news(p_articles JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('indufar_news_refresh'));

  IF jsonb_typeof(p_articles) <> 'array' OR jsonb_array_length(p_articles) = 0 THEN
    RAISE EXCEPTION 'A non-empty article array is required';
  END IF;

  -- Satisfies Supabase safe-update guard
  DELETE FROM news WHERE id IS NOT NULL;

  INSERT INTO news (
    external_id, title, summary, image_url, article_url,
    news_site, published_at, fetched_at
  )
  SELECT
    item->>'external_id',
    item->>'title',
    NULLIF(item->>'summary', ''),
    NULLIF(item->>'image_url', ''),
    item->>'article_url',
    NULLIF(item->>'news_site', ''),
    NULLIF(item->>'published_at', '')::TIMESTAMPTZ,
    (item->>'fetched_at')::TIMESTAMPTZ
  FROM jsonb_array_elements(p_articles) AS item;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count <> jsonb_array_length(p_articles) THEN
    RAISE EXCEPTION 'Not all news articles were inserted';
  END IF;

  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION replace_news(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION replace_news(JSONB) TO service_role;

