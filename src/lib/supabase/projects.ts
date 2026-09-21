import { db } from '@/lib/db';
import { isSupabaseConfigured, supabaseAdmin } from './server';

export interface ProjectData {
  id: string;
  userId: string;
  name: string;
  domain: string;
  url: string;
  crawlLimit: number;
  status: string;
  healthScore: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CrawlData {
  id: string;
  projectId: string;
  status: string;
  pagesDiscovered: number;
  pagesAnalyzed: number;
  totalPages: number;
  healthScore: number | null;
  errorMessage: string | null;
  startedAt: string | Date | null;
  completedAt: string | Date | null;
  createdAt: string | Date;
}

/**
 * Find a project by ID and optionally userId, checking Supabase first, then local DB.
 */
export async function findProject(
  projectId: string,
  userId?: string
): Promise<ProjectData | null> {
  // 1. Check Supabase (primary cloud store)
  if (isSupabaseConfigured()) {
    try {
      let query = supabaseAdmin.client.from('Project').select('*').eq('id', projectId);
      if (userId) {
        query = query.eq('userId', userId);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        return data as ProjectData;
      }
    } catch (sbErr) {
      console.warn('Supabase findProject notice:', sbErr);
    }
  }

  // 2. Fallback to local db
  try {
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        ...(userId ? { userId } : {}),
      },
    });
    if (project) {
      return project as ProjectData;
    }
  } catch (dbErr) {
    console.warn('Local db findProject notice:', dbErr);
  }

  return null;
}

/**
 * Find a project with its recent crawls and counts, checking Supabase and local DB.
 */
export async function findProjectWithDetails(
  projectId: string,
  userId?: string
): Promise<{
  project: ProjectData;
  crawls: CrawlData[];
  counts: { pages: number; links: number; issues: number };
} | null> {
  // 1. Check Supabase
  if (isSupabaseConfigured()) {
    try {
      let query = supabaseAdmin.client.from('Project').select('*').eq('id', projectId);
      if (userId) {
        query = query.eq('userId', userId);
      }
      const { data: project, error } = await query.maybeSingle();
      if (!error && project) {
        const { data: crawls } = await supabaseAdmin.client
          .from('Crawl')
          .select('*')
          .eq('projectId', projectId)
          .order('createdAt', { ascending: false })
          .limit(5);

        const [pagesRes, linksRes, issuesRes] = await Promise.all([
          supabaseAdmin.client.from('Page').select('id', { count: 'exact', head: true }).eq('projectId', projectId),
          supabaseAdmin.client.from('Link').select('id', { count: 'exact', head: true }).eq('projectId', projectId),
          supabaseAdmin.client.from('Issue').select('id', { count: 'exact', head: true }).eq('projectId', projectId),
        ]);

        return {
          project: project as ProjectData,
          crawls: (crawls || []) as CrawlData[],
          counts: {
            pages: pagesRes.count || 0,
            links: linksRes.count || 0,
            issues: issuesRes.count || 0,
          },
        };
      }
    } catch (sbErr) {
      console.warn('Supabase findProjectWithDetails notice:', sbErr);
    }
  }

  // 2. Fallback to local DB
  try {
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        ...(userId ? { userId } : {}),
      },
      include: {
        crawls: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: { select: { pages: true, links: true, issues: true } },
      },
    });

    if (project) {
      return {
        project: project as unknown as ProjectData,
        crawls: project.crawls as unknown as CrawlData[],
        counts: project._count,
      };
    }
  } catch (dbErr) {
    console.warn('Local db findProjectWithDetails notice:', dbErr);
  }

  return null;
}

/**
 * Get the latest crawl for a project.
 */
export async function getLatestCrawl(
  projectId: string,
  status?: string
): Promise<CrawlData | null> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabaseAdmin.client
        .from('Crawl')
        .select('*')
        .eq('projectId', projectId)
        .order('createdAt', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.limit(1).maybeSingle();
      if (!error && data) {
        return data as CrawlData;
      }
    } catch (sbErr) {
      console.warn('Supabase getLatestCrawl notice:', sbErr);
    }
  }

  try {
    const crawl = await db.crawl.findFirst({
      where: {
        projectId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    if (crawl) {
      return crawl as unknown as CrawlData;
    }
  } catch (dbErr) {
    console.warn('Local db getLatestCrawl notice:', dbErr);
  }

  return null;
}

/**
 * Find pages for a crawl with pagination and filtering.
 */
export async function findPagesForCrawl(
  crawlId: string,
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}
) {
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const sort = options.sort || 'path';
  const order = options.order || 'asc';
  const search = options.search?.trim() || '';

  if (isSupabaseConfigured()) {
    try {
      let query = supabaseAdmin.client
        .from('Page')
        .select('*', { count: 'exact' })
        .eq('crawlId', crawlId);

      if (search) {
        query = query.or(`url.ilike.%${search}%,title.ilike.%${search}%,path.ilike.%${search}%`);
      }

      query = query
        .order(sort, { ascending: order === 'asc' })
        .range((page - 1) * pageSize, page * pageSize - 1);

      const { data, count, error } = await query;
      if (!error && data) {
        return {
          items: data.map((p: any) => ({
            ...p,
            issueCount: 0,
            inboundCount: 0,
            outboundCount: p.linkCount || 0,
          })),
          total: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
        };
      }
    } catch (sbErr) {
      console.warn('Supabase findPagesForCrawl notice:', sbErr);
    }
  }

  try {
    const where: any = {
      crawlId,
      ...(search
        ? {
            OR: [
              { url: { contains: search } },
              { title: { contains: search } },
              { path: { contains: search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.page.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { issues: true, inboundLinks: true, outboundLinks: true } },
        },
      }),
      db.page.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        ...p,
        issueCount: p._count.issues,
        inboundCount: p._count.inboundLinks,
        outboundCount: p._count.outboundLinks,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (dbErr) {
    console.warn('Local db findPagesForCrawl notice:', dbErr);
    return { items: [], total: 0, page, pageSize, totalPages: 0 };
  }
}

/**
 * Find issues for a crawl with counts and filtering.
 */
export async function findIssuesForCrawl(
  crawlId: string,
  options: {
    severity?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const page = options.page || 1;
  const pageSize = options.pageSize || 50;
  const severity = options.severity;
  const type = options.type;

  if (isSupabaseConfigured()) {
    try {
      let query = supabaseAdmin.client
        .from('Issue')
        .select('*, page:Page(url, path, title)', { count: 'exact' })
        .eq('crawlId', crawlId);

      if (severity) query = query.eq('severity', severity);
      if (type) query = query.eq('type', type);

      query = query
        .order('severity', { ascending: true })
        .order('type', { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1);

      const [listRes, allIssuesRes] = await Promise.all([
        query,
        supabaseAdmin.client.from('Issue').select('severity, type, title').eq('crawlId', crawlId),
      ]);

      if (!listRes.error && listRes.data) {
        const allIssues = allIssuesRes.data || [];
        const criticalCount = allIssues.filter((i: any) => i.severity === 'CRITICAL').length;
        const warningCount = allIssues.filter((i: any) => i.severity === 'WARNING').length;
        const infoCount = allIssues.filter((i: any) => i.severity === 'INFO').length;

        const typeMap = new Map<string, { type: string; severity: string; title: string; affectedPagesCount: number }>();
        for (const i of allIssues) {
          const key = `${i.type}_${i.severity}`;
          if (!typeMap.has(key)) {
            typeMap.set(key, { type: i.type, severity: i.severity, title: i.title, affectedPagesCount: 1 });
          } else {
            typeMap.get(key)!.affectedPagesCount++;
          }
        }

        const total = listRes.count || 0;
        return {
          items: listRes.data,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          summary: {
            critical: criticalCount,
            warning: warningCount,
            info: infoCount,
            distinctTypes: typeMap.size,
            groupedTypes: Array.from(typeMap.values()),
          },
        };
      }
    } catch (sbErr) {
      console.warn('Supabase findIssuesForCrawl notice:', sbErr);
    }
  }

  try {
    const where: any = {
      crawlId,
      ...(severity ? { severity } : {}),
      ...(type ? { type } : {}),
    };

    const [items, total, criticalCount, warningCount, infoCount, groupedTypesRaw] = await Promise.all([
      db.issue.findMany({
        where,
        orderBy: [{ severity: 'asc' }, { type: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          page: { select: { url: true, path: true, title: true } },
        },
      }),
      db.issue.count({ where }),
      db.issue.count({ where: { crawlId, severity: 'CRITICAL' } }),
      db.issue.count({ where: { crawlId, severity: 'WARNING' } }),
      db.issue.count({ where: { crawlId, severity: 'INFO' } }),
      db.issue.groupBy({
        by: ['type', 'severity', 'title'],
        where: { crawlId },
        _count: { id: true },
      }),
    ]);

    const groupedTypes = groupedTypesRaw.map((g) => ({
      type: g.type,
      severity: g.severity,
      title: g.title,
      affectedPagesCount: g._count.id,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      summary: {
        critical: criticalCount,
        warning: warningCount,
        info: infoCount,
        distinctTypes: groupedTypes.length,
        groupedTypes,
      },
    };
  } catch (dbErr) {
    console.warn('Local db findIssuesForCrawl notice:', dbErr);
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      summary: { critical: 0, warning: 0, info: 0, distinctTypes: 0, groupedTypes: [] },
    };
  }
}

