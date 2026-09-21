import { PrismaClient } from '@prisma/client';
import { startCrawl } from '../src/lib/crawler/engine';
import { getCategoryScores, calculateHealthScore } from '../src/lib/scoring/health';

const db = new PrismaClient();

async function run() {
  console.log('=== REALITYLAYER SITE ANALYSIS ENGINE ===');
  const targetUrl = 'https://atif-portfolio-nine.vercel.app';
  const targetDomain = 'atif-portfolio-nine.vercel.app';

  // 1. Get or create demo user
  let user = await db.user.findUnique({
    where: { email: 'demo@realitylayer.dev' },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        email: 'demo@realitylayer.dev',
        name: 'Alex Rivera',
      },
    });
  }

  console.log(`Using user: ${user.email} (${user.id})`);

  // 2. Clear previous project for this domain if exists
  const existing = await db.project.findFirst({
    where: { userId: user.id, domain: targetDomain },
  });

  if (existing) {
    console.log(`Cleaning up previous project ${existing.id}...`);
    await db.project.delete({ where: { id: existing.id } });
  }

  // 3. Create project
  console.log(`Creating project for: ${targetUrl}...`);
  const project = await db.project.create({
    data: {
      userId: user.id,
      name: 'Atif Ayyoub Portfolio',
      domain: targetDomain,
      url: targetUrl,
      crawlLimit: 50,
      status: 'IDLE',
    },
  });

  console.log(`Project created: ID=${project.id}`);

  // 4. Trigger crawl
  console.log('Starting crawl & digital twin synthesis...');
  const crawlId = await startCrawl(project.id, {
    maxPages: 50,
    concurrency: 3,
    delayMs: 300,
    respectRobots: true,
  });

  console.log(`Crawl started: ID=${crawlId}. Waiting for completion...`);

  // Poll until crawl completes or fails
  let completed = false;
  let attempts = 0;
  while (!completed && attempts < 60) {
    await new Promise((r) => setTimeout(r, 1000));
    attempts++;
    const crawl = await db.crawl.findUnique({
      where: { id: crawlId },
    });
    if (crawl?.status === 'COMPLETED' || crawl?.status === 'FAILED') {
      completed = true;
      console.log(`Crawl status: ${crawl.status}`);
      if (crawl.status === 'FAILED') {
        console.error('Crawl failed with error:', crawl.errorMessage);
        process.exit(1);
      }
    } else {
      process.stdout.write(`\rCrawling... (${attempts}s) - analyzed: ${crawl?.pagesAnalyzed ?? 0}`);
    }
  }

  // 5. Query detailed results
  const updatedProject = await db.project.findUnique({
    where: { id: project.id },
  });

  const pages = await db.page.findMany({
    where: { crawlId },
    include: {
      outboundLinks: true,
      inboundLinks: true,
    },
  });

  const issues = await db.issue.findMany({
    where: { crawlId },
  });

  const links = await db.link.findMany({
    where: { crawlId },
  });

  const categoryScores = getCategoryScores(issues);

  console.log('\n\n========================================');
  console.log(`ANALYSIS REPORT FOR: ${targetUrl}`);
  console.log('========================================');
  console.log(`Project ID: ${project.id}`);
  console.log(`Overall Health Score: ${updatedProject?.healthScore}/100`);
  console.log('\n--- CATEGORY BREAKDOWN ---');
  for (const [cat, data] of Object.entries(categoryScores)) {
    console.log(`• ${cat.toUpperCase()}: ${data.score}/100 (${data.issues} issues, weight: ${data.weight * 100}%)`);
  }

  console.log('\n--- PAGES DISCOVERED & ANALYZED ---');
  for (const p of pages) {
    console.log(`\n[${p.statusCode}] ${p.url}`);
    console.log(`  Title: ${p.title || '(No Title)'} (${p.titleLength || 0} chars)`);
    console.log(`  Meta Desc: ${p.metaDescription ? p.metaDescription.slice(0, 80) + '...' : '(None)'}`);
    console.log(`  H1: ${p.h1 || '(None)'}`);
    console.log(`  H2 Count: ${p.h2Count}`);
    console.log(`  Word Count: ${p.wordCount}`);
    console.log(`  Load Time: ${p.loadTime}ms | Size: ${p.responseSize ? (p.responseSize / 1024).toFixed(1) : 0} KB`);
    console.log(`  Images: ${p.imageCount} (Missing Alt: ${p.imagesWithoutAlt})`);
    console.log(`  Health Score: ${p.healthScore}/100`);
  }

  console.log('\n--- ISSUES DETECTED ---');
  console.log(`Total Issues: ${issues.length}`);
  const critical = issues.filter((i) => i.severity === 'CRITICAL');
  const warning = issues.filter((i) => i.severity === 'WARNING');
  const info = issues.filter((i) => i.severity === 'INFO');

  console.log(`Critical: ${critical.length} | Warnings: ${warning.length} | Info: ${info.length}`);

  if (critical.length > 0) {
    console.log('\n[CRITICAL ISSUES]');
    for (const c of critical) {
      console.log(`- [${c.type}] ${c.title}: ${c.description}`);
      console.log(`  Recommendation: ${c.recommendation}`);
    }
  }

  if (warning.length > 0) {
    console.log('\n[WARNINGS]');
    for (const w of warning) {
      console.log(`- [${w.type}] ${w.title}: ${w.description}`);
      console.log(`  Recommendation: ${w.recommendation}`);
    }
  }

  if (info.length > 0) {
    console.log('\n[NOTICES & INFO]');
    for (const inf of info) {
      console.log(`- [${inf.type}] ${inf.title}: ${inf.description}`);
    }
  }

  console.log('\n--- LINKS & TOPOLOGY ---');
  console.log(`Total Links Discovered: ${links.length}`);
  const internal = links.filter((l) => l.isInternal);
  const external = links.filter((l) => !l.isInternal);
  console.log(`Internal Links: ${internal.length}`);
  console.log(`External Links: ${external.length}`);

  console.log('\nDashboard URL:');
  console.log(`http://localhost:3000/projects/${project.id}/twin`);
  console.log('========================================\n');
}

run()
  .catch(console.error)
  .finally(() => db.$disconnect());
