import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/news - List news articles with search, source filtering, and sorting
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const source = searchParams.get('source')?.trim();
    const sort = searchParams.get('sort') || 'newest';

    const where: Record<string, unknown> = {};

    if (source) {
      where.newsSite = source;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
      ];
    }

    const orderBy: Record<string, 'asc' | 'desc'> =
      sort === 'oldest'
        ? { publishedAt: 'asc' }
        : { publishedAt: 'desc' };

    // If Supabase is configured, prioritize live Supabase data
    let articles: any[] = [];
    let sources: string[] = [];
    let total = 0;
    let loadedFromSupabase = false;

    try {
      const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
      if (isSupabaseConfigured()) {
        let query = supabaseAdmin.client
          .from('news')
          .select('*', { count: 'exact' });

        if (source) {
          query = query.eq('news_site', source);
        }

        if (search) {
          query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
        }

        query = query.order('published_at', { ascending: sort === 'oldest' });

        const { data, count, error } = await query;
        if (!error && data) {
          articles = data.map((item) => ({
            id: item.id,
            externalId: item.external_id,
            title: item.title,
            summary: item.summary,
            imageUrl: item.image_url,
            articleUrl: item.article_url,
            newsSite: item.news_site,
            publishedAt: item.published_at,
            fetchedAt: item.fetched_at,
            image_url: item.image_url,
            article_url: item.article_url,
            news_site: item.news_site,
            published_at: item.published_at,
            fetched_at: item.fetched_at,
          }));
          total = count ?? data.length;

          // Fetch unique sources from Supabase
          const { data: sourceData } = await supabaseAdmin.client
            .from('news')
            .select('news_site')
            .not('news_site', 'is', null);

          if (sourceData) {
            const uniqueSet = new Set<string>();
            sourceData.forEach((s) => {
              if (s.news_site) uniqueSet.add(s.news_site);
            });
            sources = Array.from(uniqueSet).sort();
          }

          loadedFromSupabase = true;
        }
      }
    } catch (supabaseErr) {
      console.warn('Supabase news query fell back to local db:', supabaseErr);
    }

    if (!loadedFromSupabase) {
      const [localArticles, allSourcesRaw, localTotal] = await Promise.all([
        db.news.findMany({
          where,
          orderBy,
        }),
        db.news.findMany({
          select: { newsSite: true },
          distinct: ['newsSite'],
          where: { newsSite: { not: null } },
        }),
        db.news.count({ where }),
      ]);

      articles = localArticles.map((item) => ({
        ...item,
        image_url: item.imageUrl,
        article_url: item.articleUrl,
        news_site: item.newsSite,
        published_at: item.publishedAt,
        fetched_at: item.fetchedAt,
      }));
      sources = allSourcesRaw
        .map((item) => item.newsSite)
        .filter((site): site is string => Boolean(site))
        .sort();
      total = localTotal;
    }

    return NextResponse.json({
      success: true,
      data: articles,
      sources,
      total,
      source: loadedFromSupabase ? 'supabase' : 'local',
    });
  } catch (error) {
    console.error('Failed to retrieve news articles:', error);
    return NextResponse.json(
      { error: 'Failed to load news articles' },
      { status: 500 }
    );
  }
}

// DELETE /api/news - Safely delete a specific news article
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // body not present
      }
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Article ID is required for deletion' },
        { status: 400 }
      );
    }

    // 1. Delete from Supabase if configured
    try {
      const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
      if (isSupabaseConfigured()) {
        await supabaseAdmin.client
          .from('news')
          .delete()
          .or(`id.eq.${id},external_id.eq.${id}`);
      }
    } catch (sbErr) {
      console.warn('Supabase delete notice:', sbErr);
    }

    // 2. Delete from local Prisma database
    await db.news.deleteMany({
      where: {
        OR: [{ id }, { externalId: id }],
      },
    });

    return NextResponse.json({
      success: true,
      message: 'News article deleted successfully (Supabase & Local)',
    });
  } catch (error) {
    console.error('Failed to delete news article:', error);
    return NextResponse.json(
      { error: 'Failed to delete news article' },
      { status: 500 }
    );
  }
}
