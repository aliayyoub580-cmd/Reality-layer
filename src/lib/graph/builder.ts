/**
 * Graph Data Builder
 * Converts database pages and links into React Flow nodes and edges
 */

import type { GraphNode, GraphEdge, GraphData } from '@/types';

interface DbPage {
  id: string;
  url: string;
  path: string;
  title: string | null;
  healthScore: number | null;
  statusCode: number | null;
  depth: number | null;
  isIndexable: boolean;
  inboundLinks: { id: string }[];
  outboundLinks: { id: string }[];
  issues: { id: string; severity: string }[];
}

interface DbLink {
  id: string;
  sourcePageId: string | null;
  targetPageId: string | null;
  isInternal: boolean;
}

/**
 * Detect page type from URL path
 */
function detectPageType(path: string): string {
  if (path === '/' || path === '') return 'homepage';
  const lower = path.toLowerCase();
  if (lower.includes('/blog') || lower.includes('/post') || lower.includes('/article')) return 'blog-post';
  if (lower.includes('/product') || lower.includes('/shop') || lower.includes('/item')) return 'product';
  if (lower.includes('/category') || lower.includes('/tag')) return 'category';
  if (lower.includes('/about')) return 'about';
  if (lower.includes('/contact')) return 'contact';
  if (lower.includes('/service')) return 'service';
  if (lower.includes('/pricing') || lower.includes('/plan')) return 'landing';
  if (lower.includes('/privacy') || lower.includes('/terms') || lower.includes('/legal')) return 'legal';
  return 'page';
}

/**
 * Get page status from status code
 */
function getPageStatus(statusCode: number | null): string {
  if (!statusCode) return 'ERROR';
  if (statusCode >= 200 && statusCode < 300) return 'OK';
  if (statusCode >= 300 && statusCode < 400) return 'REDIRECT';
  if (statusCode >= 400 && statusCode < 500) return 'CLIENT_ERROR';
  if (statusCode >= 500) return 'SERVER_ERROR';
  return 'ERROR';
}

/**
 * Build graph data from pages and links
 */
export function buildGraphData(
  pages: DbPage[],
  links: DbLink[],
  options?: { isLimited?: boolean }
): GraphData {
  const nodes: GraphNode[] = pages.map((page) => {
    const isOrphan =
      !options?.isLimited &&
      page.inboundLinks.length === 0 &&
      page.path !== '/' &&
      page.statusCode === 200 &&
      page.isIndexable !== false;

    return {
      id: page.id,
      url: page.url,
      path: page.path,
      title: page.title,
      healthScore: page.healthScore,
      statusCode: page.statusCode,
      depth: page.depth,
      inboundCount: page.inboundLinks.length,
      outboundCount: page.outboundLinks.length,
      pageType: detectPageType(page.path) as GraphNode['pageType'],
      status: getPageStatus(page.statusCode) as GraphNode['status'],
      issueCount: page.issues.length,
      isOrphan,
    };
  });

  const edges: GraphEdge[] = links
    .filter((link) => link.sourcePageId && link.targetPageId && link.isInternal)
    .map((link) => ({
      id: link.id,
      source: link.sourcePageId!,
      target: link.targetPageId!,
      anchorText: null,
    }));

  // Deduplicate edges (same source → target)
  const edgeKeys = new Set<string>();
  const deduplicatedEdges = edges.filter((edge) => {
    const key = `${edge.source}->${edge.target}`;
    if (edgeKeys.has(key)) return false;
    edgeKeys.add(key);
    return true;
  });

  return { nodes, edges: deduplicatedEdges };
}

/**
 * Calculate hierarchical layout positions for nodes
 * Uses BFS from homepage to assign depth levels
 */
export function calculateHierarchicalLayout(
  data: GraphData
): { id: string; x: number; y: number }[] {
  const positions: { id: string; x: number; y: number }[] = [];

  // Find homepage
  const homepage = data.nodes.find((n) => n.path === '/' || n.path === '');
  if (!homepage) {
    // Fallback: grid layout
    data.nodes.forEach((node, i) => {
      const cols = Math.ceil(Math.sqrt(data.nodes.length));
      positions.push({
        id: node.id,
        x: (i % cols) * 280,
        y: Math.floor(i / cols) * 180,
      });
    });
    return positions;
  }

  // BFS to assign depths
  const adjacency = new Map<string, string[]>();
  for (const edge of data.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);
  }

  const depths = new Map<string, number>();
  const queue = [homepage.id];
  depths.set(homepage.id, 0);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const depth = depths.get(nodeId)!;
    const neighbors = adjacency.get(nodeId) || [];

    for (const neighbor of neighbors) {
      if (!depths.has(neighbor)) {
        depths.set(neighbor, depth + 1);
        queue.push(neighbor);
      }
    }
  }

  const maxDepth = depths.size > 0 ? Math.max(...Array.from(depths.values())) : 0;
  const orphanDepth = maxDepth + 1;

  // Assign positions per depth level
  const depthGroups = new Map<number, string[]>();
  for (const node of data.nodes) {
    const depth = depths.get(node.id) ?? orphanDepth; // orphans placed directly below tree
    if (!depthGroups.has(depth)) depthGroups.set(depth, []);
    depthGroups.get(depth)!.push(node.id);
  }

  const HORIZONTAL_SPACING = 280;
  const VERTICAL_SPACING = 180;

  for (const [depth, nodeIds] of depthGroups) {
    const totalWidth = (nodeIds.length - 1) * HORIZONTAL_SPACING;
    const startX = -totalWidth / 2;

    nodeIds.forEach((nodeId, index) => {
      positions.push({
        id: nodeId,
        x: startX + index * HORIZONTAL_SPACING,
        y: depth * VERTICAL_SPACING,
      });
    });
  }

  return positions;
}
