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
