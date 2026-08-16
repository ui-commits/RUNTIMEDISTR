'use client';

import React, { useState, useRef } from 'react';
import { NodeData } from '@/lib/ontology';
import { getNodeHealth, NodeHealthInfo } from '@/lib/health';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  Target, 
  Radio, 
  Building2,
  ExternalLink,
  Zap,
  Activity,
  Layers,
  Cpu,
  Server,
  ArrowRight,
  Sparkles,
  MousePointerClick,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon
} from 'lucide-react';
import { SvgMapHeartbeatPin, LiveEkgWaveform } from '@/components/c2/NodeHeartbeatRing';

interface GeoMapOverlayProps {
  nodes: Record<string, NodeData>;
  activeNode: NodeData;
  onSelectNode: (id: string) => void;
}

interface HoveredNodeInfo {
  node: NodeData;
  health: NodeHealthInfo;
  x: number;
  y: number;
}

export function GeoMapOverlay({ nodes, activeNode, onSelectNode }: GeoMapOverlayProps) {
  const [mapStyle, setMapStyle] = useState<'blueprint' | 'satellite' | 'hud'>('blueprint');
  const [manualZoomOffset, setManualZoomOffset] = useState<number>(0);
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState<HoveredNodeInfo | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute camera focus target based on active node
  const geo = activeNode.geo || {
    lat: 45.5303,
    lng: -122.6601,
    zoom: 17.5,
    name: "The Louisa Flowers",
    address: "515 NE Holladay St, Portland, OR 97232",
    coordinatesText: "45°31'49.1\"N 122°39'36.4\"W",
  };

  const effectiveZoom = Math.max(1, Math.min(22, (geo.zoom || 5) + manualZoomOffset));

  const handleNodeHover = (node: NodeData | null, e?: React.MouseEvent) => {
    if (!node || !e) {
      setHoveredNodeInfo(null);
      return;
    }

    const health = getNodeHealth(node);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;
      setHoveredNodeInfo({
        node,
        health,
        x: relativeX,
        y: relativeY,
      });
    } else {
      setHoveredNodeInfo({
        node,
        health,
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#050508] overflow-hidden flex flex-col items-center justify-center font-mono select-none"
    >
      {/* Top Map HUD Telemetry */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-30 pointer-events-none">
        <div className="bg-[#0c0c10]/90 backdrop-blur-md border border-border-c2 px-3 py-1.5 rounded-lg flex items-center gap-3 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-1.5 text-cobalt-c2 text-xs font-bold">
            <Radio size={14} className="animate-pulse" />
            <span>GEO_INTEL // PRELOADED ENGINE</span>
          </div>
          <div className="h-3 w-px bg-[#333]" />
          <div className="text-[10px] text-[#aaa]">
            LAT/LNG: <span className="text-white font-semibold">{geo.coordinatesText || `${geo.lat.toFixed(4)}°, ${geo.lng.toFixed(4)}°`}</span>
          </div>
          <div className="h-3 w-px bg-[#333] hidden sm:block" />
          <div className="text-[10px] text-[#aaa] hidden sm:block">
            ALT: <span className="text-emerald-400 font-semibold">{effectiveZoom > 15 ? '72m MSL' : effectiveZoom > 8 ? '2,400m MSL' : '420km ORBIT'}</span>
          </div>
        </div>

        {/* Style Switcher & Controls */}
        <div className="flex items-center gap-1.5 bg-[#0c0c10]/90 backdrop-blur-md border border-border-c2 p-1 rounded-lg shadow-xl pointer-events-auto">
          <button
            onClick={() => setMapStyle('blueprint')}
            className={`px-2 py-1 text-[9px] rounded uppercase font-semibold transition-colors cursor-pointer ${
              mapStyle === 'blueprint' ? 'bg-cobalt-c2 text-white' : 'text-[#777] hover:text-[#bbb]'
            }`}
          >
            Tactical Vector
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-2 py-1 text-[9px] rounded uppercase font-semibold transition-colors cursor-pointer ${
              mapStyle === 'satellite' ? 'bg-cobalt-c2 text-white' : 'text-[#777] hover:text-[#bbb]'
            }`}
          >
            Satellite Recon
          </button>
          <button
            onClick={() => setMapStyle('hud')}
            className={`px-2 py-1 text-[9px] rounded uppercase font-semibold transition-colors cursor-pointer ${
              mapStyle === 'hud' ? 'bg-cobalt-c2 text-white' : 'text-[#777] hover:text-[#bbb]'
            }`}
          >
            CAD Schematic
          </button>
        </div>
      </div>

      {/* Main Map Viewport with Animated Layout Transitions */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeNode.id}-${mapStyle}`}
            initial={{ opacity: 0, scale: 0.88, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.12, filter: 'blur(6px)' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full relative flex items-center justify-center"
          >
            {/* Render appropriate map depth according to current node zoom */}
            {activeNode.id === 'earth' ? (
              <GlobalEarthView 
                mapStyle={mapStyle} 
                nodes={nodes} 
                onSelectNode={onSelectNode}
                onHoverNode={handleNodeHover}
              />
            ) : activeNode.id === 'na' || activeNode.id === 'eu' || activeNode.id === 'as' ? (
              <ContinentalRegionView 
                node={activeNode} 
                mapStyle={mapStyle} 
                nodes={nodes} 
                onSelectNode={onSelectNode}
                onHoverNode={handleNodeHover}
              />
            ) : activeNode.id === 'pnw' || activeNode.id === 'east' ? (
              <RegionalPacificNWView 
                node={activeNode} 
                mapStyle={mapStyle} 
                nodes={nodes} 
                onSelectNode={onSelectNode}
                onHoverNode={handleNodeHover}
              />
            ) : activeNode.id === 'pdx' ? (
              <PortlandMetroView 
                node={activeNode} 
                mapStyle={mapStyle} 
                nodes={nodes} 
                onSelectNode={onSelectNode}
                onHoverNode={handleNodeHover}
              />
            ) : (
              // Louisa Flowers (apt) & Workstation (ws) & Sub-modules
              <LouisaFlowersFacilityView 
                node={activeNode} 
                mapStyle={mapStyle} 
                nodes={nodes} 
                onSelectNode={onSelectNode}
                onHoverNode={handleNodeHover}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Dynamic Hover-Based Node Tooltip Overlay */}
        <AnimatePresence>
          {hoveredNodeInfo && (
            <GeoNodeTooltip
              info={hoveredNodeInfo}
              onSelectNode={onSelectNode}
            />
          )}
        </AnimatePresence>

        {/* Crosshair Center Reticle */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-12 h-12 border border-cobalt-c2/30 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-1.5 h-1.5 bg-cobalt-c2 rounded-full shadow-[0_0_8px_#6366f1]" />
          </div>
          <div className="absolute w-24 h-px bg-cobalt-c2/20" />
          <div className="absolute h-24 w-px bg-cobalt-c2/20" />
        </div>
      </div>

      {/* Bottom Floating Location Badge */}
      <div className="absolute bottom-3 left-3 bg-[#0a0a0e]/95 backdrop-blur-md border border-border-c2 p-3 rounded-lg z-30 max-w-sm shadow-2xl space-y-1">
        <div className="flex items-center gap-2">
          <Building2 size={13} className="text-cobalt-c2" />
          <span className="text-xs font-bold text-white uppercase">{geo.name || activeNode.label}</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/80 rounded font-semibold">
            GEO LOCKED
          </span>
        </div>
        {geo.address && (
          <div className="text-[11px] text-zinc-300 font-sans font-medium flex items-center gap-1.5">
            <MapPin size={11} className="text-rose-400 shrink-0" />
            <span>{geo.address}</span>
          </div>
        )}
        {geo.district && (
          <div className="text-[10px] text-[#777]">
            SECTOR: <span className="text-[#bbb]">{geo.district}</span>
          </div>
        )}
      </div>

      {/* Bottom Right Map Zoom & Tool Controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-30">
        <div className="bg-[#0c0c10]/90 backdrop-blur-md border border-border-c2 rounded-lg p-1 flex flex-col gap-1 shadow-xl">
          <button
            onClick={() => setManualZoomOffset(prev => Math.min(prev + 1, 4))}
            className="p-1.5 hover:bg-zinc-800 text-[#888] hover:text-white rounded transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <div className="w-full h-px bg-[#222]" />
          <button
            onClick={() => setManualZoomOffset(prev => Math.max(prev - 1, -4))}
            className="p-1.5 hover:bg-zinc-800 text-[#888] hover:text-white rounded transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <div className="w-full h-px bg-[#222]" />
          <button
            onClick={() => setManualZoomOffset(0)}
            className="p-1.5 hover:bg-zinc-800 text-[#888] hover:text-white rounded transition-colors cursor-pointer"
            title="Reset Zoom"
          >
            <Target size={14} />
          </button>
        </div>
        <div className="text-[9px] text-[#555] bg-[#0c0c10] border border-[#222] px-2 py-0.5 rounded text-center font-bold">
          ZOOM {effectiveZoom.toFixed(1)}x
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// DYNAMIC HOVER TOOLTIP COMPONENT
// ----------------------------------------------------
function GeoNodeTooltip({
  info,
  onSelectNode,
}: {
  info: HoveredNodeInfo;
  onSelectNode: (id: string) => void;
}) {
  const { node, health, x, y } = info;

  // Smart positioning offset to avoid edge cut-offs
  const offsetX = x > 380 ? -290 : 20;
  const offsetY = y > 280 ? -170 : 20;

  // Key metric extraction
  const metricEntries = Object.entries(node.metrics || {}).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 6 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{
        left: `${x + offsetX}px`,
        top: `${y + offsetY}px`,
      }}
      className="absolute z-50 pointer-events-auto w-72 bg-[#0c1017]/95 backdrop-blur-xl border border-indigo-500/70 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.8),0_0_20px_rgba(99,102,241,0.25)] p-3 font-mono text-xs text-slate-200 select-none overflow-hidden"
    >
      {/* Decorative Top Accent Glow Bar based on health */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 transition-colors"
        style={{
          background: `linear-gradient(90deg, #6366f1, ${health.color}, #38bdf8)`
        }} 
      />

      {/* Header: Node Name, ID, Type & Health Badge */}
      <div className="flex items-start justify-between gap-2 mb-2 pt-1 border-b border-[#21262d] pb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
              {node.type}
            </span>
            <span className="text-[9px] text-slate-500 font-mono">#{node.id}</span>
          </div>
          <h4 className="text-sm font-bold text-white tracking-tight truncate max-w-[160px]">
            {node.label}
          </h4>
        </div>

        {/* Connectivity Health Ring Pill */}
        <div className={`px-2 py-0.5 rounded border text-[9px] font-bold flex items-center gap-1.5 shrink-0 ${health.badgeClass}`}>
          <span 
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: health.color }} 
          />
          <span>{health.label}</span>
        </div>
      </div>

      {/* Live SVG Heartbeat / EKG Stream */}
      <div className="mb-2 bg-[#090d16] p-2 rounded-lg border border-[#1e2538] flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-400 font-mono flex items-center gap-1">
            <Activity size={10} className="text-indigo-400" />
            LIVE SIGNAL
          </span>
          <span className="text-[9px] font-mono font-bold" style={{ color: health.color }}>
            {health.label} PULSE
          </span>
        </div>
        <LiveEkgWaveform health={health} width={120} height={18} />
      </div>

      {/* Location Metadata */}
      {node.geo && (
        <div className="space-y-1 mb-2.5 bg-[#161b22]/70 p-2 rounded-lg border border-[#30363d]/80 text-[10px]">
          {node.geo.address && (
            <div className="flex items-center gap-1.5 text-slate-300 font-sans font-medium">
              <MapPin size={11} className="text-rose-400 shrink-0" />
              <span className="truncate">{node.geo.address}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-slate-400 text-[9px]">
            <span>COORDS:</span>
            <span className="text-sky-300 font-mono">
              {node.geo.coordinatesText || `${node.geo.lat.toFixed(3)}°, ${node.geo.lng.toFixed(3)}°`}
            </span>
          </div>
          {node.geo.district && (
            <div className="flex items-center justify-between text-slate-400 text-[9px]">
              <span>DISTRICT:</span>
              <span className="text-indigo-300 truncate max-w-[120px]">{node.geo.district}</span>
            </div>
          )}
        </div>
      )}

      {/* Telemetry Metrics Quick Bar */}
      {metricEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
          {metricEntries.map(([k, v]) => (
            <div key={k} className="bg-[#111620] px-2 py-1 rounded border border-[#21262d] text-[9px]">
              <span className="text-slate-500 uppercase block truncate">{k.replace('_', ' ')}</span>
              <span className="text-white font-bold truncate block">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick-Link Shortcut Indicators Footer */}
      <div className="pt-2 border-t border-[#21262d] flex items-center justify-between">
        <div className="flex items-center gap-1 text-[9px] text-slate-400">
          <span className="bg-[#161b22] px-1 py-0.5 rounded border border-[#30363d] text-indigo-300 font-bold">
            CLICK
          </span>
          <span>Open Inspector</span>
        </div>

        <button
          onClick={() => onSelectNode(node.id)}
          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold transition-colors cursor-pointer shadow-sm"
        >
          <span>INSPECT</span>
          <ArrowRight size={11} />
        </button>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------
// 1. GLOBAL EARTH VIEW (Level 1: Planetary Overview)
// ----------------------------------------------------
function GlobalEarthView({ 
  mapStyle, 
  nodes, 
  onSelectNode,
  onHoverNode,
}: { 
  mapStyle: string; 
  nodes: Record<string, NodeData>; 
  onSelectNode: (id: string) => void;
  onHoverNode: (node: NodeData | null, e?: React.MouseEvent) => void;
}) {
  const naNode = nodes['na'];
  const euNode = nodes['eu'];
  const asNode = nodes['as'];

  const naHealth = getNodeHealth(naNode);
  const euHealth = getNodeHealth(euNode);
  const asHealth = getNodeHealth(asNode);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Planetary Atmosphere Glow */}
      <div className="absolute w-[440px] h-[440px] rounded-full bg-gradient-to-tr from-cobalt-c2/20 via-sky-500/10 to-transparent blur-2xl pointer-events-none" />
      
      {/* Interactive 3D/2.5D Earth Globe SVG */}
      <svg className="w-[420px] h-[420px] max-w-[85vw] max-h-[85vh]" viewBox="0 0 400 400">
        <defs>
          <radialGradient id="globeGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#121829" />
            <stop offset="70%" stopColor="#080b14" />
            <stop offset="100%" stopColor="#030408" />
          </radialGradient>
          <radialGradient id="globeAtmosphere" cx="50%" cy="50%" r="50%">
            <stop offset="85%" stopColor="transparent" />
            <stop offset="98%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
          </radialGradient>
        </defs>

        {/* Globe Base Sphere */}
        <circle cx="200" cy="200" r="170" fill="url(#globeGrad)" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.4" />
        <circle cx="200" cy="200" r="170" fill="url(#globeAtmosphere)" />

        {/* Latitude / Longitude Graticule Grid */}
        <g stroke="#38bdf8" strokeOpacity="0.15" strokeWidth="0.8" fill="none">
          <ellipse cx="200" cy="200" rx="170" ry="25" />
          <ellipse cx="200" cy="140" rx="155" ry="22" />
          <ellipse cx="200" cy="260" rx="155" ry="22" />
          <ellipse cx="200" cy="80" rx="120" ry="16" />
          <ellipse cx="200" cy="320" rx="120" ry="16" />
          <ellipse cx="200" cy="200" rx="40" ry="170" />
          <ellipse cx="200" cy="200" rx="90" ry="170" />
          <ellipse cx="200" cy="200" rx="140" ry="170" />
          <line x1="200" y1="30" x2="200" y2="370" />
        </g>

        {/* Pre-rendered Continents Vectors */}
        <g fill={mapStyle === 'satellite' ? '#1e293b' : '#111827'} stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.6">
          <path d="M 100 90 Q 120 70, 150 75 Q 170 85, 175 110 Q 165 130, 140 145 Q 120 160, 110 180 Q 95 160, 90 130 Z" />
          <path d="M 120 180 Q 135 200, 145 230 Q 155 270, 140 300 Q 130 270, 125 220 Z" />
          <path d="M 210 80 Q 250 70, 300 85 Q 330 110, 310 140 Q 270 145, 240 130 Q 220 110, 210 80 Z" />
          <path d="M 220 145 Q 260 150, 270 180 Q 265 230, 245 270 Q 230 240, 225 180 Z" />
        </g>

        {/* Orbital Satellite Tracking Arc */}
        <motion.circle
          cx="200"
          cy="200"
          r="190"
          fill="none"
          stroke="#6366f1"
          strokeWidth="1"
          strokeDasharray="6 8"
          strokeOpacity="0.4"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          style={{ originX: '200px', originY: '200px' }}
        />

        {/* Primary Regional Command Beacons with Framer Motion Entrance Animation & Subtle Pulsing Health Shadows */}
        
        {/* 1. North America Hub */}
        {naNode && (
          <motion.g 
            className="cursor-pointer group"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              filter: [
                `drop-shadow(0 0 2px ${naHealth.glowColor})`,
                `drop-shadow(0 0 8px ${naHealth.glowColor})`,
                `drop-shadow(0 0 2px ${naHealth.glowColor})`
              ]
            }}
            transition={{ 
              opacity: { duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={() => onSelectNode('na')}
            onMouseEnter={(e) => onHoverNode(naNode, e)}
            onMouseMove={(e) => onHoverNode(naNode, e)}
            onMouseLeave={() => onHoverNode(null)}
          >
            {/* Subtle Connectivity Health Pulsing Ring Indicator */}
            <circle cx="130" cy="115" r="22" fill="none" stroke={naHealth.color} strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="3 3" className="animate-spin" style={{ animationDuration: '8s' }} />
            <circle cx="130" cy="115" r="16" fill={naHealth.color} fillOpacity="0.2" className="animate-ping" />
            
            {/* Core Beacon */}
            <circle cx="130" cy="115" r="9" fill={naHealth.color} fillOpacity="0.85" stroke="#ffffff" strokeWidth="1.5" className="group-hover:scale-125 transition-transform" />
            <circle cx="130" cy="115" r="4" fill="#ffffff" />
            
            <rect x="142" y="102" width="165" height="30" rx="4" fill="#090d16" stroke={naHealth.color} strokeWidth="1.2" opacity="0.95" className="group-hover:stroke-white transition-colors" />
            <text x="148" y="116" fill="#ffffff" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
              NORTH AMERICA COMMAND
            </text>
            <text x="148" y="127" fill={naHealth.color} fontSize="7.5" fontFamily="monospace">
              {`● ${naHealth.label} // LAT 43.5°N`}
            </text>
          </motion.g>
        )}

        {/* 2. EMEA Hub */}
        {euNode && (
          <motion.g 
            className="cursor-pointer group opacity-90 hover:opacity-100"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              filter: [
                `drop-shadow(0 0 2px ${euHealth.glowColor})`,
                `drop-shadow(0 0 8px ${euHealth.glowColor})`,
                `drop-shadow(0 0 2px ${euHealth.glowColor})`
              ]
            }}
            transition={{ 
              opacity: { duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 3.5, delay: 0.5, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={() => onSelectNode('eu')}
            onMouseEnter={(e) => onHoverNode(euNode, e)}
            onMouseMove={(e) => onHoverNode(euNode, e)}
            onMouseLeave={() => onHoverNode(null)}
          >
            {/* Connectivity Health Ring */}
            <circle cx="235" cy="110" r="16" fill="none" stroke={euHealth.color} strokeWidth="1.5" strokeOpacity="0.7" strokeDasharray="3 3" />
            <circle cx="235" cy="110" r="12" fill={euHealth.color} fillOpacity="0.18" className="animate-pulse" />
            
            <circle cx="235" cy="110" r="7.5" fill={euHealth.color} stroke="#ffffff" strokeWidth="1.2" className="group-hover:scale-125 transition-transform" />
            <circle cx="235" cy="110" r="3" fill="#ffffff" />
            
            <rect x="245" y="98" width="115" height="26" rx="4" fill="#090d16" stroke={euHealth.color} strokeWidth="1.2" opacity="0.9" className="group-hover:stroke-white transition-colors" />
            <text x="251" y="111" fill="#ffffff" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
              EMEA COMMAND
            </text>
            <text x="251" y="121" fill={euHealth.color} fontSize="7" fontFamily="monospace">
              {`● ${euHealth.label} // 140ms`}
            </text>
          </motion.g>
        )}

        {/* 3. APAC Hub */}
        {asNode && (
          <motion.g 
            className="cursor-pointer group opacity-90 hover:opacity-100"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              filter: [
                `drop-shadow(0 0 2px ${asHealth.glowColor})`,
                `drop-shadow(0 0 8px ${asHealth.glowColor})`,
                `drop-shadow(0 0 2px ${asHealth.glowColor})`
              ]
            }}
            transition={{ 
              opacity: { duration: 0.4, delay: 0.18, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.4, delay: 0.18, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 3.5, delay: 1.0, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={() => onSelectNode('as')}
            onMouseEnter={(e) => onHoverNode(asNode, e)}
            onMouseMove={(e) => onHoverNode(asNode, e)}
            onMouseLeave={() => onHoverNode(null)}
          >
            {/* Connectivity Health Ring */}
            <circle cx="295" cy="125" r="16" fill="none" stroke={asHealth.color} strokeWidth="1.5" strokeOpacity="0.7" strokeDasharray="3 3" />
            <circle cx="295" cy="125" r="12" fill={asHealth.color} fillOpacity="0.18" className="animate-pulse" />
            
            <circle cx="295" cy="125" r="7.5" fill={asHealth.color} stroke="#ffffff" strokeWidth="1.2" className="group-hover:scale-125 transition-transform" />
            <circle cx="295" cy="125" r="3" fill="#ffffff" />
            
            <rect x="305" y="113" width="115" height="26" rx="4" fill="#090d16" stroke={asHealth.color} strokeWidth="1.2" opacity="0.9" className="group-hover:stroke-white transition-colors" />
            <text x="311" y="126" fill="#ffffff" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
              APAC GATEWAY
            </text>
            <text x="311" y="136" fill={asHealth.color} fontSize="7" fontFamily="monospace">
              {`● ${asHealth.label} // 64ms`}
            </text>
          </motion.g>
        )}
      </svg>
    </div>
  );
}

// ----------------------------------------------------
// 2. CONTINENTAL REGION VIEW (Level 2: North America)
// ----------------------------------------------------
function ContinentalRegionView({ 
  node, 
  mapStyle, 
  nodes, 
  onSelectNode,
  onHoverNode,
}: { 
  node: NodeData; 
  mapStyle: string; 
  nodes: Record<string, NodeData>; 
  onSelectNode: (id: string) => void;
  onHoverNode: (node: NodeData | null, e?: React.MouseEvent) => void;
}) {
  const pnwNode = nodes['pnw'];
  const eastNode = nodes['east'];

  const pnwHealth = getNodeHealth(pnwNode);
  const eastHealth = getNodeHealth(eastNode);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-6">
      <svg className="w-full h-full max-h-[460px]" viewBox="0 0 600 400">
        <rect width="600" height="400" fill={mapStyle === 'satellite' ? '#0b1120' : '#07090e'} />
        
        {/* Sector Grid Lines */}
        <g stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3">
          <line x1="50" y1="100" x2="550" y2="100" />
          <line x1="50" y1="200" x2="550" y2="200" />
          <line x1="50" y1="300" x2="550" y2="300" />
          <line x1="150" y1="50" x2="150" y2="350" />
          <line x1="300" y1="50" x2="300" y2="350" />
          <line x1="450" y1="50" x2="450" y2="350" />
        </g>

        {/* North American Landmass Outline */}
        <path
          d="M 60 70 Q 150 40, 280 45 Q 420 50, 520 90 Q 560 160, 510 240 Q 480 320, 380 340 Q 300 350, 240 310 Q 160 280, 100 220 Q 50 160, 60 70 Z"
          fill={mapStyle === 'satellite' ? '#131d33' : '#0f172a'}
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />

        {/* Optical Fiber Trunk Lines */}
        <path
          d="M 120 130 L 480 150"
          stroke="#6366f1"
          strokeWidth="2"
          strokeDasharray="6 4"
          strokeOpacity="0.7"
        />
        <text x="280" y="135" fill="#818cf8" fontSize="9" fontFamily="monospace" textAnchor="middle">
          TRANS-CONTINENTAL BACKBONE (24ms)
        </text>

        {/* Node Pin 1: Pacific Northwest Grid (Oregon / Portland Corridor) */}
        {pnwNode && (
          <motion.g 
            className="cursor-pointer group"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              filter: [
                `drop-shadow(0 0 2px ${pnwHealth.glowColor})`,
                `drop-shadow(0 0 8px ${pnwHealth.glowColor})`,
                `drop-shadow(0 0 2px ${pnwHealth.glowColor})`
              ]
            }}
            transition={{ 
              opacity: { duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={() => onSelectNode('pnw')}
            onMouseEnter={(e) => onHoverNode(pnwNode, e)}
            onMouseMove={(e) => onHoverNode(pnwNode, e)}
            onMouseLeave={() => onHoverNode(null)}
          >
            {/* Pulsing SVG Heartbeat/EKG Ring Indicator */}
            <SvgMapHeartbeatPin cx={120} cy={130} radius={24} health={pnwHealth} />
            
            <circle cx="120" cy="130" r="11" fill={pnwHealth.color} fillOpacity="0.85" stroke="#ffffff" strokeWidth="1.5" className="group-hover:scale-125 transition-transform" />
            <circle cx="120" cy="130" r="5" fill="#ffffff" />
            
            <rect x="135" y="110" width="190" height="44" rx="4" fill="#090d16" stroke={pnwHealth.color} strokeWidth="1.2" className="group-hover:stroke-white transition-colors" />
            <text x="145" y="126" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
              PACIFIC NW GRID (OR/WA)
            </text>
            <text x="145" y="140" fill={pnwHealth.color} fontSize="8" fontFamily="monospace">
              ● {pnwHealth.label} → OPEN INSPECTOR
            </text>
          </motion.g>
        )}

        {/* Node Pin 2: Eastern Seaboard Grid */}
        {eastNode && (
          <motion.g 
            className="cursor-pointer group"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              filter: [
                `drop-shadow(0 0 2px ${eastHealth.glowColor})`,
                `drop-shadow(0 0 8px ${eastHealth.glowColor})`,
                `drop-shadow(0 0 2px ${eastHealth.glowColor})`
              ]
            }}
            transition={{ 
              opacity: { duration: 0.45, delay: 0.16, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.45, delay: 0.16, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 3.5, delay: 0.6, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={() => onSelectNode('east')}
            onMouseEnter={(e) => onHoverNode(eastNode, e)}
            onMouseMove={(e) => onHoverNode(eastNode, e)}
            onMouseLeave={() => onHoverNode(null)}
          >
            {/* Pulsing SVG Heartbeat/EKG Ring Indicator */}
            <SvgMapHeartbeatPin cx={480} cy={150} radius={22} health={eastHealth} />
            
            <circle cx="480" cy="150" r="10" fill={eastHealth.color} stroke="#ffffff" strokeWidth="1.5" className="group-hover:scale-125 transition-transform" />
            <circle cx="480" cy="150" r="4" fill="#ffffff" />
            
            <rect x="355" y="165" width="170" height="40" rx="4" fill="#090d16" stroke={eastHealth.color} strokeWidth="1.2" className="group-hover:stroke-white transition-colors" />
            <text x="365" y="181" fill="#ffffff" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
              EASTERN SEABOARD
            </text>
            <text x="365" y="195" fill={eastHealth.color} fontSize="8" fontFamily="monospace">
              {`● ${eastHealth.label} // NYC METRO`}
            </text>
          </motion.g>
        )}
      </svg>
    </div>
  );
}

// ----------------------------------------------------
// 3. REGIONAL PACIFIC NW VIEW (Level 3: Oregon / WA)
// ----------------------------------------------------
function RegionalPacificNWView({ 
  node, 
  mapStyle, 
  nodes, 
  onSelectNode,
  onHoverNode,
}: { 
  node: NodeData; 
  mapStyle: string; 
  nodes: Record<string, NodeData>; 
  onSelectNode: (id: string) => void;
  onHoverNode: (node: NodeData | null, e?: React.MouseEvent) => void;
}) {
  const pdxNode = nodes['pdx'];
  const pdxHealth = getNodeHealth(pdxNode);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      <svg className="w-full h-full max-h-[460px]" viewBox="0 0 600 400">
        <rect width="600" height="400" fill="#060911" />
        
        {/* Pacific Coastline & Columbia River Network */}
        <path
          d="M 90 20 Q 80 120, 70 240 Q 60 320, 80 390 L 590 390 L 590 20 Z"
          fill={mapStyle === 'satellite' ? '#0f172a' : '#0b1324'}
          stroke="#1e293b"
          strokeWidth="1.5"
        />

        {/* Columbia River */}
        <path
          d="M 80 210 Q 180 205, 270 215 Q 360 210, 480 190 Q 560 170, 590 160"
          fill="none"
          stroke="#0284c7"
          strokeWidth="4"
          strokeOpacity="0.8"
        />
        <text x="340" y="200" fill="#38bdf8" fontSize="8" fontFamily="monospace" textAnchor="middle">
          COLUMBIA RIVER (OR / WA BORDER)
        </text>

        {/* Willamette River Flowing South through Portland */}
        <path
          d="M 270 215 Q 265 260, 260 310 Q 255 350, 250 390"
          fill="none"
          stroke="#0284c7"
          strokeWidth="3.5"
          strokeOpacity="0.8"
        />
        <text x="280" y="320" fill="#38bdf8" fontSize="8" fontFamily="monospace">
          WILLAMETTE RIVER
        </text>

        {/* Cascade Range Topography Overlay */}
        <g stroke="#334155" strokeWidth="1" fill="none" opacity="0.6">
          <path d="M 380 40 L 400 90 L 370 140 L 390 200 L 370 280 L 390 380" />
          <path d="M 410 50 L 430 110 L 400 170 L 420 250 L 400 370" />
          <text x="430" y="100" fill="#475569" fontSize="8" fontFamily="monospace">CASCADE MOUNTAIN RANGE</text>
        </g>

        {/* Portland Target Sector (Connecting to Louisa Flowers / 515 NE Holladay) */}
        {pdxNode && (
          <motion.g 
            className="cursor-pointer group"
            initial={{ opacity: 0, scale: 0.65 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              filter: [
                `drop-shadow(0 0 2px ${pdxHealth.glowColor})`,
                `drop-shadow(0 0 10px ${pdxHealth.glowColor})`,
                `drop-shadow(0 0 2px ${pdxHealth.glowColor})`
              ]
            }}
            transition={{ 
              opacity: { duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={() => onSelectNode('pdx')}
            onMouseEnter={(e) => onHoverNode(pdxNode, e)}
            onMouseMove={(e) => onHoverNode(pdxNode, e)}
            onMouseLeave={() => onHoverNode(null)}
          >
            {/* Pulsing SVG Heartbeat/EKG Ring Indicator */}
            <SvgMapHeartbeatPin cx={270} cy={225} radius={28} health={pdxHealth} />
            
            <circle cx="270" cy="225" r="13" fill={pdxHealth.color} fillOpacity="0.85" stroke="#ffffff" strokeWidth="1.5" className="group-hover:scale-125 transition-transform" />
            <circle cx="270" cy="225" r="5" fill="#ffffff" />
            
            <rect x="290" y="205" width="230" height="54" rx="5" fill="#090d16" stroke={pdxHealth.color} strokeWidth="1.4" className="group-hover:stroke-white transition-colors" />
            <text x="300" y="223" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
              PORTLAND METRO SUB-GRID
            </text>
            <text x="300" y="237" fill="#818cf8" fontSize="8.5" fontFamily="monospace">
              LAT 45.5231°N, LNG 122.6765°W
            </text>
            <text x="300" y="250" fill={pdxHealth.color} fontSize="8" fontFamily="monospace">
              ● {pdxHealth.label} → CLICK TO OPEN INSPECTOR
            </text>
          </motion.g>
        )}
      </svg>
    </div>
  );
}

// ----------------------------------------------------
// 4. PORTLAND METRO VIEW (Level 4: City Street Grid)
// ----------------------------------------------------
function PortlandMetroView({ 
  node, 
  mapStyle, 
  nodes, 
  onSelectNode,
  onHoverNode,
}: { 
  node: NodeData; 
  mapStyle: string; 
  nodes: Record<string, NodeData>; 
  onSelectNode: (id: string) => void;
  onHoverNode: (node: NodeData | null, e?: React.MouseEvent) => void;
}) {
  const aptNode = nodes['apt'];
  const aptHealth = getNodeHealth(aptNode);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      <svg className="w-full h-full max-h-[460px]" viewBox="0 0 600 400">
        <rect width="600" height="400" fill={mapStyle === 'satellite' ? '#0d131f' : '#080c14'} />

        {/* Willamette River running north-south */}
        <path
          d="M 230 0 Q 210 100, 220 180 Q 240 260, 220 340 Q 205 380, 200 400 L 260 400 Q 275 350, 280 260 Q 260 180, 275 100 Q 290 40, 290 0 Z"
          fill="#0369a1"
          fillOpacity="0.7"
          stroke="#0284c7"
          strokeWidth="1.5"
        />
        <text x="245" y="60" fill="#7dd3fc" fontSize="9" fontFamily="monospace" textAnchor="middle">
          WILLAMETTE RIVER
        </text>

        {/* Portland Bridges */}
        <line x1="190" y1="130" x2="280" y2="135" stroke="#f59e0b" strokeWidth="3" />
        <text x="140" y="132" fill="#fbbf24" fontSize="7.5" fontFamily="monospace">Steel Bridge</text>

        <line x1="195" y1="190" x2="275" y2="190" stroke="#f59e0b" strokeWidth="2.5" />
        <text x="135" y="193" fill="#fbbf24" fontSize="7.5" fontFamily="monospace">Burnside Bridge</text>

        <line x1="205" y1="240" x2="275" y2="235" stroke="#f59e0b" strokeWidth="2.5" />
        <text x="135" y="243" fill="#fbbf24" fontSize="7.5" fontFamily="monospace">Morrison Bridge</text>

        {/* I-84 Corridor */}
        <path d="M 275 160 Q 380 170, 600 175" fill="none" stroke="#64748b" strokeWidth="4" />
        <text x="460" y="165" fill="#94a3b8" fontSize="8" fontFamily="monospace">I-84 CORRIDOR</text>

        {/* I-5 corridor */}
        <path d="M 285 0 L 275 150 Q 280 220, 290 400" fill="none" stroke="#475569" strokeWidth="3.5" />
        <text x="295" y="320" fill="#94a3b8" fontSize="8" fontFamily="monospace">I-5 HIGHWAY</text>

        {/* Lloyd District Street Grid */}
        <g stroke="#334155" strokeWidth="1" strokeOpacity="0.8">
          <line x1="280" y1="100" x2="550" y2="100" />
          <line x1="280" y1="115" x2="550" y2="115" />
          <line x1="280" y1="130" x2="550" y2="130" stroke="#38bdf8" strokeWidth="1.8" />
          <line x1="280" y1="145" x2="550" y2="145" />
          <line x1="330" y1="80" x2="330" y2="220" />
          <line x1="360" y1="80" x2="360" y2="220" stroke="#6366f1" strokeWidth="1.5" />
          <line x1="410" y1="80" x2="410" y2="220" stroke="#6366f1" strokeWidth="1.5" />
          <line x1="460" y1="80" x2="460" y2="220" />
        </g>

        <text x="332" y="95" fill="#94a3b8" fontSize="7" fontFamily="monospace">MLK Jr Blvd</text>
        <text x="362" y="95" fill="#a5b4fc" fontSize="7" fontFamily="monospace">Grand Ave</text>
        <text x="412" y="95" fill="#a5b4fc" fontSize="7" fontFamily="monospace">NE 6th Ave</text>
        <text x="500" y="128" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">NE HOLLADAY ST</text>

        <rect x="300" y="135" width="55" height="35" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <text x="327" y="155" fill="#94a3b8" fontSize="6.5" fontFamily="monospace" textAnchor="middle">OCC</text>

        {/* TARGET LOCATION: THE LOUISA FLOWERS (515 NE HOLLADAY ST, 97232) */}
        {aptNode && (
          <motion.g 
            className="cursor-pointer group"
            initial={{ opacity: 0, scale: 0.65 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              filter: [
                `drop-shadow(0 0 2px ${aptHealth.glowColor})`,
                `drop-shadow(0 0 10px ${aptHealth.glowColor})`,
                `drop-shadow(0 0 2px ${aptHealth.glowColor})`
              ]
            }}
            transition={{ 
              opacity: { duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={() => onSelectNode('apt')}
            onMouseEnter={(e) => onHoverNode(aptNode, e)}
            onMouseMove={(e) => onHoverNode(aptNode, e)}
            onMouseLeave={() => onHoverNode(null)}
          >
            {/* Pulsing SVG Heartbeat/EKG Ring Indicator */}
            <SvgMapHeartbeatPin cx={390} cy={130} radius={30} health={aptHealth} />
            
            <rect x="375" y="118" width="30" height="24" rx="3" fill="#0c121e" stroke={aptHealth.color} strokeWidth="2" className="group-hover:stroke-sky-300 transition-colors" />
            <circle cx="390" cy="130" r="4" fill={aptHealth.color} />

            {/* Callout Box with Exact Address & Health Indicator */}
            <rect x="335" y="18" width="250" height="64" rx="5" fill="#090d16" stroke={aptHealth.color} strokeWidth="1.5" className="group-hover:stroke-white transition-colors" />
            <text x="345" y="34" fill="#ffffff" fontSize="10.5" fontFamily="monospace" fontWeight="bold">
              THE LOUISA FLOWERS
            </text>
            <text x="345" y="48" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">
              515 NE HOLLADAY ST, 97232
            </text>
            <text x="345" y="62" fill={aptHealth.color} fontSize="8" fontFamily="monospace">
              ● {aptHealth.label} → OPEN NODE INSPECTOR
            </text>
            
            {/* Connector Line */}
            <line x1="390" y1="82" x2="390" y2="118" stroke={aptHealth.color} strokeWidth="1.5" strokeDasharray="3 3" />
          </motion.g>
        )}
      </svg>
    </div>
  );
}

// ----------------------------------------------------
// 5. LOUISA FLOWERS FACILITY VIEW (Level 5: Building & Workstation)
// 515 NE Holladay St, Portland, OR 97232
// ----------------------------------------------------
function LouisaFlowersFacilityView({ 
  node, 
  mapStyle, 
  nodes, 
  onSelectNode,
  onHoverNode,
}: { 
  node: NodeData; 
  mapStyle: string; 
  nodes: Record<string, NodeData>; 
  onSelectNode: (id: string) => void;
  onHoverNode: (node: NodeData | null, e?: React.MouseEvent) => void;
}) {
  const wsNode = nodes['ws'];
  const devEnvNode = nodes['dev_env'];
  const runtimeNode = nodes['runtime'];
  const reposNode = nodes['repos'];
  const infraNode = nodes['infra'];
  const archNode = nodes['arch'];
  const actorsNode = nodes['actors'];
  const eventsNode = nodes['events'];
  const codeNode = nodes['code'];

  const wsHealth = getNodeHealth(wsNode);
  const devEnvHealth = getNodeHealth(devEnvNode);
  const runtimeHealth = getNodeHealth(runtimeNode);
  const reposHealth = getNodeHealth(reposNode);
  const infraHealth = getNodeHealth(infraNode);
  const actorsHealth = getNodeHealth(actorsNode);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      <svg className="w-full h-full max-h-[460px]" viewBox="0 0 600 400">
        <rect width="600" height="400" fill={mapStyle === 'satellite' ? '#090e18' : '#05070d'} />

        {/* NE Holladay St Corridor */}
        <rect x="0" y="300" width="600" height="60" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
        <line x1="0" y1="330" x2="600" y2="330" stroke="#f59e0b" strokeWidth="2" strokeDasharray="8 6" />
        <text x="30" y="322" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
          NE HOLLADAY ST (500 BLOCK)
        </text>
        <text x="30" y="345" fill="#f59e0b" fontSize="8" fontFamily="monospace">
          TriMet MAX Light Rail Line (Convention Center Station)
        </text>

        {/* NE Grand Ave & NE 6th Ave */}
        <rect x="0" y="0" width="90" height="300" fill="#0c121e" stroke="#1e293b" strokeWidth="1" />
        <text x="45" y="150" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle" transform="rotate(-90 45 150)">
          NE GRAND AVE
        </text>

        <rect x="510" y="0" width="90" height="300" fill="#0c121e" stroke="#1e293b" strokeWidth="1" />
        <text x="555" y="150" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle" transform="rotate(90 555 150)">
          NE 6TH AVE
        </text>

        {/* 515 NE HOLLADAY ST - BUILDING ARCHITECTURAL FOOTPRINT */}
        <rect
          x="120"
          y="40"
          width="360"
          height="240"
          rx="6"
          fill={mapStyle === 'satellite' ? '#1a2333' : '#0d1526'}
          stroke="#6366f1"
          strokeWidth="2.5"
          className="shadow-2xl"
        />

        {/* Interior Unit Partitions */}
        <g stroke="#334155" strokeWidth="1" strokeDasharray="3 3">
          <line x1="120" y1="120" x2="480" y2="120" />
          <line x1="120" y1="200" x2="480" y2="200" />
          <line x1="240" y1="40" x2="240" y2="280" />
          <line x1="360" y1="40" x2="360" y2="280" />
        </g>

        {/* Building Title & Address */}
        <text x="300" y="65" fill="#ffffff" fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          THE LOUISA FLOWERS
        </text>
        <text x="300" y="80" fill="#38bdf8" fontSize="9" fontFamily="monospace" textAnchor="middle">
          515 NE HOLLADAY ST, PORTLAND, OR 97232
        </text>
        <text x="300" y="94" fill="#94a3b8" fontSize="7.5" fontFamily="monospace" textAnchor="middle">
          LLOYD DISTRICT STRATEGIC FACILITY // BASE SECTOR ALPHA
        </text>

        {/* Operational Zones with Entrance Animations, Health Rings & Subtle Pulsing Drop Shadows */}
        
        {/* Zone 1: Primary Command Workstation */}
        {wsNode && (
          <motion.g 
            className="cursor-pointer group"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              filter: [
                `drop-shadow(0 0 2px ${wsHealth.glowColor})`,
                `drop-shadow(0 0 8px ${wsHealth.glowColor})`,
                `drop-shadow(0 0 2px ${wsHealth.glowColor})`
              ]
            }}
            transition={{ 
              opacity: { duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={() => onSelectNode('ws')}
            onMouseEnter={(e) => onHoverNode(wsNode, e)}
            onMouseMove={(e) => onHoverNode(wsNode, e)}
            onMouseLeave={() => onHoverNode(null)}
          >
            {/* Subtle Pulsing SVG Heartbeat Ring */}
            <SvgMapHeartbeatPin cx={150} cy={132} radius={14} health={wsHealth} />
            
            <rect 
              x="135" 
              y="115" 
              width="100" 
              height="70" 
              rx="5" 
              fill={node.id === 'ws' ? '#312e81' : '#111827'} 
              stroke={node.id === 'ws' ? '#818cf8' : wsHealth.color} 
              strokeWidth={node.id === 'ws' ? '2.5' : '1.5'} 
              className="group-hover:stroke-sky-300 group-hover:fill-[#1e1b4b] transition-all"
            />
            <circle cx="150" cy="132" r="4" fill={wsHealth.color} />
            <text x="160" y="135" fill="#ffffff" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
              WORKSTATION
            </text>
            <text x="145" y="152" fill="#a5b4fc" fontSize="7.5" fontFamily="monospace">
              RIG ALPHA CORE
            </text>
            <text x="145" y="168" fill={wsHealth.color} fontSize="7" fontFamily="monospace">
              ● {wsHealth.label} | 64GB
            </text>
          </motion.g>
        )}

        {/* Zone 2: Development Cluster */}
        {devEnvNode && (
          <motion.g 
            className="cursor-pointer group"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              filter: [
                `drop-shadow(0 0 2px ${devEnvHealth.glowColor})`,
                `drop-shadow(0 0 8px ${devEnvHealth.glowColor})`,
                `drop-shadow(0 0 2px ${devEnvHealth.glowColor})`
              ]
            }}
            transition={{ 
              opacity: { duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 3.4, delay: 0.3, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={() => onSelectNode('dev_env')}
            onMouseEnter={(e) => onHoverNode(devEnvNode, e)}
            onMouseMove={(e) => onHoverNode(devEnvNode, e)}
            onMouseLeave={() => onHoverNode(null)}
          >
            {/* Subtle Pulsing SVG Heartbeat Ring */}
            <SvgMapHeartbeatPin cx={265} cy={132} radius={14} health={devEnvHealth} />

            <rect 
              x="250" 
              y="115" 
              width="100" 
              height="70" 
              rx="5" 
              fill={node.id === 'dev_env' ? '#064e3b' : '#111827'} 
              stroke={node.id === 'dev_env' ? '#34d399' : devEnvHealth.color} 
              strokeWidth={node.id === 'dev_env' ? '2.5' : '1.5'} 
              className="group-hover:stroke-emerald-300 group-hover:fill-[#064e3b] transition-all"
            />
            <circle cx="265" cy="132" r="4" fill={devEnvHealth.color} />
            <text x="275" y="135" fill="#ffffff" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
              DEV_ENV
            </text>
            <text x="260" y="152" fill="#6ee7b7" fontSize="7.5" fontFamily="monospace">
              CLUSTER SPEC
            </text>
            <text x="260" y="168" fill={devEnvHealth.color} fontSize="7" fontFamily="monospace">
              ● {devEnvHealth.label} | 12 CONT
            </text>
          </motion.g>
        )}

        {/* Zone 3: Kernel Runtime & Execution Core */}
        {runtimeNode && (
          <motion.g 
            className="cursor-pointer group"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              filter: [
                `drop-shadow(0 0 2px ${runtimeHealth.glowColor})`,
                `drop-shadow(0 0 8px ${runtimeHealth.glowColor})`,
                `drop-shadow(0 0 2px ${runtimeHealth.glowColor})`
              ]
            }}
            transition={{ 
              opacity: { duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 3.4, delay: 0.6, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={() => onSelectNode('runtime')}
            onMouseEnter={(e) => onHoverNode(runtimeNode, e)}
            onMouseMove={(e) => onHoverNode(runtimeNode, e)}
            onMouseLeave={() => onHoverNode(null)}
          >
            {/* Subtle Pulsing SVG Heartbeat Ring */}
            <SvgMapHeartbeatPin cx={380} cy={132} radius={14} health={runtimeHealth} />

            <rect 
              x="365" 
              y="115" 
              width="100" 
              height="70" 
              rx="5" 
              fill={node.id === 'runtime' ? '#78350f' : '#111827'} 
              stroke={node.id === 'runtime' ? '#fbbf24' : runtimeHealth.color} 
              strokeWidth={node.id === 'runtime' ? '2.5' : '1.5'} 
              className="group-hover:stroke-amber-300 group-hover:fill-[#78350f] transition-all"
            />
            <circle cx="380" cy="132" r="4" fill={runtimeHealth.color} />
            <text x="390" y="135" fill="#ffffff" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
              RUNTIME
            </text>
            <text x="375" y="152" fill="#fde68a" fontSize="7.5" fontFamily="monospace">
              V8 PROCESS
            </text>
            <text x="375" y="168" fill={runtimeHealth.color} fontSize="7" fontFamily="monospace">
              ● {runtimeHealth.label} | 2ms LAG
            </text>
          </motion.g>
        )}

        {/* Sub-Zones Row 2: Repositories & Local Infra & Actors */}
        {reposNode && (
          <motion.g 
            className="cursor-pointer group"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              filter: [
                `drop-shadow(0 0 2px ${reposHealth.glowColor})`,
                `drop-shadow(0 0 8px ${reposHealth.glowColor})`,
                `drop-shadow(0 0 2px ${reposHealth.glowColor})`
              ]
            }}
            transition={{ 
              opacity: { duration: 0.35, delay: 0.2, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.35, delay: 0.2, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 3.5, delay: 0.2, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={() => onSelectNode('repos')}
            onMouseEnter={(e) => onHoverNode(reposNode, e)}
            onMouseMove={(e) => onHoverNode(reposNode, e)}
            onMouseLeave={() => onHoverNode(null)}
          >
            <rect 
              x="135" 
              y="200" 
              width="100" 
              height="60" 
              rx="4" 
              fill={node.id === 'repos' ? '#1e1b4b' : '#0d1117'} 
              stroke={node.id === 'repos' ? '#818cf8' : reposHealth.color} 
              strokeWidth="1.4" 
              className="group-hover:stroke-indigo-400 transition-all"
            />
            <text x="145" y="222" fill="#e2e8f0" fontSize="8" fontFamily="monospace" fontWeight="bold">
              REPOSITORIES
            </text>
            <text x="145" y="238" fill={reposHealth.color} fontSize="7" fontFamily="monospace">
              ● {reposHealth.label} | 14 COMM
            </text>
          </motion.g>
        )}

        {infraNode && (
          <motion.g 
            className="cursor-pointer group"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              filter: [
                `drop-shadow(0 0 2px ${infraHealth.glowColor})`,
                `drop-shadow(0 0 8px ${infraHealth.glowColor})`,
                `drop-shadow(0 0 2px ${infraHealth.glowColor})`
              ]
            }}
            transition={{ 
              opacity: { duration: 0.35, delay: 0.25, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.35, delay: 0.25, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 3.5, delay: 0.5, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={() => onSelectNode('infra')}
            onMouseEnter={(e) => onHoverNode(infraNode, e)}
            onMouseMove={(e) => onHoverNode(infraNode, e)}
            onMouseLeave={() => onHoverNode(null)}
          >
            <rect 
              x="250" 
              y="200" 
              width="100" 
              height="60" 
              rx="4" 
              fill={node.id === 'infra' ? '#134e4a' : '#0d1117'} 
              stroke={node.id === 'infra' ? '#2dd4bf' : infraHealth.color} 
              strokeWidth="1.4" 
              className="group-hover:stroke-teal-400 transition-all"
            />
            <text x="260" y="222" fill="#e2e8f0" fontSize="8" fontFamily="monospace" fontWeight="bold">
              INFRASTRUCTURE
            </text>
            <text x="260" y="238" fill={infraHealth.color} fontSize="7" fontFamily="monospace">
              ● {infraHealth.label} | 4 VMs
            </text>
          </motion.g>
        )}

        {actorsNode && (
          <motion.g 
            className="cursor-pointer group"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              filter: [
                `drop-shadow(0 0 2px ${actorsHealth.glowColor})`,
                `drop-shadow(0 0 8px ${actorsHealth.glowColor})`,
                `drop-shadow(0 0 2px ${actorsHealth.glowColor})`
              ]
            }}
            transition={{ 
              opacity: { duration: 0.35, delay: 0.3, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.35, delay: 0.3, ease: [0.16, 1, 0.3, 1] },
              filter: { duration: 3.5, delay: 0.8, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={() => onSelectNode('actors')}
            onMouseEnter={(e) => onHoverNode(actorsNode, e)}
            onMouseMove={(e) => onHoverNode(actorsNode, e)}
            onMouseLeave={() => onHoverNode(null)}
          >
            <rect 
              x="365" 
              y="200" 
              width="100" 
              height="60" 
              rx="4" 
              fill={node.id === 'actors' ? '#701a75' : '#0d1117'} 
              stroke={node.id === 'actors' ? '#f472b6' : actorsHealth.color} 
              strokeWidth="1.4" 
              className="group-hover:stroke-fuchsia-400 transition-all"
            />
            <text x="375" y="222" fill="#e2e8f0" fontSize="8" fontFamily="monospace" fontWeight="bold">
              ACTOR MODEL
            </text>
            <text x="375" y="238" fill={actorsHealth.color} fontSize="7" fontFamily="monospace">
              ● {actorsHealth.label} | 24 ACT
            </text>
          </motion.g>
        )}

        {/* Fiber Uplink */}
        <g>
          <line x1="300" y1="280" x2="300" y2="300" stroke="#10b981" strokeWidth="3" strokeDasharray="4 2" />
          <circle cx="300" cy="290" r="4" fill="#10b981" />
          <text x="310" y="293" fill="#34d399" fontSize="7.5" fontFamily="monospace">
            1Gbps SYMMETRIC FIBER INGRESS
          </text>
        </g>
      </svg>
    </div>
  );
}
