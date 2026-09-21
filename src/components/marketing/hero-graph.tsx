'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  health: number;
  delay: number;
}

interface Edge {
  from: string;
  to: string;
  delay: number;
}

const nodes: Node[] = [
  { id: 'home', label: 'Home', x: 50, y: 8, health: 96, delay: 0 },
  { id: 'about', label: 'About', x: 18, y: 32, health: 92, delay: 0.1 },
  { id: 'products', label: 'Products', x: 50, y: 32, health: 88, delay: 0.15 },
  { id: 'blog', label: 'Blog', x: 82, y: 32, health: 94, delay: 0.2 },
  { id: 'shop', label: 'Shop', x: 35, y: 56, health: 78, delay: 0.3 },
  { id: 'pricing', label: 'Pricing', x: 65, y: 56, health: 71, delay: 0.35 },
  { id: 'post1', label: 'Post 1', x: 75, y: 56, health: 90, delay: 0.4 },
  { id: 'post2', label: 'Post 2', x: 90, y: 56, health: 85, delay: 0.45 },
  { id: 'contact', label: 'Contact', x: 50, y: 78, health: 55, delay: 0.5 },
];

const edges: Edge[] = [
  { from: 'home', to: 'about', delay: 0.2 },
  { from: 'home', to: 'products', delay: 0.25 },
  { from: 'home', to: 'blog', delay: 0.3 },
  { from: 'products', to: 'shop', delay: 0.4 },
  { from: 'products', to: 'pricing', delay: 0.45 },
  { from: 'blog', to: 'post1', delay: 0.5 },
  { from: 'blog', to: 'post2', delay: 0.55 },
  { from: 'pricing', to: 'contact', delay: 0.6 },
];

function getHealthColor(health: number): string {
  if (health >= 90) return '#059669';
  if (health >= 70) return '#d97706';
  return '#dc2626';
}

function getHealthBgColor(health: number): string {
  if (health >= 90) return '#ecfdf5';
  if (health >= 70) return '#fffbeb';
  return '#fef2f2';
}

export function HeroGraph() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getNode = (id: string) => nodes.find((n) => n.id === id)!;

  return (
    <div className="relative mx-auto w-full max-w-lg" aria-hidden="true">
      <svg
        viewBox="0 0 100 90"
        className="h-auto w-full"
        role="img"
        aria-label="Interactive website structure graph"
      >
        {/* Edges */}
        {edges.map((edge) => {
          const from = getNode(edge.from);
          const to = getNode(edge.to);
          return (
            <motion.line
              key={`${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y + 3}
              x2={to.x}
              y2={to.y}
              stroke="#e5e5e5"
              strokeWidth="0.4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: edge.delay + 0.3, duration: 0.5, ease: 'easeOut' }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const isHovered = hoveredNode === node.id;
          const color = getHealthColor(node.health);
          const bgColor = getHealthBgColor(node.health);

          return (
            <motion.g
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: node.delay + 0.2,
                duration: 0.4,
                type: 'spring',
                stiffness: 200,
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Node background */}
              <rect
                x={node.x - 8}
                y={node.y - 2}
                width="16"
                height="7"
                rx="1.5"
                fill={isHovered ? bgColor : 'white'}
                stroke={isHovered ? color : '#e5e5e5'}
                strokeWidth={isHovered ? '0.5' : '0.3'}
              />

              {/* Health indicator dot */}
              <circle
                cx={node.x - 5.5}
                cy={node.y + 1.5}
                r="0.8"
                fill={color}
              >
                {pulse && node.health < 70 && (
                  <animate
                    attributeName="opacity"
                    values="1;0.3;1"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>

              {/* Label */}
              <text
                x={node.x}
                y={node.y + 2.2}
                textAnchor="middle"
                fontSize="2"
                fontFamily="var(--font-sans)"
                fontWeight="500"
                fill={isHovered ? color : '#525252'}
              >
                {node.label}
              </text>

              {/* Health score (on hover) */}
              {isHovered && (
                <text
                  x={node.x + 5}
                  y={node.y + 2.2}
                  textAnchor="start"
                  fontSize="1.6"
                  fontFamily="var(--font-mono)"
                  fontWeight="600"
                  fill={color}
                >
                  {node.health}
                </text>
              )}
            </motion.g>
          );
        })}
      </svg>

      {/* Decorative glow */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-neutral-50/80 to-transparent blur-3xl" />
    </div>
  );
}
