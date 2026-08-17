'use client';

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  Maximize2, 
  Minimize2, 
  Pin, 
  Flame, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Activity,
  Crosshair
} from 'lucide-react';
import { NodeData } from '@/lib/ontology';
import { getNodeHealth, getNodeResourcePressure } from '@/lib/health';

interface MiniMapProps {
  nodes: Record<string, NodeData>;
  activeNodeId: string;
  onSelectNode: (id: string) => void;
  zoomLevel: number;
  onZoomChange?: (delta: number) => void;
  onResetZoom?: () => void;
  projection?: string;
  className?: string;
}

interface MapNodePoint {
  id: string;
  node: NodeData;
  x: number; // 0 to 180 (SVG space)
  y: number; // 0 to 120 (SVG space)
  isHighPressure: boolean;
  resourceLoad: number | null;
  isPinned: boolean;
  isActive: boolean;
  healthColor: string;
}

export function MiniMap({
  nodes,
  activeNodeId,
  onSelectNode,
  zoomLevel,
  onZoomChange,
  onResetZoom,
  projection = 'digital',
  className = '',
}: MiniMapProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredMapNode, setHoveredMapNode] = useState<MapNodePoint | null>(null);
  const mapSvgRef = useRef<SVGSVGElement>(null);

  const MAP_WIDTH = 190;
  const MAP_HEIGHT = 125;

  // Calculate layout coordinates for all nodes in the mini-map SVG coordinate space
  const { nodePoints, links, highPressureCount, pinnedCount } = useMemo(() => {
    const nodeArray = Object.values(nodes);
    const pointMap: Record<string, MapNodePoint> = {};
    const linkList: { from: MapNodePoint; to: MapNodePoint; isHighPressure: boolean }[] = [];

    let highPressureTotal = 0;
    let pinnedTotal = 0;

    // Center coordinates
    const centerX = MAP_WIDTH / 2;
    const centerY = MAP_HEIGHT / 2 + 2;

    // Identify root or key anchors
    const rootNodes = nodeArray.filter(n => !n.parentId || n.id === 'earth');
    const nonRootNodes = nodeArray.filter(n => n.parentId && n.id !== 'earth');

    // Place root nodes near center
    if (rootNodes.length > 0) {
      rootNodes.forEach((node, i) => {
        const angle = (i / Math.max(rootNodes.length, 1)) * Math.PI * 2;
        const radius = rootNodes.length === 1 ? 0 : 14;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        const pressure = getNodeResourcePressure(node);
        const isHigh = pressure.status === 'high';
        const isPin = !!node.pinned;
        if (isHigh) highPressureTotal++;
        if (isPin) pinnedTotal++;

        pointMap[node.id] = {
          id: node.id,
          node,
          x,
          y,
          isHighPressure: isHigh,
          resourceLoad: pressure.load,
          isPinned: isPin,
          isActive: node.id === activeNodeId,
          healthColor: getNodeHealth(node).color,
        };
      });
    }

    // Place hierarchical/satellite child nodes in orbital concentric tiers
    // Group children by parentId
    const childrenByParent: Record<string, NodeData[]> = {};
    nonRootNodes.forEach((node) => {
      const pId = node.parentId || 'earth';
      if (!childrenByParent[pId]) childrenByParent[pId] = [];
      childrenByParent[pId].push(node);
    });

    // Compute orbital rings based on tree depth or grouping
    const totalSatellites = nonRootNodes.length;
    nonRootNodes.forEach((node, idx) => {
      // Find parent point or default center
      const parentPt = pointMap[node.parentId || ''] || { x: centerX, y: centerY };

      // Compute angle around parent or global circle
      const angle = (idx / Math.max(totalSatellites, 1)) * Math.PI * 2 - Math.PI / 2;
      
      // Radius tier based on type/depth
      let radius = 42;
      if (node.type === 'CLUSTER' || node.type === 'FACILITY') radius = 34;
      if (node.type === 'SYSTEM' || node.type === 'DEVICE') radius = 48;
      if (node.type === 'AGENT' || node.type === 'SERVICE') radius = 56;

      // Add gentle jitter based on node id hash for stable visual separation
      const hash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const angleJitter = ((hash % 20) - 10) * (Math.PI / 180);
      const radiusJitter = (hash % 12) - 6;

      const finalRadius = Math.min(MAP_HEIGHT / 2 - 8, Math.max(20, radius + radiusJitter));
      const finalAngle = angle + angleJitter;

      // Position relative to center or parent with bounds clamping
      const x = Math.min(MAP_WIDTH - 12, Math.max(12, centerX + Math.cos(finalAngle) * finalRadius * 1.35));
      const y = Math.min(MAP_HEIGHT - 12, Math.max(12, centerY + Math.sin(finalAngle) * finalRadius * 0.95));

      const pressure = getNodeResourcePressure(node);
      const isHigh = pressure.status === 'high';
      const isPin = !!node.pinned;
      if (isHigh) highPressureTotal++;
      if (isPin) pinnedTotal++;

      pointMap[node.id] = {
        id: node.id,
        node,
        x,
        y,
        isHighPressure: isHigh,
        resourceLoad: pressure.load,
        isPinned: isPin,
        isActive: node.id === activeNodeId,
        healthColor: getNodeHealth(node).color,
      };
    });

    // Build link lines between parent and child points
    nodeArray.forEach((node) => {
      if (node.parentId && pointMap[node.parentId] && pointMap[node.id]) {
        const from = pointMap[node.parentId];
        const to = pointMap[node.id];
        linkList.push({
          from,
          to,
          isHighPressure: from.isHighPressure || to.isHighPressure,
        });
      }
    });

    return {
      nodePoints: Object.values(pointMap),
      links: linkList,
      highPressureCount: highPressureTotal,
      pinnedCount: pinnedTotal,
    };
  }, [nodes, activeNodeId]);

  // Find active node's coordinates in mini-map space to anchor the viewport tracking rectangle
  const activePoint = useMemo(() => {
    return nodePoints.find(p => p.id === activeNodeId) || { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, id: activeNodeId };
  }, [nodePoints, activeNodeId]);

  // Compute viewport rectangle dimensions based on current zoom level
  const viewportRect = useMemo(() => {
    // Standard unzoomed box size in SVG units
    const baseW = 100;
    const baseH = 68;

    // As zoomLevel increases (1.0 -> 1.8), viewport rectangle shrinks (zoomed in focus)
    // As zoomLevel decreases (1.0 -> 0.5), viewport rectangle expands (broad overview)
    const currentW = Math.min(MAP_WIDTH - 6, Math.max(38, baseW / (zoomLevel || 1)));
    const currentH = Math.min(MAP_HEIGHT - 6, Math.max(26, baseH / (zoomLevel || 1)));

    // Center viewport rectangle over the active node with clamp inside SVG bounds
    const x = Math.min(MAP_WIDTH - currentW - 2, Math.max(2, activePoint.x - currentW / 2));
    const y = Math.min(MAP_HEIGHT - currentH - 2, Math.max(2, activePoint.y - currentH / 2));

    return { x, y, width: currentW, height: currentH };
  }, [zoomLevel, activePoint]);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!mapSvgRef.current) return;
    const rect = mapSvgRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * MAP_WIDTH;
    const clickY = ((e.clientY - rect.top) / rect.height) * MAP_HEIGHT;

    // Find closest node to click
    let closestIndex = -1;
    let minDist = 24; // click tolerance in SVG units

    for (let i = 0; i < nodePoints.length; i++) {
      const pt = nodePoints[i];
      const dist = Math.hypot(pt.x - clickX, pt.y - clickY);
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }

    const closestNode = closestIndex >= 0 ? nodePoints[closestIndex] : null;
    if (closestNode) {
      onSelectNode(closestNode.id);
    }
  };

  return (
    <aside 
      aria-label="Network Mini-Map"
      className={`fixed z-30 font-mono transition-all select-none ${className}`}
    >
      <div className="bg-[#0b0e17]/95 border border-blue-500/40 hover:border-blue-400/70 rounded-none overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.85),0_0_15px_rgba(59,130,246,0.2)] backdrop-blur-md transition-all w-[218px]">
        {/* Mini-Map Header */}
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#121624] border-b border-blue-900/40 text-[10px] text-slate-300">
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-white truncate">
            <Compass size={12} className="text-blue-400 shrink-0" />
            <span className="truncate">NETWORK MINI-MAP</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* High Pressure Alert badge in header if high-pressure nodes exist */}
            {highPressureCount > 0 && (
              <span 
                title={`${highPressureCount} High Pressure Node(s) detected`}
                className="flex items-center gap-0.5 px-1 py-0.2 bg-red-950/90 border border-red-700/90 text-red-400 text-[8.5px] rounded font-bold animate-pulse"
              >
                <Flame size={9} />
                {highPressureCount}
              </span>
            )}

            {/* Pinned counter badge */}
            {pinnedCount > 0 && (
              <span 
                title={`${pinnedCount} Pinned Node(s)`}
                className="flex items-center gap-0.5 px-1 py-0.2 bg-amber-950/80 border border-amber-700/80 text-amber-300 text-[8.5px] rounded"
              >
                <Pin size={8} />
                {pinnedCount}
              </span>
            )}

            {/* Collapse/Expand Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand Mini-Map" : "Minimize Mini-Map"}
              className="p-0.5 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              {isCollapsed ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
            </button>
          </div>
        </div>

        {/* Mini-Map Content */}
        {!isCollapsed && (
          <div className="p-2 flex flex-col gap-1.5">
            {/* SVG Visual Canvas with Node Topology and Dynamic Viewport Box */}
            <div className="relative w-full aspect-[190/125] bg-[#070910] border border-[#1b2234] rounded-none overflow-hidden flex items-center justify-center">
              {/* Radar Grid overlay background */}
              <div 
                className="absolute inset-0 opacity-15 pointer-events-none" 
                style={{ 
                  backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', 
                  backgroundSize: '12px 12px' 
                }} 
              />

              {/* Crosshair Center Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
                <div className="w-full h-px bg-blue-500/50" />
                <div className="h-full w-px bg-blue-500/50 absolute" />
              </div>

              <svg
                ref={mapSvgRef}
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                className="w-full h-full cursor-crosshair relative z-10"
                onClick={handleSvgClick}
              >
                {/* 1. Topology Connection Links */}
                <g className="links opacity-50">
                  {links.map((link, i) => (
                    <line
                      key={`link-${i}`}
                      x1={link.from.x}
                      y1={link.from.y}
                      x2={link.to.x}
                      y2={link.to.y}
                      stroke={link.isHighPressure ? '#ef4444' : '#3b82f6'}
                      strokeWidth={link.isHighPressure ? '1.2' : '0.8'}
                      strokeDasharray={link.isHighPressure ? '2,2' : undefined}
                      className={link.isHighPressure ? 'animate-pulse' : ''}
                    />
                  ))}
                </g>

                {/* 2. Viewport Tracking Rectangle (Dynamic camera box synced with zoom level) */}
                <g className="viewport-box pointer-events-none">
                  {/* Subtle translucent fill inside camera boundary */}
                  <rect
                    x={viewportRect.x}
                    y={viewportRect.y}
                    width={viewportRect.width}
                    height={viewportRect.height}
                    fill="rgba(59, 130, 246, 0.08)"
                    stroke="rgba(59, 130, 246, 0.9)"
                    strokeWidth="1"
                    strokeDasharray="4,2"
                    rx="3"
                  />
                  {/* Corner Accent Ticks */}
                  <path
                    d={`M ${viewportRect.x} ${viewportRect.y + 4} L ${viewportRect.x} ${viewportRect.y} L ${viewportRect.x + 4} ${viewportRect.y}`}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <path
                    d={`M ${viewportRect.x + viewportRect.width - 4} ${viewportRect.y} L ${viewportRect.x + viewportRect.width} ${viewportRect.y} L ${viewportRect.x + viewportRect.width} ${viewportRect.y + 4}`}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <path
                    d={`M ${viewportRect.x} ${viewportRect.y + viewportRect.height - 4} L ${viewportRect.x} ${viewportRect.y + viewportRect.height} L ${viewportRect.x + 4} ${viewportRect.y + viewportRect.height}`}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <path
                    d={`M ${viewportRect.x + viewportRect.width - 4} ${viewportRect.y + viewportRect.height} L ${viewportRect.x + viewportRect.width} ${viewportRect.y + viewportRect.height} L ${viewportRect.x + viewportRect.width} ${viewportRect.y + viewportRect.height - 4}`}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  {/* Viewport Reticle Center indicator */}
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="1.5"
                    fill="#38bdf8"
                    className="animate-ping"
                  />
                </g>

                {/* 3. Node Points (Color-coded by health, load, pin, and active status) */}
                <g className="nodes">
                  {nodePoints.map((pt) => {
                    const isHovered = hoveredMapNode?.id === pt.id;

                    return (
                      <g
                        key={pt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNode(pt.id);
                        }}
                        onMouseEnter={() => setHoveredMapNode(pt)}
                        onMouseLeave={() => setHoveredMapNode(null)}
                        className="cursor-pointer"
                      >
                        {/* High Pressure Red Pulsing Ring */}
                        {pt.isHighPressure && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={pt.isActive ? 9 : 7}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="1"
                            strokeOpacity="0.8"
                            className="animate-ping"
                            style={{ transformOrigin: `${pt.x}px ${pt.y}px` }}
                          />
                        )}

                        {/* Active Node Outer Highlight Ring */}
                        {pt.isActive && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={pt.isHighPressure ? 6.5 : 5.5}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="1.2"
                            strokeDasharray="2,2"
                          />
                        )}

                        {/* Primary Node Core Dot */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={pt.isActive ? 4 : isHovered ? 3.5 : 2.5}
                          fill={pt.isHighPressure ? '#ef4444' : pt.isActive ? '#ffffff' : pt.healthColor}
                          stroke={pt.isHighPressure ? '#991b1b' : pt.isActive ? '#3b82f6' : '#0e1320'}
                          strokeWidth={1}
                        />

                        {/* Pinned Node Small Pin Indicator Dot */}
                        {pt.isPinned && (
                          <circle
                            cx={pt.x + 3}
                            cy={pt.y - 3}
                            r="1.2"
                            fill="#f59e0b"
                            stroke="#78350f"
                            strokeWidth="0.5"
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Hover Tooltip Overlay within mini-map */}
              <AnimatePresence>
                {hoveredMapNode && (
                  <motion.div
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-1 left-1 right-1 bg-[#0a0d14]/95 border border-blue-500/80 px-2 py-1 rounded text-[8.5px] text-white z-20 pointer-events-none flex items-center justify-between shadow-lg"
                  >
                    <div className="flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hoveredMapNode.healthColor }} />
                      <span className="font-bold truncate">{hoveredMapNode.node.label}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono shrink-0">
                      {hoveredMapNode.isPinned && (
                        <span className="text-amber-400 flex items-center gap-0.5">
                          <Pin size={8} /> PINNED
                        </span>
                      )}
                      <span className={hoveredMapNode.isHighPressure ? 'text-red-400 font-bold' : 'text-slate-400'}>
                        {hoveredMapNode.resourceLoad === null ? '—' : hoveredMapNode.resourceLoad + '%'}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mini-Map Footer: Zoom Tracking HUD & Fast Actions */}
            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5 border-t border-[#191f30]">
              <div className="flex items-center gap-1 font-mono">
                <span className="text-slate-500">VIEWPORT:</span>
                <span className="text-blue-300 font-bold">{Math.round(zoomLevel * 100)}%</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300">{nodePoints.length} NODES</span>
              </div>

              {/* Quick Zoom Buttons */}
              <div className="flex items-center gap-1">
                {onZoomChange && (
                  <>
                    <button
                      onClick={() => onZoomChange(-0.15)}
                      title="Zoom Out"
                      className="p-0.5 hover:bg-white/10 hover:text-white rounded transition-colors cursor-pointer"
                    >
                      <ZoomOut size={10} />
                    </button>
                    <button
                      onClick={() => onZoomChange(0.15)}
                      title="Zoom In"
                      className="p-0.5 hover:bg-white/10 hover:text-white rounded transition-colors cursor-pointer"
                    >
                      <ZoomIn size={10} />
                    </button>
                  </>
                )}
                {onResetZoom && (
                  <button
                    onClick={onResetZoom}
                    title="Reset Zoom to 100%"
                    className="p-0.5 hover:bg-white/10 hover:text-white rounded transition-colors cursor-pointer"
                  >
                    <RotateCcw size={9} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
