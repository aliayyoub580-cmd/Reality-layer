-- ============================================================================
-- RealityLayer — Supabase Seed Data
-- ============================================================================
-- Default Login Credentials:
-- Email:    demo@realitylayer.dev
-- Password: password123

-- 1. Insert Demo User
INSERT INTO "User" ("id", "name", "email", "password", "createdAt", "updatedAt")
VALUES (
    'usr_demo_realitylayer',
    'Alex Rivera',
    'demo@realitylayer.dev',
    '$2b$10$avch8PpJedgAsJs9wpd/S.ePm6U3EX9zrOl9zVBAKgPlqfP3.BfRW',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE SET
    "name" = EXCLUDED."name",
    "password" = EXCLUDED."password";

-- 2. Insert Demo Project
INSERT INTO "Project" ("id", "userId", "name", "domain", "url", "crawlLimit", "status", "healthScore", "createdAt", "updatedAt")
VALUES (
    'proj_demo_acme',
    'usr_demo_realitylayer',
    'Acme Cloud Platform',
    'acme.io',
    'https://acme.io',
    100,
    'COMPLETED',
    84.0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("userId", "domain") DO UPDATE SET
    "name" = EXCLUDED."name",
    "status" = EXCLUDED."status",
    "healthScore" = EXCLUDED."healthScore";

-- Clean previous demo crawl artifacts if re-running
DELETE FROM "Crawl" WHERE "id" = 'crawl_demo_acme_01';

-- 3. Insert Demo Completed Crawl
INSERT INTO "Crawl" (
    "id", "projectId", "status", "pagesDiscovered", "pagesAnalyzed", "totalPages", "healthScore", "startedAt", "completedAt", "createdAt"
)
VALUES (
    'crawl_demo_acme_01',
    'proj_demo_acme',
    'COMPLETED',
    14,
    14,
    14,
    84.0,
    CURRENT_TIMESTAMP - INTERVAL '3 minutes',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 4. Insert Digital Twin Pages
INSERT INTO "Page" (
    "id", "projectId", "crawlId", "url", "path", "title", "statusCode", "healthScore", "depth", "loadTime", "responseSize", "wordCount", "imageCount", "isHttps", "hasViewport", "metaDescription", "h1", "createdAt"
)
VALUES
(
    'page_home',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'https://acme.io/',
    '/',
    'Acme Cloud — Intelligent Infrastructure',
    200, 92.0, 0, 240, 45000, 650, 4, true, true,
    'Comprehensive architecture overview and insights for /.',
    'Acme Cloud — Intelligent Infrastructure',
    CURRENT_TIMESTAMP
),
(
    'page_features',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'https://acme.io/features',
    '/features',
    'Platform Features & Capabilities | Acme',
    200, 88.0, 1, 310, 52000, 820, 6, true, true,
    'Comprehensive architecture overview and insights for /features.',
    'Platform Features & Capabilities',
    CURRENT_TIMESTAMP
),
(
    'page_pricing',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'https://acme.io/pricing',
    '/pricing',
    'Transparent Usage Pricing | Acme',
    200, 95.0, 1, 190, 38000, 420, 2, true, true,
    'Comprehensive architecture overview and insights for /pricing.',
    'Transparent Usage Pricing',
    CURRENT_TIMESTAMP
),
(
    'page_docs',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'https://acme.io/docs',
    '/docs',
    'Documentation & Architecture Guides | Acme',
    200, 90.0, 1, 280, 68000, 1400, 3, true, true,
    'Comprehensive architecture overview and insights for /docs.',
    'Documentation & Architecture Guides',
    CURRENT_TIMESTAMP
),
(
    'page_quickstart',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'https://acme.io/docs/quickstart',
    '/docs/quickstart',
    'Quickstart Guide | Acme Docs',
    200, 91.0, 2, 220, 42000, 900, 2, true, true,
    'Comprehensive architecture overview and insights for /docs/quickstart.',
    'Quickstart Guide',
    CURRENT_TIMESTAMP
),
(
    'page_api_ref',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'https://acme.io/docs/api-reference',
    '/docs/api-reference',
    'REST & GraphQL API Reference | Acme Docs',
    200, 84.0, 2, 480, 110000, 2200, 1, true, true,
    'Comprehensive architecture overview and insights for /docs/api-reference.',
    'REST & GraphQL API Reference',
    CURRENT_TIMESTAMP
),
(
    'page_webhooks',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'https://acme.io/docs/api/webhooks',
    '/docs/api/webhooks',
    'Real-time Webhooks & Events',
    200, 80.0, 3, 340, 54000, 780, 1, true, true,
    'Comprehensive architecture overview and insights for /docs/api/webhooks.',
    'Real-time Webhooks & Events',
    CURRENT_TIMESTAMP
),
(
    'page_blog',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'https://acme.io/blog',
    '/blog',
    'Engineering & Product Insights | Acme Blog',
    200, 78.0, 1, 520, 85000, 1100, 8, true, true,
    'Comprehensive architecture overview and insights for /blog.',
    'Engineering & Product Insights',
    CURRENT_TIMESTAMP
),
(
    'page_zero_trust',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'https://acme.io/blog/zero-trust-scaling',
    '/blog/zero-trust-scaling',
    'Scaling to 10M Requests with Zero Trust',
    200, 82.0, 2, 390, 64000, 1600, 4, true, true,
    'Comprehensive architecture overview and insights for /blog/zero-trust-scaling.',
    'Scaling to 10M Requests with Zero Trust',
    CURRENT_TIMESTAMP
),
(
    'page_about',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'https://acme.io/about',
    '/about',
    'About Our Team & Mission | Acme',
    200, 85.0, 1, 210, 34000, 500, 3, true, true,
    'Comprehensive architecture overview and insights for /about.',
    'About Our Team & Mission',
    CURRENT_TIMESTAMP
),
(
    'page_security',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'https://acme.io/security',
    '/security',
    'Enterprise Security & Compliance (SOC2)',
    200, 89.0, 2, 260, 48000, 850, 2, true, true,
    'Comprehensive architecture overview and insights for /security.',
    'Enterprise Security & Compliance (SOC2)',
    CURRENT_TIMESTAMP
),
(
    'page_privacy',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'https://acme.io/privacy',
    '/privacy',
    'Privacy Policy',
    200, 72.0, 2, 180, 28000, 1900, 0, true, true,
    'Comprehensive architecture overview and insights for /privacy.',
    'Privacy Policy',
    CURRENT_TIMESTAMP
),
(
    'page_legacy_sdk',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'https://acme.io/legacy-v1-sdk',
    '/legacy-v1-sdk',
    'Deprecated V1 SDK Guide',
    404, 40.0, 3, 120, 8000, 120, 0, true, true,
    'Comprehensive architecture overview and insights for /legacy-v1-sdk.',
    'Deprecated V1 SDK Guide',
    CURRENT_TIMESTAMP
),
(
    'page_hidden_campaign',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'https://acme.io/hidden-campaign-landing',
    '/hidden-campaign-landing',
    'Exclusive Special Offer',
    200, 65.0, 2, 310, 32000, 340, 2, true, true,
    'Comprehensive architecture overview and insights for /hidden-campaign-landing.',
    'Exclusive Special Offer',
    CURRENT_TIMESTAMP
);

-- 5. Insert Digital Twin Edges (Links)
INSERT INTO "Link" (
    "id", "projectId", "crawlId", "sourcePageId", "targetPageId", "sourceUrl", "targetUrl", "anchorText", "isInternal", "isFollowed"
)
VALUES
    ('link_1', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_home', 'page_features', 'https://acme.io/', 'https://acme.io/features', 'features', true, true),
    ('link_2', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_home', 'page_pricing', 'https://acme.io/', 'https://acme.io/pricing', 'pricing', true, true),
    ('link_3', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_home', 'page_docs', 'https://acme.io/', 'https://acme.io/docs', 'docs', true, true),
    ('link_4', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_home', 'page_blog', 'https://acme.io/', 'https://acme.io/blog', 'blog', true, true),
    ('link_5', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_home', 'page_about', 'https://acme.io/', 'https://acme.io/about', 'about', true, true),
    ('link_6', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_features', 'page_pricing', 'https://acme.io/features', 'https://acme.io/pricing', 'pricing', true, true),
    ('link_7', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_features', 'page_docs', 'https://acme.io/features', 'https://acme.io/docs', 'docs', true, true),
    ('link_8', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_docs', 'page_quickstart', 'https://acme.io/docs', 'https://acme.io/docs/quickstart', 'docs quickstart', true, true),
    ('link_9', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_docs', 'page_api_ref', 'https://acme.io/docs', 'https://acme.io/docs/api-reference', 'docs api reference', true, true),
    ('link_10', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_api_ref', 'page_webhooks', 'https://acme.io/docs/api-reference', 'https://acme.io/docs/api/webhooks', 'docs api webhooks', true, true),
    ('link_11', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_api_ref', 'page_legacy_sdk', 'https://acme.io/docs/api-reference', 'https://acme.io/legacy-v1-sdk', 'legacy v1 sdk', true, true),
    ('link_12', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_blog', 'page_zero_trust', 'https://acme.io/blog', 'https://acme.io/blog/zero-trust-scaling', 'blog zero trust scaling', true, true),
    ('link_13', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_zero_trust', 'page_docs', 'https://acme.io/blog/zero-trust-scaling', 'https://acme.io/docs', 'docs', true, true),
    ('link_14', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_about', 'page_security', 'https://acme.io/about', 'https://acme.io/security', 'security', true, true),
    ('link_15', 'proj_demo_acme', 'crawl_demo_acme_01', 'page_about', 'page_privacy', 'https://acme.io/about', 'https://acme.io/privacy', 'privacy', true, true);

-- 6. Insert Diagnostic Issues
INSERT INTO "Issue" (
    "id", "projectId", "crawlId", "pageId", "type", "severity", "title", "description", "impact", "recommendation", "affectedPages"
)
VALUES
(
    'issue_1',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'page_api_ref',
    'BROKEN_LINK',
    'CRITICAL',
    'Broken internal hyperlink (HTTP 404)',
    'Link pointing to /legacy-v1-sdk returns HTTP 404 Not Found.',
    'HIGH',
    'Update link reference to current active documentation.',
    1
),
(
    'issue_2',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'page_hidden_campaign',
    'ORPHAN_PAGE',
    'WARNING',
    'Orphan page with zero inbound internal links',
    'Page /hidden-campaign-landing has no incoming paths.',
    'MEDIUM',
    'Link this page from a relevant category hub or sitemap.',
    1
),
(
    'issue_3',
    'proj_demo_acme',
    'crawl_demo_acme_01',
    'page_privacy',
    'MISSING_CANONICAL',
    'WARNING',
    'Missing canonical tag on legal document',
    'Page /privacy does not declare a rel="canonical" link.',
    'MEDIUM',
    'Declare <link rel="canonical" href="https://acme.io/privacy" />.',
    1
);

-- 7. Insert Public Share Link
INSERT INTO "ShareLink" ("id", "projectId", "token", "isActive")
VALUES (
    'share_demo_acme',
    'proj_demo_acme',
    'demo-share-acme',
    true
)
ON CONFLICT ("token") DO NOTHING;
