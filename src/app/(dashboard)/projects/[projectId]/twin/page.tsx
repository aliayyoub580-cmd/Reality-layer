'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PageNode } from '@/components/twin/page-node';
import { PageInspector } from '@/components/twin/page-inspector';
import type { GraphNode } from '@/types';
import { Network, Loader2, AlertCircle, Search } from 'lucide-react';

const nodeTypes = { pageNode: PageNode };

export default function TwinPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Fetch graph data
  useEffect(() => {
    async function loadGraph() {
      try {
        const res = await fetch(`/api/projects/${projectId}/twin`);
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || 'Failed to load digital twin');
          return;
        }

        const data = json.data;

        if (!data.nodes || data.nodes.length === 0) {
          setError('No crawl data available. Start a crawl first.');
          return;
        }

        // Create position map
        const posMap = new Map<string, { x: number; y: number }>();
        for (const pos of data.positions || []) {
          posMap.set(pos.id, { x: pos.x, y: pos.y });
        }

        // Convert to React Flow nodes
        const rfNodes: Node[] = data.nodes.map((node: GraphNode) => {
          const pos = posMap.get(node.id) || { x: 0, y: 0 };
          return {
            id: node.id,
            type: 'pageNode',
            position: pos,
            data: { ...node, selected: false },
          };
        });

        // Convert to React Flow edges
        const rfEdges: Edge[] = data.edges.map((edge: { id: string; source: string; target: string }) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#e5e5e5', strokeWidth: 1.5 },
        }));

        setNodes(rfNodes);
        setEdges(rfEdges);
      } catch {
        setError('Failed to load digital twin data');
      } finally {
        setLoading(false);
      }
    }

    loadGraph();
  }, [projectId, setNodes, setEdges]);

  // Handle node click
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const graphNode = node.data as unknown as GraphNode;
      setSelectedNode(graphNode);

      // Update selection visual
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...(n.data as Record<string, unknown>), selected: n.id === node.id },
        }))
      );
    },
    [setNodes]
  );

  // Handle background click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...(n.data as Record<string, unknown>), selected: false },
      }))
    );
  }, [setNodes]);

  // Search functionality
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return nodes.filter((n) => {
      const data = n.data as unknown as GraphNode;
      return (
        data.url?.toLowerCase().includes(q) ||
        data.path?.toLowerCase().includes(q) ||
        data.title?.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, nodes]);

  // Keyboard shortcut for search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' || (e.key === 'f' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-neutral-400" />
          <p className="text-sm text-neutral-500">Loading Digital Twin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle size={24} className="text-neutral-400" />
          <p className="text-sm text-neutral-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-56px)] w-full -mx-4 -my-6 lg:-mx-8 lg:-my-8">
      {/* Search overlay */}
      {showSearch && (
        <div className="absolute left-4 top-4 z-30 w-72">
          <div className="rounded-lg border border-neutral-200 bg-white shadow-lg">
            <div className="flex items-center gap-2 px-3 py-2">
              <Search size={14} className="text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages..."
                autoFocus
                className="flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
            </div>
            {searchQuery && filteredNodes.length > 0 && (
              <div className="max-h-48 overflow-y-auto border-t border-neutral-100">
                {filteredNodes.slice(0, 10).map((node) => {
                  const data = node.data as unknown as GraphNode;
                  return (
                    <button
                      key={node.id}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-neutral-50"
                      onClick={() => {
                        onNodeClick({} as React.MouseEvent, node);
                        setShowSearch(false);
                        setSearchQuery('');
                      }}
                    >
                      <span className="truncate font-medium text-neutral-900">
                        {data.title || data.path}
                      </span>
                      <span className="shrink-0 font-mono text-neutral-400">
                        {data.path}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="absolute left-4 bottom-4 z-20 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white/90 px-4 py-2 text-xs text-neutral-500 backdrop-blur-sm shadow-sm">
        <Network size={12} className="text-neutral-400" />
        <span><strong className="text-neutral-700">{nodes.length}</strong> pages</span>
        <span className="text-neutral-200">·</span>
        <span><strong className="text-neutral-700">{edges.length}</strong> links</span>
        <span className="text-neutral-200">·</span>
        <span className="text-neutral-400">Press / to search</span>
      </div>

      {/* React Flow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.0 }}
        minZoom={0.2}
        maxZoom={2}
        className="bg-neutral-50/50"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e5e5e5" gap={24} size={1} />
        <Controls showInteractive={false} className="!border-neutral-200 !shadow-sm" />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as unknown as GraphNode;
            if (!data.healthScore) return '#d4d4d4';
            if (data.healthScore >= 90) return '#34d399';
            if (data.healthScore >= 70) return '#fbbf24';
            return '#f87171';
          }}
          maskColor="rgba(0,0,0,0.05)"
          className="!border-neutral-200 !shadow-sm"
        />
      </ReactFlow>

      {/* Page Inspector */}
      <PageInspector node={selectedNode} onClose={() => {
        setSelectedNode(null);
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            data: { ...(n.data as Record<string, unknown>), selected: false },
          }))
        );
      }} />
    </div>
  );
}
