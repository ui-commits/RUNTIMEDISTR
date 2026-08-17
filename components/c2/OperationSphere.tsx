'use client';

import React, { useState, useRef, useEffect } from 'react';
import { NodeData, getNodePriority, NodePriority } from '@/lib/ontology';
import { getNodeHealth, NodeHealthInfo, isNodeHighPressure, getNodeResourceLoad, getNodePriorityStyling, getResourceLoadHeartbeat } from '@/lib/health';
import { useC2, GhostNodeTrace, LayoutSnapshot } from '@/lib/c2Context';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crosshair, 
  ArrowUp, 
  Zap, 
  Globe, 
  Cpu, 
  Network, 
  Layers, 
  Server, 
  MapPin, 
  Flame, 
  Power,
  MousePointerClick,
  Activity,
  Grid,
  CircleDot,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Pin,
  AlertTriangle,
  Ghost,
  History,
  Search,
  Radio,
  Route,
  Bookmark,
  Save,
  Trash2,
  Check,
  Play,
  ShieldAlert,
  Gauge,
  Sliders,
  FolderHeart,
  Building2,
} from 'lucide-react';
import { GeoMapOverlay } from '@/components/c2/GeoMapOverlay';
import { NodeHeartbeatRing, LiveEkgWaveform, ResourceLoadHeartbeatRing } from '@/components/c2/NodeHeartbeatRing';
import { DigitalDataFlowPaths, LayoutNodePosition } from '@/components/c2/DigitalDataFlowPaths';
import { MiniMap } from '@/components/c2/MiniMap';
import { ProjectionMode, DigitalLayoutMode } from '@/lib/projections';
import dynamic from 'next/dynamic';

const KnowledgeSpaceView = dynamic(() => import('@/components/c2/KnowledgeSpaceView').then((m) => m.KnowledgeSpaceView));

interface OperationSphereProps {
  nodes: Record<string, NodeData>;
  activeNodeId: string;
  onSelectNode: (id: string) => void;
  projection?: ProjectionMode;
  onProjectionChange?: (projection: ProjectionMode) => void;
}

export interface HoveredSphereNode {
  node: NodeData;
  health: NodeHealthInfo;
  x: number;
  y: number;
}

export function OperationSphere({ 
  nodes, 
  activeNodeId, 
  onSelectNode,
  projection: externalProjection,
  onProjectionChange: externalOnProjectionChange,
}: OperationSphereProps) {
  const { 
    searchQuery, 
    showRecent, 
    setShowRecent, 
    recentGhosts,
    layoutSnapshots,
    saveLayoutSnapshot,
    deleteLayoutSnapshot,
  } = useC2();
  
  const [internalProjection, setInternalProjection] = useState<ProjectionMode>('geographic');
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState<HoveredSphereNode | null>(null);
  const [digitalLayout, setDigitalLayout] = useState<DigitalLayoutMode>('radial');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [breadcrumbs, setBreadcrumbs] = useState<Record<string, BreadcrumbPoint[]>>({});
  const [snapToast, setSnapToast] = useState<{ message: string; mode?: string; id: number } | null>(null);
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  
  // Real-time Network Traffic Spike Monitor State
  const [spikeMonitorActive, setSpikeMonitorActive] = useState(true);
  const [activeSpikeNodeId, setActiveSpikeNodeId] = useState<string | null>(null);
  const [spikeAlertBanner, setSpikeAlertBanner] = useState<{ message: string; load: number } | null>(null);
  
  const toastIdRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const spikeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleRecordBreadcrumb = (nodeId: string, pt: { x: number; y: number }) => {
    setBreadcrumbs((prev) => {
      const list = prev[nodeId] || [];
      const last = list[list.length - 1];
      if (last && Math.hypot(last.x - pt.x, last.y - pt.y) < 6) return prev;
      toastIdRef.current += 1;
      return {
        ...prev,
        [nodeId]: [...list, { x: pt.x, y: pt.y, timestamp: toastIdRef.current }].slice(-30),
      };
    });
  };

  const handleClearBreadcrumbs = () => {
    setBreadcrumbs({});
  };

  const projection = externalProjection || internalProjection;
  const setProjection = (mode: ProjectionMode) => {
    if (externalOnProjectionChange) {
      externalOnProjectionChange(mode);
    } else {
      setInternalProjection(mode);
    }
  };

  const activeNode = nodes[activeNodeId] || nodes['earth'];
  const parentNode = activeNode?.parentId && nodes[activeNode.parentId] ? nodes[activeNode.parentId] : null;
  const childrenNodes = (activeNode?.childrenIds || []).map(id => nodes[id]).filter(Boolean);

  // High pressure nodes detection
  const highPressureNodes = React.useMemo(() => {
    return Object.values(nodes).filter(n => isNodeHighPressure(n));
  }, [nodes]);
  const isActiveHighPressure = isNodeHighPressure(activeNode);

  // Trigger Traffic Spike Detection Simulation
  const triggerTrafficSpike = React.useCallback((targetNodeId?: string) => {
    const candidateNodes = childrenNodes.length > 0 ? childrenNodes : Object.values(nodes);
    const chosenNode = targetNodeId 
      ? nodes[targetNodeId] || activeNode 
      : candidateNodes[Math.floor(Math.random() * candidateNodes.length)] || activeNode;

    const simulatedLoad = Math.floor(88 + Math.random() * 11); // 88% - 99%
    setActiveSpikeNodeId(chosenNode.id);
    setSpikeAlertBanner({
      message: `TRAFFIC SPIKE DETECTED: [${chosenNode.label}] OVERLOAD AT ${simulatedLoad}% BANDWIDTH`,
      load: simulatedLoad,
    });

    if (spikeTimeoutRef.current) clearTimeout(spikeTimeoutRef.current);
    spikeTimeoutRef.current = setTimeout(() => {
      setActiveSpikeNodeId(null);
      setSpikeAlertBanner(null);
    }, 3800);
  }, [activeNode, childrenNodes, nodes]);

  // Real-time Traffic Spike Monitor Loop: automatically triggers brief alert states on high-load nodes
  useEffect(() => {
    if (!spikeMonitorActive) return;

    const interval = setInterval(() => {
      // Find high pressure / high load nodes
      const surging = Object.values(nodes).find(n => getNodeResourceLoad(n) >= 75);
      if (surging && Math.random() > 0.45) {
        triggerTrafficSpike(surging.id);
      }
    }, 14000);

    return () => clearInterval(interval);
  }, [spikeMonitorActive, nodes, triggerTrafficSpike]);

  // Layout Snapshot Management
  const handleSaveCurrentLayout = () => {
    const name = newLayoutName.trim() || `Snapshot Layout: ${activeNode.label} (${digitalLayout.toUpperCase()})`;
    saveLayoutSnapshot({
      name,
      projection,
      digitalLayout,
      zoomLevel,
      activeNodeId: activeNode.id,
    });
    setNewLayoutName('');
    setShowLayoutMenu(false);

    toastIdRef.current += 1;
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setSnapToast({ message: `LAYOUT SNAPSHOT SAVED: "${name}"`, mode: digitalLayout, id: toastIdRef.current });
    toastTimeoutRef.current = setTimeout(() => setSnapToast(null), 2600);
  };

  const handleApplyLayoutSnapshot = (snapshot: LayoutSnapshot) => {
    setProjection(snapshot.projection);
    setDigitalLayout(snapshot.digitalLayout);
    setZoomLevel(snapshot.zoomLevel);
    if (snapshot.activeNodeId && nodes[snapshot.activeNodeId]) {
      onSelectNode(snapshot.activeNodeId);
    }
    setShowLayoutMenu(false);

    toastIdRef.current += 1;
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setSnapToast({ message: `SNAPSHOT APPLIED: "${snapshot.name}"`, mode: snapshot.digitalLayout, id: toastIdRef.current });
    toastTimeoutRef.current = setTimeout(() => setSnapToast(null), 2600);
  };

  const triggerSnapToGrid = (targetMode?: DigitalLayoutMode, clickCoord?: { x: number; y: number }) => {
    const nextMode = targetMode || (digitalLayout === 'radial' ? 'grid' : 'radial');
    setDigitalLayout(nextMode);

    toastIdRef.current += 1;
    if (clickCoord) {
      setClickRipple({ x: clickCoord.x, y: clickCoord.y, id: toastIdRef.current });
    }

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    const msg = nextMode === 'grid' 
      ? 'SNAP TO GRID: CARTESIAN MATRIX AUTO-ORGANIZED' 
      : 'SNAP TO GRID: RADIAL POLAR AUTO-ORGANIZED';
    
    setSnapToast({ message: msg, mode: nextMode, id: toastIdRef.current });
    toastTimeoutRef.current = setTimeout(() => {
      setSnapToast(null);
    }, 2400);
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only trigger if double-clicked on background canvas or non-interactive container
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button') || target.closest('[data-node-interactive="true"]');
    if (isInteractive) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      triggerSnapToGrid(undefined, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    } else {
      triggerSnapToGrid();
    }
  };

  const handleZoomChange = (delta: number) => {
    setZoomLevel(prev => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.min(Math.max(next, 0.5), 1.8);
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
  };

  const handleNodeHover = (node: NodeData | null, e?: React.MouseEvent) => {
    if (!node || !e) {
      setHoveredNodeInfo(null);
      return;
    }

    const health = getNodeHealth(node);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setHoveredNodeInfo({
        node,
        health,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
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

  if (!activeNode) return <div className="text-amber-500 p-8 font-mono">NODE SIGNAL LOST</div>;

  return (
    <div 
      ref={containerRef}
      onDoubleClick={handleCanvasDoubleClick}
      className="OperationSphere relative h-full w-full bg-[#07070a] border border-border-c2 rounded overflow-hidden flex flex-col items-center justify-center panel-bg select-none"
    >
      {/* Animated Background: Subtle pulsing grid with floating nodes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute inset-0 opacity-8 animate-grid-drift" 
          style={{ 
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.08) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Slow drifting radial glow — simple, subtle, CSS-only */}
        <div
          className="absolute inset-0 animate-glow-drift"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 30% 30%, rgba(59,130,246,0.10), transparent 55%), radial-gradient(ellipse at 72% 62%, rgba(16,185,129,0.05), transparent 55%)',
          }}
        />
        <motion.div 
          className="absolute top-1/4 left-1/3 w-1 h-1 rounded-full bg-cobalt-c2/30"
          animate={{ scale: [1, 2.5, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-3/4 left-1/4 w-1.5 h-1.5 rounded-full bg-cobalt-c2/25"
          animate={{ scale: [1, 2, 1], opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        />
        <motion.div 
          className="absolute top-1/3 left-2/3 w-1 h-1 rounded-full bg-blue-c2/30"
          animate={{ scale: [1, 2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        />
      </div>

      {/* Background Radar / Polar Grid Grid */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(var(--color-cobalt-c2) 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }} 
      />

      {/* Snap to Grid Click Ripple */}
      {clickRipple && (
        <motion.div
          key={clickRipple.id}
          initial={{ scale: 0.1, opacity: 0.9 }}
          animate={{ scale: 3.5, opacity: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="absolute w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-400 bg-blue-500/10 pointer-events-none z-30"
          style={{ left: clickRipple.x, top: clickRipple.y }}
        />
      )}

      {/* High Pressure Alert HUD Banner when Nodes are Overloaded */}
      {highPressureNodes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1 bg-red-950/95 border border-red-500/90 rounded-none shadow-[0_0_24px_rgba(239,68,68,0.55)] backdrop-blur-md flex items-center gap-2 font-mono text-[10.5px] text-white"
        >
          <Flame size={13} className="text-red-400 animate-pulse" />
          <span className="font-bold tracking-wider text-red-100">HIGH PRESSURE WARNING:</span>
          <span className="text-red-300 font-semibold">
            {highPressureNodes.length} NODE{highPressureNodes.length > 1 ? 'S' : ''} SURGING ({'>'}80% LOAD)
          </span>
          {isActiveHighPressure && (
            <span className="px-1.5 py-0.2 bg-red-600 text-white font-bold rounded-none text-[8.5px] uppercase tracking-widest shadow animate-pulse">
              ACTIVE NODE SURGE
            </span>
          )}
        </motion.div>
      )}

      {/* Real-time Traffic Spike Alert Banner */}
      <AnimatePresence>
        {spikeAlertBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.92 }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gradient-to-r from-red-950 via-rose-900 to-red-950 border-2 border-red-500 rounded-none shadow-[0_0_35px_rgba(239,68,68,0.85)] backdrop-blur-md flex items-center gap-2.5 font-mono text-xs text-white"
          >
            <Zap size={15} className="text-amber-300 fill-amber-300 animate-bounce" />
            <span className="font-extrabold tracking-wider text-rose-100 uppercase">
              ⚡ OVERLOAD SURGE ALERT:
            </span>
            <span className="text-red-200 font-semibold">
              {spikeAlertBanner.message}
            </span>
            <span className="px-2 py-0.5 bg-red-600 text-white font-bold rounded-none text-[9px] uppercase tracking-widest animate-pulse shadow">
              {spikeAlertBanner.load}% TRAFFIC SPIKE
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Left Projection, Address Badge, Snapshot, Layout Snapshots & Traffic Spike Monitor */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-30 flex-wrap">
        <div className="px-2.5 py-1 bg-[#0e0e12]/90 backdrop-blur-md border border-border-c2 text-[10px] font-mono text-white rounded flex items-center gap-1.5 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-cobalt-c2 animate-pulse" />
          <span className="text-[#888]">PROJECTION:</span>
          <span className="font-bold text-cobalt-c2 uppercase">{projection}</span>
        </div>

        {/* Save Layout Snapshot Feature Button & Popover */}
        <div className="relative">
          <button
            onClick={() => setShowLayoutMenu(prev => !prev)}
            title="Save or switch between custom Snapshot Layouts"
            className={`px-2.5 py-1 text-[10px] font-mono rounded flex items-center gap-1.5 shadow-lg transition-all cursor-pointer border backdrop-blur-md ${
              showLayoutMenu
                ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                : 'bg-[#0e0e12]/90 hover:bg-white/10 text-slate-300 hover:text-white border-border-c2'
            }`}
          >
            <FolderHeart size={11} className={showLayoutMenu ? "text-white" : "text-blue-400"} />
            <span className="font-bold">LAYOUTS</span>
            <span className="px-1 py-0.2 bg-blue-950/80 text-blue-300 text-[8px] rounded border border-blue-500/40">
              {layoutSnapshots.length}
            </span>
          </button>

          {/* Layout Snapshot Manager Popover */}
          <AnimatePresence>
            {showLayoutMenu && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="absolute top-full left-0 mt-1.5 w-80 bg-[#0c1017]/98 backdrop-blur-xl border border-blue-500/60 rounded-none shadow-[0_12px_36px_rgba(0,0,0,0.9),0_0_24px_rgba(59,130,246,0.3)] p-3 font-mono text-xs text-slate-200 z-50"
              >
                <div className="flex items-center justify-between border-b border-[#222a3a] pb-2 mb-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
                    <Save size={13} className="text-blue-400" />
                    <span>SNAPSHOT LAYOUT MANAGER</span>
                  </div>
                  <button
                    onClick={() => setShowLayoutMenu(false)}
                    className="text-slate-400 hover:text-white text-[10px] p-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Current State Quick Summary */}
                <div className="bg-[#121724] border border-[#1f2638] rounded-none p-2 mb-2.5 space-y-1 text-[9.5px]">
                  <div className="text-[#889] uppercase tracking-wider font-semibold">CURRENT ACTIVE VIEW:</div>
                  <div className="grid grid-cols-2 gap-1 text-slate-300">
                    <div>MODE: <span className="font-bold text-blue-300 uppercase">{digitalLayout}</span></div>
                    <div>ZOOM: <span className="font-bold text-sky-300">{Math.round(zoomLevel * 100)}%</span></div>
                    <div>PROJECTION: <span className="font-bold text-amber-300 uppercase">{projection}</span></div>
                    <div className="truncate">NODE: <span className="font-bold text-white truncate">{activeNode.label}</span></div>
                  </div>
                </div>

                {/* Save Current Layout Input */}
                <div className="space-y-1.5 mb-3">
                  <label className="text-[9px] text-slate-400 font-semibold uppercase">Capture Snapshot Layout:</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newLayoutName}
                      onChange={(e) => setNewLayoutName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCurrentLayout();
                      }}
                      placeholder={`Snapshot: ${activeNode.label} (${digitalLayout})`}
                      className="flex-1 bg-[#07090e] border border-[#2d3748] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      onClick={handleSaveCurrentLayout}
                      title="Save current layout as a snapshot"
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow"
                    >
                      <Save size={10} />
                      <span>Save</span>
                    </button>
                  </div>
                </div>

                {/* List of Saved Snapshots */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  <div className="text-[9px] text-[#889] uppercase tracking-wider font-semibold">SAVED SNAPSHOTS:</div>
                  {layoutSnapshots.length === 0 ? (
                    <div className="text-center py-3 text-[#667] text-[10px]">No layout snapshots saved yet.</div>
                  ) : (
                    layoutSnapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="p-2 bg-[#090d16] hover:bg-[#111728] border border-[#1f283d] rounded-none flex items-center justify-between gap-2 transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-200 text-[10.5px] truncate">{snap.name}</div>
                          <div className="flex items-center gap-2 text-[8px] text-slate-400 mt-0.5">
                            <span className="px-1 py-0.2 bg-blue-950 text-blue-300 rounded uppercase font-semibold">
                              {snap.digitalLayout}
                            </span>
                            <span>{Math.round(snap.zoomLevel * 100)}% ZOOM</span>
                            <span>{snap.projection}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleApplyLayoutSnapshot(snap)}
                            title="Apply this layout snapshot"
                            className="px-2 py-1 bg-blue-700/80 hover:bg-blue-600 text-white rounded text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow"
                          >
                            <Play size={8} />
                            <span>Apply</span>
                          </button>
                          <button
                            onClick={() => deleteLayoutSnapshot(snap.id)}
                            title="Delete snapshot"
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Top Right Controls: Show Recent Toggle, Snap to Grid & Zoom */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-30">
        {/* 'Show Recent' Ghost Traces Toggle */}
        <button
          onClick={() => setShowRecent(prev => !prev)}
          title="Toggle faint 'ghost' representations of recently closed or moved nodes for trace analysis"
          className={`px-2.5 py-1 text-[10px] font-mono rounded-none flex items-center gap-1.5 transition-all cursor-pointer border shadow-lg ${
            showRecent
              ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
              : 'bg-[#0d111a]/90 text-slate-400 border-border-c2 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Ghost size={11} className={showRecent ? "text-cyan-400 animate-pulse" : "text-slate-400"} />
          <span className="font-bold">SHOW RECENT</span>
          <span className={`px-1 py-0.2 text-[8px] rounded font-bold ${
            showRecent ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {recentGhosts.length}
          </span>
        </button>

        {projection === 'digital' && (
          <>
            {/* Snap To Grid Auto-Organize Toggle */}
            <div className="flex items-center bg-[#0d111a]/90 backdrop-blur-md border border-border-c2 rounded-none p-0.5 shadow-lg">
              <button
                onClick={() => triggerSnapToGrid('radial')}
                title="Snap to Radial Layout (or Double Click Canvas)"
                className={`px-2 py-1 text-[10px] font-mono rounded flex items-center gap-1 transition-all cursor-pointer ${
                  digitalLayout === 'radial' 
                    ? 'bg-blue-600 text-white font-bold shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <CircleDot size={11} />
                <span>Radial</span>
              </button>
              <button
                onClick={() => triggerSnapToGrid('grid')}
                title="Snap to Matrix Grid Layout (or Double Click Canvas)"
                className={`px-2 py-1 text-[10px] font-mono rounded flex items-center gap-1 transition-all cursor-pointer ${
                  digitalLayout === 'grid' 
                    ? 'bg-blue-600 text-white font-bold shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Grid size={11} />
                <span>Grid</span>
              </button>
            </div>

            {/* Canvas Zoom Controls */}
            <div className="flex items-center bg-[#0d111a]/90 backdrop-blur-md border border-border-c2 rounded-none p-0.5 shadow-lg text-[10px] font-mono text-slate-300">
              <button
                onClick={() => handleZoomChange(-0.15)}
                title="Zoom Out"
                className="p-1 hover:bg-white/10 hover:text-white rounded transition-colors cursor-pointer"
              >
                <ZoomOut size={12} />
              </button>
              <button
                onClick={handleResetZoom}
                title="Reset Zoom to 1.0x"
                className="px-1.5 py-0.5 hover:bg-white/10 hover:text-white rounded font-bold text-[9px] transition-colors cursor-pointer"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={() => handleZoomChange(0.15)}
                title="Zoom In"
                className="p-1 hover:bg-white/10 hover:text-white rounded transition-colors cursor-pointer"
              >
                <ZoomIn size={12} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Snap to Grid HUD Toast Notification */}
      <AnimatePresence>
        {snapToast && (
          <motion.div
            key={snapToast.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 bg-[#0e1322]/95 border border-blue-500/60 rounded-none shadow-[0_0_20px_rgba(59,130,246,0.35)] backdrop-blur-md flex items-center gap-2 font-mono text-[10.5px] text-white"
          >
            <Sparkles size={13} className="text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="font-bold tracking-wide text-blue-300">{snapToast.message}</span>
            <span className="text-[8.5px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded-none border border-blue-400/30 uppercase">
              {snapToast.mode}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Projection Mode Content */}
      <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
        {projection === 'knowledge' && (
          <KnowledgeSpaceView
            nodes={nodes}
            activeNode={activeNode}
            onSelectNode={onSelectNode}
            onHoverNode={handleNodeHover}
          />
        )}

        {projection === 'geographic' && (
          <GeoMapOverlay nodes={nodes} activeNode={activeNode} onSelectNode={onSelectNode} />
        )}

        {projection === 'digital' && (
          <DigitalPolarView
            nodes={nodes}
            activeNode={activeNode}
            parentNode={parentNode}
            childrenNodes={childrenNodes}
            layoutMode={digitalLayout}
            zoomLevel={zoomLevel}
            onSelectNode={onSelectNode}
            onHoverNode={handleNodeHover}
            onRecordBreadcrumb={handleRecordBreadcrumb}
            activeSpikeNodeId={activeSpikeNodeId}
          />
        )}

        {projection === 'physical' && (
          <PhysicalHardwareView
            node={activeNode}
            nodes={nodes}
            onSelectNode={onSelectNode}
            onHoverNode={handleNodeHover}
          />
        )}

        {projection === 'ontology' && (
          <OntologyGraphView
            nodes={nodes}
            activeNode={activeNode}
            onSelectNode={onSelectNode}
            onHoverNode={handleNodeHover}
          />
        )}

        {/* Visual Breadcrumbs Drag Trace Overlay */}
        <BreadcrumbsTraceOverlay
          breadcrumbs={breadcrumbs}
          zoomLevel={zoomLevel}
          onClear={handleClearBreadcrumbs}
        />

        {/* Ghost Trace Historical Overlay Layer */}
        {showRecent && (
          <GhostTracesLayer
            ghosts={recentGhosts}
            activeNode={activeNode}
            onSelectNode={onSelectNode}
            zoomLevel={zoomLevel}
          />
        )}
      </div>

      {/* Dynamic Hover-Based Node Tooltip for Digital/Physical/Ontology Views */}
      <AnimatePresence>
        {hoveredNodeInfo && projection !== 'geographic' && projection !== 'knowledge' && (
          <OperationSphereNodeTooltip
            info={hoveredNodeInfo}
            onSelectNode={onSelectNode}
          />
        )}
      </AnimatePresence>

      {/* Consolidated Bottom-Right Telemetry Box: Traffic Monitor + TARGET + GEO lock */}
      <div className="absolute bottom-3 right-3 z-30 max-w-sm font-mono">
        <div className="bg-[#0e0e12]/90 backdrop-blur-md border border-border-c2 rounded-none shadow-lg">
          {/* Row 1: Traffic spike monitor toggle + manual trigger + active target telemetry */}
          <div className="flex items-center p-1 text-[10px]">
            <button
              onClick={() => setSpikeMonitorActive(prev => !prev)}
              title="Real-time monitor detecting sudden network traffic spikes and highlighting connecting lines"
              className={`px-2 py-0.5 rounded-none flex items-center gap-1 transition-colors cursor-pointer ${
                spikeMonitorActive
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${spikeMonitorActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span className="font-bold">TRAFFIC MONITOR</span>
            </button>

            <button
              onClick={() => triggerTrafficSpike()}
              title="Simulate / Trigger a sudden network traffic spike between nodes"
              aria-label="Trigger network traffic spike"
              className="p-1.5 text-amber-300 hover:text-amber-100 hover:bg-amber-950/60 rounded-none flex items-center justify-center transition-colors cursor-pointer"
            >
              <Zap size={12} className="text-amber-400" />
            </button>

            <div className="h-5 w-px bg-[#30363d] mx-1.5" />

            <div className="flex items-center gap-1.5 text-[#777] whitespace-nowrap pointer-events-none">
              <span className="w-2 h-2 bg-cobalt-c2 rounded-full shadow-[0_0_8px_#3b82f6]" />
              TARGET: <span className="text-white font-bold">{activeNode.id}</span>
              <span className="text-[#555]">({activeNode.type})</span>
            </div>
          </div>

          {/* Row 2: Geographic lock details (geographic projection only) */}
          {projection === 'geographic' && activeNode.geo && (
            <div className="border-t border-border-c2 px-2.5 py-1.5 space-y-1 pointer-events-none">
              <div className="flex items-center gap-2">
                <Building2 size={13} className="text-cobalt-c2" />
                <span className="text-xs font-bold text-white uppercase">{activeNode.geo.name || activeNode.label}</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/80 rounded-none font-semibold">
                  GEO LOCKED
                </span>
              </div>
              {activeNode.geo.address && (
                <div className="text-[11px] text-zinc-300 font-sans font-medium flex items-center gap-1.5">
                  <MapPin size={11} className="text-rose-400 shrink-0" />
                  <span>{activeNode.geo.address}</span>
                </div>
              )}
              {activeNode.geo.district && (
                <div className="text-[10px] text-[#777]">
                  SECTOR: <span className="text-[#bbb]">{activeNode.geo.district}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mini-Map HUD fixed in bottom-left */}
      <MiniMap
        nodes={nodes}
        activeNodeId={activeNode.id}
        onSelectNode={onSelectNode}
        zoomLevel={zoomLevel}
        onZoomChange={handleZoomChange}
        onResetZoom={handleResetZoom}
        projection={projection}
        className="bottom-3 left-3"
      />
    </div>
  );
}

// ----------------------------------------------------
// DYNAMIC HOVER TOOLTIP FOR OPERATION SPHERE NODES
// ----------------------------------------------------
function OperationSphereNodeTooltip({
  info,
  onSelectNode,
}: {
  info: HoveredSphereNode;
  onSelectNode: (id: string) => void;
}) {
  const { node, health, x, y } = info;

  // Smart offset calculations to prevent edge overflow in OperationSphere container
  const offsetX = x > 380 ? -284 : 18;
  const offsetY = y > 260 ? -165 : 18;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.93, y: 4 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{
        left: `${x + offsetX}px`,
        top: `${y + offsetY}px`,
      }}
      className="absolute z-50 pointer-events-none w-72 bg-[#0c1017]/95 backdrop-blur-xl border border-blue-500/70 rounded-none shadow-[0_12px_36px_rgba(0,0,0,0.85),0_0_20px_rgba(59,130,246,0.25)] p-3 font-mono text-xs text-slate-200 select-none overflow-hidden"
    >
      {/* Decorative top health glow accent */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 transition-colors"
        style={{
          background: `linear-gradient(90deg, #3b82f6, ${health.color}, #38bdf8)`
        }} 
      />

      {/* Header: Node Name, ID, Type & Health Badge */}
      <div className="flex items-start justify-between gap-2 mb-2 pt-1 border-b border-[#21262d] pb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
              {node.type}
            </span>
            <span className="text-[9px] text-slate-500 font-mono">#{node.id}</span>
          </div>
          <h4 className="text-sm font-bold text-white tracking-tight truncate">
            {node.label}
          </h4>
        </div>

        {/* Dynamic Status Pill from Connectivity Health Metadata */}
        <div className={`px-2 py-0.5 rounded border text-[9px] font-bold flex items-center gap-1.5 shrink-0 ${health.badgeClass}`}>
          <span 
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: health.color }} 
          />
          <span>{health.label}</span>
        </div>
      </div>

      {/* Live SVG Heartbeat / EKG Telemetry Stream */}
      <div className="mb-2 bg-[#090d16] p-2 rounded-none border border-[#1e2538] flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-400 font-mono flex items-center gap-1">
            <Activity size={10} className="text-blue-400" />
            CONNECTIVITY EKG
          </span>
          <span className="text-[9px] font-mono font-bold" style={{ color: health.color }}>
            LIVE HEARTBEAT
          </span>
        </div>
        <LiveEkgWaveform health={health} width={130} height={20} />
      </div>

      {/* Current Operational Status & Latency Breakdown */}
      <div className="space-y-1.5 mb-2.5 bg-[#141824]/70 p-2 rounded-none border border-[#262c3e]/80 text-[10px]">
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400 text-[9px]">HEALTH STATUS:</span>
          <span className="font-bold flex items-center gap-1" style={{ color: health.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: health.color }} />
            {node.status} ({health.label})
          </span>
        </div>

        {node.metrics && (
          <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#212638] text-[9px]">
            {node.metrics.latency && (
              <div className="flex items-center justify-between text-slate-400">
                <span>LATENCY:</span>
                <span className="text-sky-300 font-bold">{node.metrics.latency}</span>
              </div>
            )}
            {node.metrics.load && (
              <div className="flex items-center justify-between text-slate-400">
                <span>LOAD:</span>
                <span className="text-amber-300 font-bold">{node.metrics.load}</span>
              </div>
            )}
            {node.metrics.dropped !== undefined && (
              <div className="flex items-center justify-between text-slate-400">
                <span>DROPPED:</span>
                <span className="text-rose-400 font-bold">{node.metrics.dropped}%</span>
              </div>
            )}
            {node.parentId && (
              <div className="flex items-center justify-between text-slate-400 truncate">
                <span>PARENT:</span>
                <span className="text-slate-300 font-mono truncate">{node.parentId}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Location or Address if present */}
      {node.geo?.address && (
        <div className="flex items-center gap-1 text-[9px] text-slate-400 mb-2 truncate bg-[#0f121a] px-2 py-1 rounded border border-[#1f2430]">
          <MapPin size={10} className="text-rose-400 shrink-0" />
          <span className="truncate">{node.geo.address}</span>
        </div>
      )}

      {/* Action Prompt */}
      <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-[#1f2430]">
        <span className="flex items-center gap-1 text-blue-400 font-sans">
          <MousePointerClick size={11} />
          Click to focus & inspect
        </span>
        <span className="text-[8px] text-slate-500 font-mono uppercase">{node.status}</span>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------
// DYNAMIC SVG NODE LABEL WITH ZOOM LEVEL SCALING
// ----------------------------------------------------
export function DynamicSvgNodeLabel({
  label,
  sublabel,
  zoomLevel = 1.0,
  isHighPressure = false,
  isQueryMatch = false,
  color = '#ffffff',
  className = '',
}: {
  label: string;
  sublabel?: string;
  zoomLevel?: number;
  isHighPressure?: boolean;
  isQueryMatch?: boolean;
  color?: string;
  className?: string;
}) {
  // SVG Text scale normalization: compute crisp font size that remains readable at any distance
  // Inverse scale factor dampens zoom effect so text stays legible when zoomed out
  const scaleCompensation = 1 / Math.max(0.4, Math.min(2.5, zoomLevel));
  const mainFontSize = Math.round(11 * Math.pow(scaleCompensation, 0.45));
  const subFontSize = Math.round(8.5 * Math.pow(scaleCompensation, 0.45));
  const sansFontFamily = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

  return (
    <div className={`w-full flex flex-col items-center justify-center pointer-events-none select-none ${className}`}>
      <svg 
        className="w-full overflow-visible" 
        height={sublabel ? 32 : 20} 
        viewBox="0 0 140 32"
      >
        <defs>
          <filter id={`text-shadow-${label.replace(/[^a-zA-Z0-9]/g, '')}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.9" />
          </filter>
        </defs>

        {/* Sublabel / Node Type in clean sans-serif */}
        {sublabel && (
          <text
            x="70"
            y="10"
            textAnchor="middle"
            fill={isQueryMatch ? '#38bdf8' : isHighPressure ? '#f87171' : '#60a5fa'}
            fontSize={subFontSize}
            fontFamily={sansFontFamily}
            fontWeight="600"
            letterSpacing="0.06em"
            className="uppercase tracking-wider"
            filter={`url(#text-shadow-${label.replace(/[^a-zA-Z0-9]/g, '')})`}
          >
            {sublabel.length > 20 ? sublabel.substring(0, 18) + '…' : sublabel}
          </text>
        )}

        {/* Main Node Name in clean sans-serif */}
        <text
          x="70"
          y={sublabel ? 25 : 15}
          textAnchor="middle"
          fill={isQueryMatch ? '#38bdf8' : color}
          fontSize={mainFontSize}
          fontFamily={sansFontFamily}
          fontWeight="600"
          letterSpacing="0.01em"
          filter={`url(#text-shadow-${label.replace(/[^a-zA-Z0-9]/g, '')})`}
        >
          {label.length > 18 ? label.substring(0, 16) + '…' : label}
        </text>
      </svg>
    </div>
  );
}

// ----------------------------------------------------
// BREADCRUMBS & MOVEMENT TRACE OVERLAY
// ----------------------------------------------------
export interface BreadcrumbPoint {
  x: number;
  y: number;
  timestamp: number;
}

export function BreadcrumbsTraceOverlay({
  breadcrumbs,
  zoomLevel = 1.0,
  onClear,
}: {
  breadcrumbs: Record<string, BreadcrumbPoint[]>;
  zoomLevel?: number;
  onClear?: () => void;
}) {
  const activeEntries = Object.entries(breadcrumbs).filter(([, pts]) => pts && pts.length > 1);
  if (activeEntries.length === 0) return null;

  const totalPoints = activeEntries.reduce((acc, [, pts]) => acc + pts.length, 0);

  return (
    <div className="absolute inset-0 pointer-events-none z-15 flex items-center justify-center overflow-visible">
      {/* Top Left HUD Trace Indicator */}
      <div className="absolute top-14 left-4 pointer-events-auto z-30 flex items-center gap-2 px-3 py-1.5 bg-[#0b101c]/90 border border-blue-500/50 rounded-none shadow-[0_0_20px_rgba(59,130,246,0.3)] backdrop-blur text-blue-300 font-mono text-[10px]">
        <Route size={13} className="text-blue-400 animate-pulse" />
        <span className="font-bold">MOVEMENT TRACE ACTIVE</span>
        <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-200 rounded border border-blue-400/30 text-[9px] font-bold">
          {totalPoints} BREADCRUMBS
        </span>
        {onClear && (
          <button
            onClick={onClear}
            className="ml-1 text-[8.5px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-white/10 transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        <defs>
          <linearGradient id="trace-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
          </linearGradient>
          <filter id="breadcrumb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {activeEntries.map(([nodeId, points]) => {
          if (points.length < 2) return null;

          // Build SVG path commands
          const pathSegments = points.map((p, idx) => {
            const px = `calc(50% + ${p.x * zoomLevel}px)`;
            const py = `calc(50% + ${p.y * zoomLevel}px)`;
            return `${idx === 0 ? 'M' : 'L'} ${p.x * zoomLevel} ${p.y * zoomLevel}`;
          }).join(' ');

          return (
            <g key={`trace-${nodeId}`} transform="translate(0, 0)">
              {/* Connected faint path line */}
              <g transform="translate(calc(50%), calc(50%))">
                <path
                  d={pathSegments}
                  fill="none"
                  stroke="url(#trace-gradient)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeOpacity="0.75"
                />

                {/* Render breadcrumb dots */}
                {points.map((pt, pIdx) => {
                  const isLatest = pIdx === points.length - 1;
                  const isStart = pIdx === 0;
                  const progress = (pIdx + 1) / points.length;
                  const dotOpacity = Math.max(0.25, progress * 0.95);

                  return (
                    <g key={`pt-${nodeId}-${pIdx}`}>
                      {/* Radiating pulse on latest breadcrumb point */}
                      {isLatest && (
                        <circle
                          cx={pt.x * zoomLevel}
                          cy={pt.y * zoomLevel}
                          r="7"
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="1.2"
                          strokeOpacity="0.6"
                          className="animate-ping"
                        />
                      )}
                      <circle
                        cx={pt.x * zoomLevel}
                        cy={pt.y * zoomLevel}
                        r={isLatest ? 4.5 : isStart ? 3.5 : 2.5}
                        fill={isLatest ? '#38bdf8' : isStart ? '#60a5fa' : '#06b6d4'}
                        fillOpacity={dotOpacity}
                        filter="url(#breadcrumb-glow)"
                      />
                    </g>
                  );
                })}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ----------------------------------------------------
// GHOST TRACES HISTORICAL OVERLAY LAYER
// ----------------------------------------------------
const emptySubscribe = () => () => {};

export function GhostTracesLayer({
  ghosts,
  activeNode,
  onSelectNode,
  zoomLevel = 1.0,
}: {
  ghosts: GhostNodeTrace[];
  activeNode: NodeData;
  onSelectNode: (id: string) => void;
  zoomLevel?: number;
}) {
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!ghosts || ghosts.length === 0) {
    return (
      <div className="absolute top-14 right-4 pointer-events-none z-20 font-mono text-[9px] text-cyan-500/60 bg-cyan-950/40 px-2 py-1 rounded border border-cyan-500/20 backdrop-blur">
        GHOST TRACE: NO HISTORICAL MOVEMENT RECORDED
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
      {/* Historical Ghost Overlay Badge */}
      <div className="absolute top-14 right-4 pointer-events-auto z-30 flex items-center gap-2 px-3 py-1.5 bg-[#0a1018]/90 border border-cyan-500/50 rounded-none shadow-[0_0_20px_rgba(6,182,212,0.25)] backdrop-blur text-cyan-300 font-mono text-[10px]">
        <Ghost size={13} className="text-cyan-400 animate-pulse" />
        <span className="font-bold">RECENT TRACES ACTIVE</span>
        <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-200 rounded border border-cyan-400/30 text-[9px] font-bold">
          {ghosts.length} GHOSTS
        </span>
      </div>

      {/* Render faint ghost representations */}
      {ghosts.map((ghost, index) => {
        // Calculate offset ring layout for ghosts
        const count = ghosts.length;
        const angle = ((index * (360 / count)) + 45) * (Math.PI / 180);
        const radius = 290;
        const gx = Math.sin(angle) * radius * zoomLevel;
        const gy = -Math.cos(angle) * radius * zoomLevel;

        const timeLabel = isMounted 
          ? new Date(ghost.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : '--:--:--';

        return (
          <React.Fragment key={ghost.id}>
            {/* Dashed Ethereal Trace Line from Center to Ghost */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              <line
                x1="50%"
                y1="50%"
                x2={`calc(50% + ${gx}px)`}
                y2={`calc(50% + ${gy}px)`}
                stroke="#06b6d4"
                strokeWidth="1.2"
                strokeDasharray="4 6"
                strokeOpacity="0.35"
              />
            </svg>

            {/* Ghost Node Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.72, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              whileHover={{ opacity: 1, scale: 1.05 }}
              style={{
                x: `calc(-50% + ${gx}px)`,
                y: `calc(-50% + ${gy}px)`,
                left: '50%',
                top: '50%',
              }}
              className="absolute pointer-events-auto cursor-pointer flex flex-col items-center group z-30"
              onClick={() => {
                  if (ghost.nodeId) {
                    onSelectNode(ghost.nodeId);
                  }
                }}
            >
              <div className="relative p-2.5 bg-[#06121e]/80 border border-dashed border-cyan-400/60 group-hover:border-cyan-300 rounded-none shadow-[0_0_15px_rgba(6,182,212,0.2)] backdrop-blur-md flex flex-col items-center w-36 text-center transition-all">
                {/* Ghost Icon & Reason Badge */}
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="flex items-center gap-1 text-[8px] font-mono text-cyan-400">
                    <Ghost size={10} className="text-cyan-400" />
                    <span>GHOST</span>
                  </span>
                  <span className="text-[7.5px] font-mono px-1 py-0.2 bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded uppercase">
                    {ghost.reason}
                  </span>
                </div>

                <div className="text-[10px] font-bold text-cyan-100 font-mono truncate w-full group-hover:text-white">
                  {ghost.label}
                </div>

                <div className="text-[8px] text-cyan-400/80 font-mono mt-0.5 flex items-center gap-1">
                  <History size={8} />
                  <span suppressHydrationWarning>{timeLabel}</span>
                </div>

                </div>
            </motion.div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------
// DIGITAL VIEW: SEMANTIC POLAR WITH FRAMER-MOTION ZOOM TRANSITIONS
// ----------------------------------------------------
function DigitalPolarView({
  nodes,
  activeNode,
  parentNode,
  childrenNodes,
  layoutMode = 'radial',
  zoomLevel = 1.0,
  onSelectNode,
  onHoverNode,
  onRecordBreadcrumb,
  activeSpikeNodeId,
}: {
  nodes: Record<string, NodeData>;
  activeNode: NodeData;
  parentNode: NodeData | null;
  childrenNodes: NodeData[];
  layoutMode?: DigitalLayoutMode;
  zoomLevel?: number;
  onSelectNode: (id: string) => void;
  onHoverNode: (node: NodeData | null, e?: React.MouseEvent) => void;
  onRecordBreadcrumb?: (nodeId: string, pt: { x: number; y: number }) => void;
  activeSpikeNodeId?: string | null;
}) {
  const { searchQuery, searchSelectedHaloNodeId } = useC2();
  const activeHealth = getNodeHealth(activeNode);
  const activeIsHighPressure = isNodeHighPressure(activeNode);
  const activeLoad = getNodeResourceLoad(activeNode);
  const activePriority = getNodePriority(activeNode);
  const activePriorityStyle = getNodePriorityStyling(activePriority);

  // Check if a node matches the current search query or was specifically selected via Command Bar search
  const isQueryMatch = (node: NodeData): boolean => {
    if (searchSelectedHaloNodeId && searchSelectedHaloNodeId === node.id) return true;
    if (!searchQuery || !searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    return (
      node.id.toLowerCase().includes(q) ||
      node.label.toLowerCase().includes(q) ||
      node.type.toLowerCase().includes(q) ||
      (node.description ? node.description.toLowerCase().includes(q) : false)
    );
  };

  const activeIsQueryMatch = isQueryMatch(activeNode);

  // Calculate layout node positions for DigitalDataFlowPaths
  const childrenPositions: LayoutNodePosition[] = childrenNodes.map((child, index) => {
    const count = Math.max(childrenNodes.length, 1);
    let x = 0;
    let y = 0;

    if (layoutMode === 'grid') {
      const cols = Math.ceil(Math.sqrt(count));
      const colIdx = index % cols;
      const rowIdx = Math.floor(index / cols);
      const spacing = 175;
      const totalW = (cols - 1) * spacing;
      const totalH = (Math.ceil(count / cols) - 1) * spacing;
      x = colIdx * spacing - totalW / 2;
      y = rowIdx * spacing - totalH / 2 + 130;
    } else {
      const angle = (index * (360 / count)) * (Math.PI / 180);
      const radius = 210;
      x = Math.sin(angle) * radius;
      y = -Math.cos(angle) * radius;
    }

    return {
      id: child.id,
      node: child,
      x,
      y,
      health: getNodeHealth(child),
    };
  });

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Concentric UI radar overlays */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-center justify-center">
        <motion.div 
          className="absolute w-[440px] h-[440px] rounded-full border border-cobalt-c2/10"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
        />
        <div className="absolute w-[320px] h-[320px] rounded-full border border-cobalt-c2/20" />
        <div className="absolute w-[200px] h-[200px] rounded-full border border-cobalt-c2/30" />
        <div className="absolute w-full h-px bg-cobalt-c2/10" />
        <div className="absolute h-full w-px bg-cobalt-c2/10" />
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div 
          key={activeNode.id}
          initial={{ opacity: 0, scale: 0.78 * zoomLevel, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: zoomLevel, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.25 * zoomLevel, filter: 'blur(8px)' }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full h-full flex items-center justify-center origin-center"
        >
          {/* Dynamic Data Flow Links Varying in Thickness & Opacity with Real-Time Traffic Spike Detection */}
          <DigitalDataFlowPaths
            centerNode={{ id: activeNode.id, node: activeNode, x: 0, y: 0, health: activeHealth }}
            childrenNodes={childrenPositions}
            parentNode={parentNode
              ? { id: parentNode.id, node: parentNode, x: 0, y: -300, health: getNodeHealth(parentNode) }
              : null}
            activeSpikeNodeId={activeSpikeNodeId}
          />

          {/* Parent Node Link (Zoom Out / Ascend) */}
          {parentNode && (
            <motion.div 
              className="absolute top-8 flex flex-col items-center cursor-pointer group z-20"
              onClick={() => onSelectNode(parentNode.id)}
              onMouseEnter={(e) => onHoverNode(parentNode, e)}
              onMouseMove={(e) => onHoverNode(parentNode, e)}
              onMouseLeave={() => onHoverNode(null)}
              whileHover={{ scale: 1.06, y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div className={`flex items-center gap-2 px-3 py-1 bg-[#111116] border text-[#aaa] group-hover:text-white rounded shadow-lg transition-colors mb-2 ${
                isQueryMatch(parentNode) 
                  ? 'border-cyan-400 bg-cyan-950/80 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.6)]' 
                  : 'border-[#333] group-hover:border-cobalt-c2'
              }`}>
                <ArrowUp size={14} className="text-cobalt-c2 group-hover:-translate-y-0.5 transition-transform" />
                <span className="text-[11px] uppercase tracking-wider font-bold font-mono">ASCEND: {parentNode.label}</span>
                {parentNode.pinned && (
                  <Pin size={10} className="text-amber-400 fill-amber-400" />
                )}
                {isQueryMatch(parentNode) && (
                  <span className="text-[7.5px] px-1 py-0.2 bg-cyan-500 text-black font-bold rounded font-mono animate-pulse">
                    MATCH
                  </span>
                )}
              </div>
              <div className="w-px h-10 bg-gradient-to-b from-cobalt-c2/60 to-transparent" />
            </motion.div>
          )}

          {/* Active Center Node */}
          <div className="absolute z-10 flex flex-col items-center">
            {/* Multi-Layer Distinctive Search Halo Radiant Ring Effect */}
            {activeIsQueryMatch && (
              <>
                <motion.div
                  className="absolute -inset-16 rounded-full border border-cyan-400/70 pointer-events-none z-0"
                  animate={{
                    scale: [1, 1.35, 1.6],
                    opacity: [0.95, 0.4, 0],
                  }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute -inset-10 rounded-full border-2 border-cyan-300 pointer-events-none z-0"
                  animate={{
                    scale: [1, 1.18, 1],
                    opacity: [0.95, 0.45, 0.95],
                    boxShadow: [
                      '0 0 25px rgba(6, 182, 212, 0.7), inset 0 0 20px rgba(6, 182, 212, 0.4)',
                      '0 0 60px rgba(6, 182, 212, 1), inset 0 0 35px rgba(6, 182, 212, 0.6)',
                      '0 0 25px rgba(6, 182, 212, 0.7), inset 0 0 20px rgba(6, 182, 212, 0.4)'
                    ]
                  }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                />
              </>
            )}

            {/* Subtle Pulsing SVG Heartbeat / EKG Ring Indicator */}
            <NodeHeartbeatRing 
              health={activeHealth} 
              size={236} 
              showBpmBadge={true} 
            />

            {/* Resource Load Frequency Ring Indicator providing a visual heartbeat for performance */}
            <ResourceLoadHeartbeatRing
              loadPercentage={activeLoad}
              size={254}
              className="pointer-events-none"
            />

            {/* High Pressure Pulsing Red Outer Aura Ring */}
            {activeIsHighPressure && (
              <motion.div
                className="absolute -inset-6 rounded-full border-2 border-red-500/80 pointer-events-none"
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.9, 0.3, 0.9],
                  boxShadow: [
                    '0 0 15px rgba(239, 68, 68, 0.4)',
                    '0 0 35px rgba(239, 68, 68, 0.8)',
                    '0 0 15px rgba(239, 68, 68, 0.4)'
                  ]
                }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              />
            )}

            {/* Subtle Connectivity Health Outer Rotating Ring */}
            <div 
              className="absolute -inset-3 rounded-full border border-dashed animate-spin pointer-events-none opacity-40"
              style={{ 
                borderColor: activeIsHighPressure ? '#ef4444' : activeHealth.ringColor, 
                animationDuration: activeIsHighPressure ? '8s' : '28s' 
              }} 
            />
            
            {/* Center Node Container with Priority Visual Distinction (Critical vs Routine) & Pulsing Scale Animation */}
            <motion.div 
              layoutId={`node-center-${activeNode.id}`}
              drag
              dragConstraints={{ left: -260, right: 260, top: -260, bottom: 260 }}
              dragElastic={0.12}
              onDrag={(_, info) => {
                if (onRecordBreadcrumb) {
                  onRecordBreadcrumb(activeNode.id, { x: info.offset.x, y: info.offset.y });
                }
              }}
              onClick={() => onSelectNode(activeNode.id)}
              onMouseEnter={(e) => onHoverNode(activeNode, e)}
              onMouseMove={(e) => onHoverNode(activeNode, e)}
              onMouseLeave={() => onHoverNode(null)}
              className={`relative border bg-[#0e0e14] p-5 flex flex-col items-center rounded-full cursor-grab active:cursor-grabbing hover:border-white transition-all w-44 h-44 justify-center z-10 ${
                activePriorityStyle.borderClass
              } ${
                activePriorityStyle.bgGradientClass
              } ${
                activeIsQueryMatch
                  ? 'border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.8)] ring-4 ring-cyan-400/40'
                  : activeIsHighPressure 
                    ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]' 
                    : ''
              }`}
              animate={{ 
                scale: [1, 1.035, 1],
                boxShadow: activeIsQueryMatch ? [
                  '0 0 20px rgba(6, 182, 212, 0.7)',
                  '0 0 45px rgba(6, 182, 212, 1)',
                  '0 0 20px rgba(6, 182, 212, 0.7)'
                ] : activeIsHighPressure ? [
                  '0 0 15px rgba(239, 68, 68, 0.6)', 
                  '0 0 42px rgba(239, 68, 68, 0.95)', 
                  '0 0 15px rgba(239, 68, 68, 0.6)'
                ] : activePriority === 'CRITICAL' ? [
                  '0 0 15px rgba(244, 63, 94, 0.5)',
                  '0 0 35px rgba(244, 63, 94, 0.85)',
                  '0 0 15px rgba(244, 63, 94, 0.5)'
                ] : [
                  `0 0 12px ${activeHealth.glowColor}`, 
                  `0 0 36px ${activeHealth.glowColor}`, 
                  `0 0 12px ${activeHealth.glowColor}`
                ] 
              }}
              transition={{ repeat: Infinity, duration: activeIsHighPressure ? 1.2 : 2.4, ease: "easeInOut" }}
            >
              {/* Search Query Match Badge */}
              {activeIsQueryMatch && (
                <div className="absolute -top-3 px-2 py-0.5 bg-cyan-500 text-black border border-cyan-300 rounded-full flex items-center gap-1 text-[8px] font-bold shadow-[0_0_12px_rgba(6,182,212,0.8)] font-mono z-30 animate-pulse">
                  <Search size={8} className="stroke-[3]" />
                  <span>SEARCH MATCH</span>
                </div>
              )}

              {/* Priority Distinction Badge (Critical vs Routine) */}
              {!activeIsQueryMatch && activePriority === 'CRITICAL' && (
                <div className="absolute -top-3 px-2 py-0.5 bg-rose-950/95 border border-rose-500/90 text-rose-200 rounded-full flex items-center gap-1 text-[8px] font-bold shadow-[0_0_12px_rgba(244,63,94,0.6)] font-mono z-30 animate-pulse">
                  <AlertTriangle size={8} className="text-rose-400" />
                  <span>CRITICAL NODE</span>
                </div>
              )}
              {!activeIsQueryMatch && activePriority === 'ROUTINE' && (
                <div className="absolute -top-2.5 px-2 py-0.3 bg-slate-900/90 border border-slate-700/80 text-slate-400 rounded-full flex items-center gap-1 text-[7.5px] font-mono z-20">
                  <span>ROUTINE</span>
                </div>
              )}

              {/* Pinned Marker Badge */}
              {activeNode.pinned && (
                <div 
                  title="Node position is pinned"
                  className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-950/90 border border-amber-500/80 rounded-full flex items-center gap-1 text-[8px] font-bold text-amber-300 shadow-md z-20"
                >
                  <Pin size={9} className="text-amber-400 fill-amber-400" />
                  <span>PINNED</span>
                </div>
              )}

              <Crosshair size={20} className={`${activeIsQueryMatch ? 'text-cyan-400' : activePriority === 'CRITICAL' ? 'text-rose-400' : activeIsHighPressure ? 'text-red-400' : 'text-cobalt-c2'} mb-1 opacity-90 absolute top-3`} />
              
              <div className="text-center mt-3 w-full px-2">
                {/* Dynamic SVG Text Label scaling with zoomLevel in clean sans-serif */}
                <DynamicSvgNodeLabel
                  label={activeNode.label}
                  sublabel={activeNode.type}
                  zoomLevel={zoomLevel}
                  isHighPressure={activeIsHighPressure}
                  isQueryMatch={activeIsQueryMatch}
                  color="#ffffff"
                />
                
                {/* High Pressure Alert Tag */}
                {activeIsHighPressure ? (
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-red-950/90 border border-red-500 text-red-300 text-[8.5px] font-bold rounded font-mono shadow animate-pulse">
                    <Flame size={10} className="text-red-400" />
                    <span>HIGH LOAD {activeLoad}%</span>
                  </div>
                ) : (
                  <div className={`mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 border text-white text-[9px] font-bold rounded font-mono ${activeHealth.badgeClass}`}>
                    <span 
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: activeHealth.color }}
                    />
                    {activeNode.status}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Satellite Children Nodes */}
          {childrenPositions.map(({ node: child, x, y }, index) => {
            const childHealth = getNodeHealth(child);
            const childIsHighPressure = isNodeHighPressure(child);
            const childLoad = getNodeResourceLoad(child);
            const childIsQueryMatch = isQueryMatch(child);
            const childPriority = getNodePriority(child);
            const childPriorityStyle = getNodePriorityStyling(childPriority);

            return (
              <React.Fragment key={child.id}>
                {/* Satellite Child Element */}
                <motion.div 
                  className="absolute z-10"
                  drag
                  dragConstraints={{ left: -260, right: 260, top: -260, bottom: 260 }}
                  dragElastic={0.12}
                  onDrag={(_, info) => {
                    if (onRecordBreadcrumb) {
                      onRecordBreadcrumb(child.id, { x: x + info.offset.x, y: y + info.offset.y });
                    }
                  }}
                  style={{
                    x: `calc(-50% + ${x}px)`,
                    y: `calc(-50% + ${y}px)`,
                    left: '50%',
                    top: '50%',
                  }}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, delay: 0.05 * index + 0.1 }}
                >
                  {/* Distinctive Search Query Radiant Halo around matching child node */}
                  {childIsQueryMatch && (
                    <>
                      <motion.div
                        className="absolute -inset-7 rounded-none border border-cyan-400/70 pointer-events-none z-0"
                        animate={{
                          scale: [1, 1.28, 1.5],
                          opacity: [0.9, 0.4, 0],
                        }}
                        transition={{ repeat: Infinity, duration: 1.6, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute -inset-3 rounded-none border-2 border-cyan-300 pointer-events-none z-0"
                        animate={{
                          scale: [1, 1.14, 1],
                          opacity: [0.95, 0.5, 0.95],
                          boxShadow: [
                            '0 0 18px rgba(6, 182, 212, 0.7)',
                            '0 0 42px rgba(6, 182, 212, 1)',
                            '0 0 18px rgba(6, 182, 212, 0.7)'
                          ]
                        }}
                        transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                      />
                    </>
                  )}

                  {/* Resource Load Frequency Ring on Child Node */}
                  <ResourceLoadHeartbeatRing
                    loadPercentage={childLoad}
                    size={146}
                    className="pointer-events-none"
                  />

                  <motion.div 
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      boxShadow: childIsQueryMatch ? [
                        '0 0 12px rgba(6, 182, 212, 0.8)',
                        '0 0 28px rgba(6, 182, 212, 1)',
                        '0 0 12px rgba(6, 182, 212, 0.8)'
                      ] : childIsHighPressure ? [
                        '0 0 8px rgba(239, 68, 68, 0.5)',
                        '0 0 22px rgba(239, 68, 68, 0.9)',
                        '0 0 8px rgba(239, 68, 68, 0.5)'
                      ] : childPriority === 'CRITICAL' ? [
                        '0 0 8px rgba(244, 63, 94, 0.4)',
                        '0 0 20px rgba(244, 63, 94, 0.75)',
                        '0 0 8px rgba(244, 63, 94, 0.4)'
                      ] : [
                        `0 0 5px ${childHealth.glowColor}`,
                        `0 0 16px ${childHealth.glowColor}`,
                        `0 0 5px ${childHealth.glowColor}`
                      ]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: childIsQueryMatch ? 1.4 : childIsHighPressure ? 1.2 : 3.4,
                      delay: (index % 4) * 0.4,
                      ease: "easeInOut"
                    }}
                    className={`relative border p-2.5 flex flex-col items-center hover:bg-[#181822] transition-all cursor-grab active:cursor-grabbing group w-36 text-center rounded-none overflow-hidden ${
                      childPriorityStyle.borderClass
                    } ${
                      childPriorityStyle.bgGradientClass
                    } ${
                      childIsQueryMatch
                        ? 'border-cyan-400 bg-[#081724]'
                        : childIsHighPressure 
                          ? 'border-red-500/90 bg-[#190d10]' 
                          : ''
                    }`}
                    onClick={() => onSelectNode(child.id)}
                    onMouseEnter={(e) => onHoverNode(child, e)}
                    onMouseMove={(e) => onHoverNode(child, e)}
                    onMouseLeave={() => onHoverNode(null)}
                  >
                    {/* Query Match Badge */}
                    {childIsQueryMatch && (
                      <div className="absolute top-1 left-1 px-1 py-0.2 bg-cyan-500 text-black rounded text-[7.5px] font-bold font-mono flex items-center gap-0.5 shadow-sm animate-pulse z-20">
                        <Search size={7} className="stroke-[3]" />
                        <span>MATCH</span>
                      </div>
                    )}

                    {/* Priority Indicator Badge (Critical vs Routine) */}
                    {!childIsQueryMatch && childPriority === 'CRITICAL' && (
                      <div className="absolute top-1 left-1 px-1 py-0.2 bg-rose-950/90 border border-rose-500/80 rounded text-[7px] text-rose-300 font-bold font-mono z-20 flex items-center gap-0.5 animate-pulse shadow">
                        <AlertTriangle size={7} className="text-rose-400" />
                        <span>CRIT</span>
                      </div>
                    )}
                    {!childIsQueryMatch && childPriority === 'ROUTINE' && (
                      <div className="absolute top-1 left-1 px-1 py-0.2 bg-slate-900/80 border border-slate-700/60 rounded text-[6.5px] text-slate-400 font-mono z-20">
                        <span>ROUT</span>
                      </div>
                    )}

                    {/* Pinned Marker on child */}
                    {child.pinned && (
                      <div 
                        title="Pinned Node"
                        className={`absolute top-1 ${childIsQueryMatch || childPriority ? 'left-14' : 'left-1'} px-1 py-0.2 bg-amber-950/90 border border-amber-600/80 rounded text-[7.5px] text-amber-300 font-bold flex items-center gap-0.5 z-20`}
                      >
                        <Pin size={8} className="fill-amber-400 text-amber-400" />
                      </div>
                    )}

                    {/* Subtle Pulsing SVG Heartbeat Ring / Dot on Child Node */}
                    <div className="absolute top-1.5 right-1.5 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 18 18" className="overflow-visible">
                        {/* Systolic Expanding Heartbeat Wave */}
                        <motion.circle
                          cx="9"
                          cy="9"
                          r="6"
                          fill="none"
                          stroke={childIsQueryMatch ? '#22d3ee' : childPriority === 'CRITICAL' ? '#f43f5e' : childIsHighPressure ? '#ef4444' : childHealth.color}
                          strokeWidth="1"
                          animate={{
                            scale: [0.9, 1.4, 1.7],
                            opacity: [0.8, 0.25, 0],
                          }}
                          transition={{
                            duration: childIsHighPressure ? 0.6 : childHealth.status === 'critical' ? 0.7 : childHealth.status === 'warning' ? 1.05 : 1.65,
                            repeat: Infinity,
                            ease: "easeOut",
                          }}
                          style={{ transformOrigin: "9px 9px" }}
                        />
                        {/* Center Heartbeat Core */}
                        <circle
                          cx="9"
                          cy="9"
                          r="3"
                          fill={childIsQueryMatch ? '#22d3ee' : childPriority === 'CRITICAL' ? '#f43f5e' : childIsHighPressure ? '#ef4444' : childHealth.color}
                        />
                      </svg>
                    </div>
                    
                    {/* Dynamic SVG text label scaling with zoomLevel for crisp readability at any distance */}
                    <DynamicSvgNodeLabel
                      label={child.label}
                      sublabel={child.type}
                      zoomLevel={zoomLevel}
                      isHighPressure={childIsHighPressure}
                      isQueryMatch={childIsQueryMatch}
                      color="#e0e0e0"
                      className="mt-1"
                    />
                    
                    {childIsHighPressure ? (
                      <div className="mt-1 flex items-center justify-center gap-1 text-[8.5px] font-mono text-red-400 font-bold animate-pulse">
                        <Flame size={10} />
                        <span>LOAD {childLoad}%</span>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] font-mono w-full" style={{ color: childIsQueryMatch ? '#38bdf8' : childPriority === 'CRITICAL' ? '#f43f5e' : childHealth.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: childIsQueryMatch ? '#38bdf8' : childPriority === 'CRITICAL' ? '#f43f5e' : childHealth.color }} />
                        <span className="font-bold">{childHealth.label}</span>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </React.Fragment>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------------------------
// PHYSICAL VIEW: HARDWARE RACK, POWER & COOLING
// ----------------------------------------------------
function PhysicalHardwareView({
  node,
  nodes,
  onSelectNode,
  onHoverNode,
}: {
  node: NodeData;
  nodes: Record<string, NodeData>;
  onSelectNode: (id: string) => void;
  onHoverNode: (node: NodeData | null, e?: React.MouseEvent) => void;
}) {
  const spec = node.physicalSpec || {
    hardware: "Global Unified Virtualization Node",
    power: "Redundant Dual Supply 120V/240V",
    cooling: "Optimized Dynamic Airflow",
    rackLocation: node.geo?.address || "515 NE Holladay St, Portland, OR 97232",
  };

  return (
    <div className="w-full h-full overflow-y-auto p-6 flex flex-col items-center justify-center font-mono">
      <div 
        className="w-full max-w-lg bg-[#0b0b10] border border-border-c2 rounded-none p-5 shadow-2xl space-y-4"
        onMouseEnter={(e) => onHoverNode(node, e)}
        onMouseMove={(e) => onHoverNode(node, e)}
        onMouseLeave={() => onHoverNode(null)}
      >
        {/* Hardware Header */}
        <div className="flex items-center justify-between border-b border-border-c2 pb-3">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-cobalt-c2" />
            <h3 className="text-sm font-bold text-white uppercase">{node.label} {'// CHASSIS SPEC'}</h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-bold">
            PHYSICAL OK
          </span>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#121218] border border-[#222] p-2.5 rounded-none space-y-1">
            <div className="text-[9px] text-[#666] uppercase flex items-center gap-1">
              <Cpu size={11} className="text-cobalt-c2" /> Hardware Specification
            </div>
            <div className="text-white font-semibold">{spec.hardware}</div>
          </div>

          <div className="bg-[#121218] border border-[#222] p-2.5 rounded-none space-y-1">
            <div className="text-[9px] text-[#666] uppercase flex items-center gap-1">
              <Power size={11} className="text-amber-400" /> Power Ingress
            </div>
            <div className="text-amber-300 font-semibold">{spec.power}</div>
          </div>

          <div className="bg-[#121218] border border-[#222] p-2.5 rounded-none space-y-1">
            <div className="text-[9px] text-[#666] uppercase flex items-center gap-1">
              <Flame size={11} className="text-sky-400" /> Thermal / Cooling
            </div>
            <div className="text-sky-300 font-semibold">{spec.cooling}</div>
          </div>

          <div className="bg-[#121218] border border-[#222] p-2.5 rounded-none space-y-1">
            <div className="text-[9px] text-[#666] uppercase flex items-center gap-1">
              <MapPin size={11} className="text-rose-400" /> Physical Address
            </div>
            <div className="text-zinc-300 font-semibold truncate">{spec.rackLocation}</div>
          </div>
        </div>

        {/* Chassis Rack Vector Graphic */}
        <div className="bg-[#08080c] border border-[#1f1f26] p-3 rounded-none flex flex-col gap-1.5">
          <div className="text-[9px] text-[#666] uppercase tracking-wider mb-1">CHASSIS BLADE SLOTS (4U ARRAY)</div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(slot => (
              <div key={slot} className="flex-1 bg-[#14141c] border border-[#282834] h-10 rounded flex items-center justify-between px-2 text-[8px] text-[#888]">
                <span>SLOT {slot}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// ONTOLOGY VIEW: KNOWLEDGE GRAPH & SCHEMA RELATIONSHIPS
// ----------------------------------------------------
function OntologyGraphView({
  nodes,
  activeNode,
  onSelectNode,
  onHoverNode,
}: {
  nodes: Record<string, NodeData>;
  activeNode: NodeData;
  onSelectNode: (id: string) => void;
  onHoverNode: (node: NodeData | null, e?: React.MouseEvent) => void;
}) {
  const allNodes = Object.values(nodes);

  return (
    <div className="w-full h-full overflow-y-auto p-4 font-mono">
      <div className="text-xs text-[#888] uppercase tracking-wider mb-3 flex items-center gap-2">
        <Layers size={13} className="text-cobalt-c2" />
        <span>Ontological Schema & Relationship Matrix</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {allNodes.map((n, idx) => {
          const isCurrent = n.id === activeNode.id;
          const nodeHealth = getNodeHealth(n);
          return (
            <motion.div
              key={n.id}
              onClick={() => onSelectNode(n.id)}
              onMouseEnter={(e) => onHoverNode(n, e)}
              onMouseMove={(e) => onHoverNode(n, e)}
              onMouseLeave={() => onHoverNode(null)}
              whileHover={{ scale: 1.02 }}
              animate={isCurrent ? {
                boxShadow: [
                  `0 0 8px ${nodeHealth.glowColor}`,
                  `0 0 20px ${nodeHealth.glowColor}`,
                  `0 0 8px ${nodeHealth.glowColor}`
                ]
              } : {
                boxShadow: [
                  `0 0 2px ${nodeHealth.glowColor}`,
                  `0 0 8px ${nodeHealth.glowColor}`,
                  `0 0 2px ${nodeHealth.glowColor}`
                ]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 3.5, 
                delay: (idx % 6) * 0.3, 
                ease: "easeInOut" 
              }}
              className={`p-2.5 rounded-none border cursor-pointer transition-all ${
                isCurrent
                  ? 'bg-cobalt-c2/15 border-cobalt-c2'
                  : 'bg-[#0f0f14] border-[#222] hover:border-[#444] text-[#888]'
              }`}
            >
              <div className="flex items-center justify-between text-[9px] mb-1">
                <span className="font-bold text-cobalt-c2">{n.type}</span>
                <span 
                  className={`px-1.5 py-0.2 rounded border text-[8px] font-bold flex items-center gap-1 ${nodeHealth.badgeClass}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: nodeHealth.color }} />
                  {nodeHealth.label}
                </span>
              </div>
              <div className="text-xs text-white font-bold truncate">{n.label}</div>
              <div className="text-[9px] text-[#666] mt-1 truncate">
                PARENT: {n.parentId || 'ROOT'} | CHILDREN: {n.childrenIds.length}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
