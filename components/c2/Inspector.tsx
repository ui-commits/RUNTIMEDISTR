'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { NodeData, NodeArtifact } from '@/lib/ontology';
import { useC2 } from '@/lib/c2Context';
import { getNodeResourceLoad, isNodeHighPressure } from '@/lib/health';
import { 
  Terminal, 
  Database, 
  Activity, 
  BarChart2, 
  Camera, 
  Download, 
  Trash2, 
  Maximize2, 
  X,
  Image as ImageIcon,
  Clock,
  Pin,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Flame,
  Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';

interface InspectorProps {
  activeNode: NodeData;
  onCaptureSnapshot?: () => void;
  onClose?: () => void;
}

interface ChartDataPoint {
  name: string;
  fullName: string;
  value: number;
  displayValue: string;
  category: 'health' | 'utilization' | 'throughput' | 'general';
  fill: string;
}

export interface TelemetryLogItem {
  id: string;
  timestamp: string;
  type: 'CPU_SPIKE' | 'RAM_ALLOC' | 'PKT_TRANSFER' | 'IO_BURST' | 'THERMAL_SPIKE' | 'ACTOR_DISPATCH' | 'GC_CYCLE';
  level: 'info' | 'warn' | 'spike' | 'critical';
  metricDelta: string;
  message: string;
  loadSnapshot: number;
}

const emptySubscribe = () => () => {};

export function Inspector({ activeNode, onCaptureSnapshot, onClose }: InspectorProps) {
  const { deleteNodeArtifact, toggleNodePin, setNodeResourceLoad, overlayOpacity } = useC2();
  const [activeTab, setActiveTab] = useState<'overview' | 'artifacts' | 'trace'>('overview');
  const [chartMode, setChartMode] = useState<'metrics' | 'health'>('metrics');
  const [selectedArtifact, setSelectedArtifact] = useState<NodeArtifact | null>(null);

  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const artifacts = activeNode?.artifacts || [];
  const resourceLoad = getNodeResourceLoad(activeNode);
  const isHighLoad = isNodeHighPressure(activeNode);

  // Parse and normalize metrics into structured numerical data for Recharts
  const parsedChartData = useMemo(() => {
    if (!activeNode || !activeNode.metrics) return [];

    if (chartMode === 'health') {
      const isOnline = activeNode.status === 'ONLINE' || activeNode.status === 'SYNCED' || activeNode.status === 'FLOWING' || activeNode.status === 'STABLE';
      const baseHealth = isOnline ? 94 : activeNode.status === 'STANDBY' ? 68 : 32;
      
      let latencyScore = 90;
      if (activeNode.metrics.latency) {
        const ms = parseFloat(String(activeNode.metrics.latency).replace(/[^0-9.]/g, '')) || 20;
        latencyScore = Math.max(20, Math.min(99, Math.round(100 - (ms / 150) * 80)));
      }

      const loadScore = getNodeResourceLoad(activeNode);
      const secWarnings = activeNode.logs.filter(l => l.includes('[SEC]') || l.includes('Anomaly') || l.includes('FAULT') || l.includes('HIGH PRESSURE')).length;
      const stabilityScore = Math.max(30, 98 - secWarnings * 15);

      return [
        {
          name: 'CONN',
          fullName: 'Connectivity Health',
          value: latencyScore,
          displayValue: `${latencyScore}%`,
          category: 'health' as const,
          fill: latencyScore > 75 ? '#10b981' : latencyScore > 50 ? '#f59e0b' : '#ef4444',
        },
        {
          name: 'STAB',
          fullName: 'Node Stability',
          value: stabilityScore,
          displayValue: `${stabilityScore}%`,
          category: 'health' as const,
          fill: stabilityScore > 80 ? '#3b82f6' : '#f59e0b',
        },
        {
          name: 'LOAD',
          fullName: 'Resource Load',
          value: Math.round(loadScore),
          displayValue: `${Math.round(loadScore)}%`,
          category: 'utilization' as const,
          fill: loadScore >= 80 ? '#ef4444' : loadScore > 50 ? '#f59e0b' : '#38bdf8',
        },
        {
          name: 'AVAIL',
          fullName: 'Uptime Reliability',
          value: baseHealth,
          displayValue: `${baseHealth}%`,
          category: 'health' as const,
          fill: baseHealth > 80 ? '#10b981' : '#f59e0b',
        },
      ];
    }

    const entries = Object.entries(activeNode.metrics);
    if (entries.length === 0) return [];

    return entries.map(([key, rawValue]) => {
      const strVal = String(rawValue);
      let numVal = 0;
      
      if (strVal.includes('%')) {
        numVal = parseFloat(strVal.replace(/[^0-9.]/g, '')) || 0;
      } else if (strVal.includes('GB') && strVal.includes('/')) {
        const parts = strVal.split('/');
        const used = parseFloat(parts[0]?.replace(/[^0-9.]/g, '') || '1');
        const total = parseFloat(parts[1]?.replace(/[^0-9.]/g, '') || '1');
        numVal = Math.round((used / total) * 100);
      } else if (strVal.includes('ms')) {
        numVal = parseFloat(strVal.replace(/[^0-9.]/g, '')) || 0;
      } else if (strVal.includes('kW') || strVal.includes('Gbps') || strVal.includes('MB')) {
        numVal = parseFloat(strVal.replace(/[^0-9.]/g, '')) || 0;
      } else {
        const parsed = parseFloat(strVal);
        numVal = isNaN(parsed) ? (key.length * 12) % 100 : parsed;
      }

      const shortName = key
        .split('_')
        .map(w => w.slice(0, 3).toUpperCase())
        .join('')
        .slice(0, 5);

      const isHigh = numVal > 75;
      const isWarn = key.includes('latency') ? numVal > 50 : key.includes('cpu') || key.includes('load') ? numVal >= 80 : false;
      const fill = isWarn ? '#ef4444' : isHigh ? '#f59e0b' : '#10b981';

      return {
        name: shortName,
        fullName: key.replace(/_/g, ' ').toUpperCase(),
        value: numVal,
        displayValue: strVal,
        category: 'general' as const,
        fill,
      };
    });
  }, [activeNode, chartMode]);

  return (
    <div 
      id="c2-inspector-panel"
      className="h-full w-full flex flex-col text-sm border-l border-border-c2 transition-all duration-200"
      style={{
        backgroundColor: `rgba(13, 17, 23, ${overlayOpacity})`,
        backdropFilter: `blur(${Math.max(4, overlayOpacity * 16)}px)`,
      }}
    >
      {/* Header */}
      <div className="p-3 border-b border-border-c2 shrink-0 bg-[#0d1117]/60">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Node Metadata</h2>
          <div className="flex items-center gap-1.5">
            {/* Pin Toggle Button */}
            <button
              onClick={() => toggleNodePin(activeNode.id)}
              title={activeNode.pinned ? "Unpin Node (Allow physics forces)" : "Pin Node in current coordinate (Prevents movement)"}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeNode.pinned
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.35)]'
                  : 'bg-[#161b22] text-slate-400 border border-[#30363d] hover:text-white hover:border-slate-500'
              }`}
            >
              <Pin size={11} className={activeNode.pinned ? "fill-amber-400 text-amber-400" : "text-slate-400"} />
              <span>{activeNode.pinned ? 'PINNED' : 'PIN'}</span>
            </button>

            <span className="text-[10px] font-mono text-slate-500 uppercase">ID: {activeNode.id}</span>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white hover:bg-[#21262d] rounded transition-colors cursor-pointer"
                title="Close Inspector (Hotkey: I)"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

         <div className="text-[11px] font-mono text-white flex items-center justify-between border-l-2 border-blue-500 pl-3 py-1 bg-blue-500/10 rounded-r-none">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-blue-400" />
            <span>INSPECTOR MATRIX</span>
          </div>
          
          {/* EKG Status Indicator + High Load Warning */}
          <div className="flex items-center gap-1.5">
            {isHighLoad && (
              <span className="px-1.5 py-0.5 bg-red-950 text-red-400 border border-red-800 rounded text-[8.5px] font-mono font-bold flex items-center gap-1 animate-pulse">
                <Flame size={10} className="text-red-400" />
                HIGH LOAD
              </span>
            )}
            <div className="flex items-center gap-2 bg-[#09090c] border border-border-c2/80 px-2 py-0.5 rounded">
              <div className="flex flex-col text-[8px] font-mono leading-none">
                <span className={`font-bold ${activeNode.status === 'ONLINE' || activeNode.status === 'SYNCED' || activeNode.status === 'FLOWING' || activeNode.status === 'STABLE' ? (isHighLoad ? 'text-red-400' : 'text-emerald-400') : activeNode.status === 'STANDBY' ? 'text-amber-400' : 'text-red-400'}`}>
                  {activeNode.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 mt-2.5 bg-[#161b22] p-1 rounded-none border border-[#30363d] text-[10px] font-mono">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-1 rounded font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity size={11} />
            <span>Telemetry</span>
          </button>
          
          <button
            onClick={() => setActiveTab('artifacts')}
            className={`py-1 rounded font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'artifacts'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera size={11} />
            <span>Artifacts</span>
            {artifacts.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-900 text-blue-300 text-[9px] flex items-center justify-center">
                {artifacts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('trace')}
            className={`py-1 rounded font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'trace'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal size={11} />
            <span>Trace</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4">
        {activeTab === 'overview' && (
          <>
            {/* Node Identity & Coordinate Pinning */}
            <section>
              <div className="flex items-center justify-between mb-2 text-slate-400 border-b border-border-c2 pb-1">
                <div className="flex items-center gap-1.5">
                  <Database size={13} className="text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-widest">Entity Details</span>
                </div>
                {onCaptureSnapshot && (
                  <button
                    onClick={onCaptureSnapshot}
                    className="flex items-center gap-1 text-[10px] text-blue-300 bg-blue-950/80 hover:bg-blue-900 border border-blue-700/80 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    <Camera size={10} />
                    <span>Snapshot [S]</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#111115] border border-border-c2 p-2 rounded">
                  <div className="text-[9px] text-slate-400 uppercase mb-0.5 font-mono">Node ID</div>
                  <div className="font-mono text-xs text-blue-400 font-semibold truncate">{activeNode.id}</div>
                </div>
                <div className="bg-[#111115] border border-border-c2 p-2 rounded">
                  <div className="text-[9px] text-slate-400 uppercase mb-0.5 font-mono">Node Class</div>
                  <div className="text-xs text-white uppercase font-mono truncate">{activeNode.type}</div>
                </div>

                {/* Coordinate Pin Toggle Card */}
                <div className="bg-[#111115] border border-border-c2 p-2 rounded col-span-2 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] text-slate-400 uppercase mb-0.5 font-mono">Physics Anchor Status</div>
                    <div className="font-mono text-xs text-white flex items-center gap-1.5">
                      <Pin size={12} className={activeNode.pinned ? "text-amber-400 fill-amber-400" : "text-slate-500"} />
                      <span className={activeNode.pinned ? "text-amber-300 font-bold" : "text-slate-400"}>
                        {activeNode.pinned ? 'PINNED (Fixed Coordinate)' : 'DYNAMIC (Physics-active)'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleNodePin(activeNode.id)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activeNode.pinned
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    <Pin size={10} className={activeNode.pinned ? "fill-white" : ""} />
                    <span>{activeNode.pinned ? 'Unpin' : 'Pin to Coordinates'}</span>
                  </button>
                </div>
              </div>
              {activeNode.description && (
                <div className="mt-2 p-2 bg-[#0d0d10] border border-border-c2 rounded text-xs text-slate-300 leading-relaxed">
                  {activeNode.description}
                </div>
              )}
            </section>

            {/* Real-time Telemetry Scrolling Log Widget */}
            <TelemetryLogWidget
              activeNode={activeNode}
              resourceLoad={resourceLoad}
              isHighLoad={isHighLoad}
              onSetLoad={(val) => setNodeResourceLoad(activeNode.id, val)}
            />

            {/* Recharts Mini-Bar Chart Visualization */}
            <section className="bg-[#0b0b0e] border border-border-c2 rounded-none p-3">
              <div className="flex items-center justify-between mb-2 border-b border-border-c2/60 pb-1.5">
                <div className="flex items-center gap-1.5 text-white font-mono text-xs">
                  <BarChart2 size={13} className="text-blue-400" />
                  <span className="font-bold tracking-wider uppercase text-[11px]">Telemetry Visualizer</span>
                </div>
                
                {/* Chart Mode Toggle */}
                <div className="flex items-center space-x-1 bg-[#151518] p-0.5 border border-border-c2 rounded text-[9px] font-mono">
                  <button
                    onClick={() => setChartMode('metrics')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      chartMode === 'metrics'
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Metrics
                  </button>
                  <button
                    onClick={() => setChartMode('health')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      chartMode === 'health'
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Health
                  </button>
                </div>
              </div>

              {/* Recharts Bar Chart Container */}
              <div className="w-full h-32 relative">
                {mounted && parsedChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={parsedChartData as unknown[]}
                      margin={{ top: 8, right: 8, left: -24, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="2 2" stroke="#1f1f24" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#555"
                        fontSize={9}
                        tickLine={false}
                        axisLine={{ stroke: '#222' }}
                      />
                      <YAxis
                        stroke="#555"
                        fontSize={8}
                        tickLine={false}
                        axisLine={{ stroke: '#222' }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as ChartDataPoint;
                            return (
                              <div className="bg-[#121216] border border-border-c2 p-2 rounded shadow-xl font-mono text-[10px] space-y-1">
                                <div className="text-slate-400 uppercase text-[9px]">{data.fullName}</div>
                                <div className="text-white font-bold flex items-center justify-between gap-3">
                                  <span>Raw Value:</span>
                                  <span className="text-blue-400">{data.displayValue}</span>
                                </div>
                                <div className="text-slate-400 flex items-center justify-between gap-3">
                                  <span>Scale Index:</span>
                                  <span>{data.value}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={28}>
                        {parsedChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-500 font-mono">
                    {mounted ? 'No metrics available to graph.' : 'Initializing graph render...'}
                  </div>
                )}
              </div>
            </section>

            {/* Real-time Metrics Matrix */}
            <section>
              <div className="flex items-center justify-between mb-2 text-slate-400 border-b border-border-c2 pb-1">
                <div className="flex items-center gap-2">
                  <Activity size={13} className="text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-widest">Live Telemetry Matrix</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500">LOAD: {resourceLoad}%</span>
              </div>
              {Object.keys(activeNode.metrics).length > 0 ? (
                <div className="space-y-2 mt-2">
                  {Object.entries(activeNode.metrics).map(([key, value], i) => (
                    <div key={key} className="bg-[#111115] border border-border-c2/70 p-2 rounded">
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-slate-400 uppercase font-mono">{key.replace(/_/g, ' ')}</span>
                        <span className={`font-mono font-bold ${key.includes('load') || key.includes('cpu') ? (parseFloat(String(value)) >= 80 ? 'text-red-400' : 'text-emerald-400') : 'text-emerald-400'}`}>{value}</span>
                      </div>
                      <div className="w-full bg-[#1a1a1c] h-1 rounded overflow-hidden">
                        <div
                          className={`h-full rounded ${key.includes('load') || key.includes('cpu') ? (parseFloat(String(value)) >= 80 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-gradient-to-r from-blue-500 to-emerald-400') : 'bg-gradient-to-r from-blue-500 to-emerald-400'}`}
                          style={{ width: `${Math.min(100, Math.max(15, (i * 23 + key.length * 17) % 55 + 35))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic mt-2">No telemetry data points available.</div>
              )}
            </section>
          </>
        )}

        {/* Artifacts Tab: Visual Snapshots saved in Node Metadata */}
        {activeTab === 'artifacts' && (
          <section className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3 text-slate-400 border-b border-border-c2 pb-1.5">
              <div className="flex items-center gap-2">
                <ImageIcon size={14} className="text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-widest">Node Artifacts</span>
              </div>
              {onCaptureSnapshot && (
                <button
                  onClick={onCaptureSnapshot}
                  className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1 rounded transition-colors font-mono font-semibold shadow cursor-pointer"
                >
                  <Camera size={12} />
                  <span>Capture New</span>
                </button>
              )}
            </div>

            {artifacts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border border-dashed border-[#30363d] rounded-none bg-[#0d1117]/50 font-mono">
                <div className="w-10 h-10 rounded-full bg-blue-950/60 border border-blue-800/80 flex items-center justify-center text-blue-400 mb-2">
                  <Camera size={20} />
                </div>
                <div className="text-xs font-bold text-slate-200 mb-1">No Visual Artifacts Saved</div>
                <p className="text-[11px] text-slate-400 max-w-[220px] mb-3">
                  Capture a high-res snapshot of the current projection view to attach it directly to this node.
                </p>
                {onCaptureSnapshot && (
                  <button
                    onClick={onCaptureSnapshot}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera size={12} />
                    <span>Capture Snapshot [S]</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                  <span>{artifacts.length} CAPTURED ARTIFACT{artifacts.length > 1 ? 'S' : ''}</span>
                  <span className="text-emerald-400">PERSISTED IN METADATA</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {artifacts.map((art) => (
                    <div
                      key={art.id}
                      className="group bg-[#161b22] border border-[#30363d] rounded-none overflow-hidden shadow hover:border-blue-500 transition-all font-mono"
                    >
                      {/* Image Thumbnail Preview */}
                      <div 
                        onClick={() => setSelectedArtifact(art)}
                        className="relative aspect-video w-full bg-[#0a0d14] overflow-hidden cursor-pointer flex items-center justify-center group-hover:opacity-95"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={art.previewDataUrl}
                          alt={art.label}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded flex items-center gap-1 shadow">
                            <Maximize2 size={10} /> Expand
                          </span>
                        </div>

                        {/* Projection Badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 backdrop-blur border border-white/10 rounded text-[9px] font-bold uppercase text-blue-300">
                          {art.projection}
                        </div>
                      </div>

                      {/* Info & Action Buttons */}
                      <div className="p-2.5 flex items-center justify-between gap-2 border-t border-[#30363d]">
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-200 truncate">{art.label}</div>
                          <div className="text-[9px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Clock size={10} />
                            <span>{art.timestamp}</span>
                            <span>•</span>
                            <span>{art.dimensions || '1280x720'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={art.previewDataUrl}
                            download={`c2_snapshot_${activeNode.id}_${art.projection}_${art.id}.png`}
                            title="Download PNG Artifact"
                            className="p-1.5 bg-[#21262d] hover:bg-blue-600 text-slate-300 hover:text-white rounded transition-colors"
                          >
                            <Download size={13} />
                          </a>
                          <button
                            onClick={() => deleteNodeArtifact(activeNode.id, art.id)}
                            title="Purge Artifact"
                            className="p-1.5 bg-[#21262d] hover:bg-red-600 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Trace Tab */}
        {activeTab === 'trace' && (
          <section className="flex-1 flex flex-col min-h-[220px]">
            <div className="flex items-center gap-2 mb-2 text-slate-400 border-b border-border-c2 pb-1">
              <Terminal size={13} className="text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-widest">Execution Trace</span>
            </div>
            <div className="flex-1 bg-[#09090b] border border-[#222] p-2.5 overflow-y-auto text-[10px] font-mono rounded mt-1 space-y-1">
              {activeNode.logs.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {activeNode.logs.map((log, i) => (
                    <motion.div 
                      key={`${activeNode.id}-${i}`}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="text-slate-300 leading-relaxed"
                    >
                      <span className="text-slate-500 mr-1.5 select-none">{new Date().toISOString().split('T')[1].slice(0, 8)}</span>
                      <span className={log.includes('[SEC]') || log.includes('[SYS]') ? 'text-amber-300/90' : log.includes('[HIGH PRESSURE]') ? 'text-red-400 font-bold' : 'text-slate-200'}>{log}</span>
                    </motion.div>
                  ))}
                  <div className="animate-pulse text-blue-400 mt-1">_</div>
                </div>
              ) : (
                <div className="text-slate-500">Awaiting event stream...</div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Fullscreen Artifact Lightbox Modal */}
      <AnimatePresence>
        {selectedArtifact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-[#161b22] border border-[#30363d] rounded-none overflow-hidden shadow-2xl flex flex-col font-mono"
            >
              {/* Lightbox Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#0d1117] border-b border-[#30363d]">
                <div className="flex items-center gap-2">
                  <Camera size={16} className="text-blue-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white truncate">{selectedArtifact.label}</h3>
                    <div className="text-[10px] text-slate-400">{selectedArtifact.timestamp} • {selectedArtifact.dimensions}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={selectedArtifact.previewDataUrl}
                    download={`c2_snapshot_${selectedArtifact.nodeId}_${selectedArtifact.projection}.png`}
                    className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-colors"
                  >
                    <Download size={13} />
                    <span>Download PNG</span>
                  </a>
                  <button
                    onClick={() => setSelectedArtifact(null)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-[#21262d] rounded transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Lightbox Image Preview */}
              <div className="p-4 bg-[#090d14] flex items-center justify-center max-h-[70vh] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedArtifact.previewDataUrl}
                  alt={selectedArtifact.label}
                  className="max-h-full max-w-full rounded border border-[#30363d] shadow-2xl object-contain"
                />
              </div>

              {/* Lightbox Footer */}
              <div className="px-4 py-2.5 bg-[#0d1117] border-t border-[#30363d] flex items-center justify-between text-xs text-slate-400">
                <span>Node ID: <strong className="text-white">{selectedArtifact.nodeId}</strong></span>
                <span>Projection: <strong className="text-blue-400 uppercase">{selectedArtifact.projection}</strong></span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const createInitialLogs = (node: NodeData, isHigh: boolean): TelemetryLogItem[] => {
  const initial: TelemetryLogItem[] = [];
  const now = Date.now();
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now - i * 2200);
    const timeStr = `${d.toTimeString().split(' ')[0]}.${String(d.getMilliseconds()).padStart(3, '0')}`;
    initial.push({
      id: `evt_init_${node.id}_${i}`,
      timestamp: timeStr,
      type: i === 1 && isHigh ? 'CPU_SPIKE' : i % 2 === 0 ? 'PKT_TRANSFER' : 'RAM_ALLOC',
      level: i === 1 && isHigh ? 'critical' : 'info',
      metricDelta: i === 1 && isHigh ? '+22.4%' : `${(1.2 + i * 0.4).toFixed(1)} Gbps`,
      message: i === 1 && isHigh
        ? `[HIGH PRESSURE] Resource load surge detected on ${node.label}`
        : `Live telemetry channel synchronized for ${node.label}`,
      loadSnapshot: isHigh ? 88 : 38 + i * 4,
    });
  }
  return initial;
};

// ----------------------------------------------------
// REAL-TIME TELEMETRY LOG WIDGET COMPONENT
// ----------------------------------------------------
function TelemetryLogWidget({
  activeNode,
  resourceLoad,
  isHighLoad,
  onSetLoad,
}: {
  activeNode: NodeData;
  resourceLoad: number;
  isHighLoad: boolean;
  onSetLoad: (load: number) => void;
}) {
  const [logs, setLogs] = useState<TelemetryLogItem[]>(() => createInitialLogs(activeNode, isHighLoad));
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevNodeIdRef = useRef<string>(activeNode.id);

  // Generate a random realistic telemetry event tailored to the active node
  const generateTelemetryEvent = useCallback((customSpike = false): TelemetryLogItem => {
    const now = new Date();
    const timeStr = `${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}`;
    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    if (customSpike || (isHighLoad && Math.random() > 0.4)) {
      const cpuVal = 85 + Math.round(Math.random() * 14);
      return {
        id,
        timestamp: timeStr,
        type: 'CPU_SPIKE',
        level: 'critical',
        metricDelta: `+${(Math.random() * 18 + 8).toFixed(1)}%`,
        message: `High Pressure CPU Surge on core #${Math.floor(Math.random() * 16)} (${cpuVal}% util). Dynamic throttling active.`,
        loadSnapshot: cpuVal,
      };
    }

    const eventTypes: TelemetryLogItem['type'][] = [
      'PKT_TRANSFER',
      'RAM_ALLOC',
      'CPU_SPIKE',
      'IO_BURST',
      'THERMAL_SPIKE',
      'ACTOR_DISPATCH',
      'GC_CYCLE',
    ];
    const pickedType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    switch (pickedType) {
      case 'PKT_TRANSFER': {
        const speed = (Math.random() * 2.8 + 0.4).toFixed(2);
        return {
          id,
          timestamp: timeStr,
          type: 'PKT_TRANSFER',
          level: 'info',
          metricDelta: `${speed} Gbps`,
          message: `Optical stream routing ${Math.floor(Math.random() * 450 + 120)} pkts/s to peer cluster`,
          loadSnapshot: resourceLoad,
        };
      }
      case 'RAM_ALLOC': {
        const delta = (Math.random() * 2.4 + 0.2).toFixed(1);
        return {
          id,
          timestamp: timeStr,
          type: 'RAM_ALLOC',
          level: 'info',
          metricDelta: `+${delta} GB`,
          message: `Buffer pool expanded. Committed working set heap balanced.`,
          loadSnapshot: resourceLoad,
        };
      }
      case 'CPU_SPIKE': {
        const delta = (Math.random() * 12 + 4).toFixed(1);
        const isSpike = Math.random() > 0.6;
        return {
          id,
          timestamp: timeStr,
          type: 'CPU_SPIKE',
          level: isSpike ? 'warn' : 'info',
          metricDelta: `+${delta}%`,
          message: `Thread compute burst on instruction engine worker #${Math.floor(Math.random() * 8)}`,
          loadSnapshot: Math.min(99, resourceLoad + 5),
        };
      }
      case 'IO_BURST': {
        const iops = Math.floor(Math.random() * 45000 + 12000);
        return {
          id,
          timestamp: timeStr,
          type: 'IO_BURST',
          level: 'info',
          metricDelta: `${(iops / 1000).toFixed(1)}k IOPS`,
          message: `Direct memory NVMe DMA read finished @ 0.3ms latency`,
          loadSnapshot: resourceLoad,
        };
      }
      case 'THERMAL_SPIKE': {
        const deltaTemp = (Math.random() * 1.8 + 0.4).toFixed(1);
        return {
          id,
          timestamp: timeStr,
          type: 'THERMAL_SPIKE',
          level: 'warn',
          metricDelta: `+${deltaTemp}°C`,
          message: `Chassis temperature delta regulated via active airflow controllers`,
          loadSnapshot: resourceLoad,
        };
      }
      case 'ACTOR_DISPATCH': {
        const count = Math.floor(Math.random() * 2400 + 400);
        return {
          id,
          timestamp: timeStr,
          type: 'ACTOR_DISPATCH',
          level: 'info',
          metricDelta: `${count} msgs`,
          message: `Supervised actor mailbox batch drained with 0 packet drops`,
          loadSnapshot: resourceLoad,
        };
      }
      case 'GC_CYCLE':
      default: {
        const freed = Math.floor(Math.random() * 320 + 40);
        return {
          id,
          timestamp: timeStr,
          type: 'GC_CYCLE',
          level: 'info',
          metricDelta: `-${freed} MB`,
          message: `Minor garbage collector cycle reclaimed heap memory`,
          loadSnapshot: Math.max(10, resourceLoad - 4),
        };
      }
    }
  }, [isHighLoad, resourceLoad]);

  // Seed initial log entries on node change if node ID changed
  useEffect(() => {
    if (prevNodeIdRef.current !== activeNode.id) {
      prevNodeIdRef.current = activeNode.id;
      setLogs(createInitialLogs(activeNode, isHighLoad));
    }
  }, [activeNode, isHighLoad]);

  // Periodic telemetry event generator
  useEffect(() => {
    if (!isStreaming) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const newEvt = generateTelemetryEvent();
      setLogs((prev) => [newEvt, ...prev].slice(0, 40));
    }, 2100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isStreaming, generateTelemetryEvent]);

  // Auto-scroll when new items arrive
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  const handleSimulateLoadSpike = () => {
    const spikeLoad = isHighLoad ? 38 : 92;
    onSetLoad(spikeLoad);
    const spikeEvt = generateTelemetryEvent(spikeLoad >= 80);
    setLogs((prev) => [spikeEvt, ...prev]);
  };

  const filteredLogs = useMemo(() => {
    if (filterType === 'ALL') return logs;
    if (filterType === 'SPIKES') return logs.filter(l => l.level === 'spike' || l.level === 'critical' || l.type === 'CPU_SPIKE');
    if (filterType === 'NETWORK') return logs.filter(l => l.type === 'PKT_TRANSFER');
    if (filterType === 'MEMORY') return logs.filter(l => l.type === 'RAM_ALLOC' || l.type === 'GC_CYCLE');
    return logs;
  }, [logs, filterType]);

  const getBadgeStyle = (level: TelemetryLogItem['level']) => {
    switch (level) {
      case 'critical':
        return 'bg-red-950/90 text-red-400 border-red-700/90 shadow-[0_0_8px_rgba(239,68,68,0.4)] font-bold';
      case 'spike':
      case 'warn':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/80 font-bold';
      case 'info':
      default:
        return 'bg-sky-950/60 text-sky-300 border-sky-800/60';
    }
  };

  return (
    <section className="bg-[#0b0d13] border border-border-c2 rounded-none overflow-hidden font-mono text-xs shadow-lg">
      {/* Widget Header */}
      <div className="p-2.5 bg-[#121622] border-b border-border-c2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio size={13} className="text-emerald-400 animate-pulse" />
          <span className="font-bold text-white tracking-wider text-[11px] uppercase">
            Telemetry Log Stream
          </span>
          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            LIVE
          </span>
        </div>

        {/* Action Controls: Pause, Spike, Clear */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            title={isStreaming ? "Pause Live Stream" : "Resume Live Stream"}
            className={`p-1 rounded text-[10px] transition-colors cursor-pointer ${
              isStreaming 
                ? 'bg-[#1b2233] text-emerald-300 hover:bg-[#253047]' 
                : 'bg-amber-950 text-amber-300 border border-amber-800'
            }`}
          >
            {isStreaming ? <Pause size={11} /> : <Play size={11} />}
          </button>

          <button
            onClick={handleSimulateLoadSpike}
            title={isHighLoad ? "Normalize Load (<50%)" : "Simulate Heavy Load Spike (>80%)"}
            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              isHighLoad
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
                : 'bg-red-950 text-red-300 border border-red-700 hover:bg-red-900 shadow-[0_0_10px_rgba(239,68,68,0.35)]'
            }`}
          >
            <Flame size={10} className={isHighLoad ? "text-emerald-400" : "text-red-400 animate-pulse"} />
            <span>{isHighLoad ? 'Normalize' : 'Spike Load'}</span>
          </button>

          <button
            onClick={() => setLogs([])}
            title="Clear Stream Log"
            className="p-1 text-slate-400 hover:text-white hover:bg-[#1b2233] rounded transition-colors cursor-pointer"
          >
            <RotateCcw size={11} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-2.5 py-1.5 bg-[#0e111a] border-b border-[#1d2232] flex items-center justify-between text-[9px]">
        <div className="flex items-center gap-1">
          {['ALL', 'SPIKES', 'NETWORK', 'MEMORY'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                filterType === t 
                  ? 'bg-blue-600 text-white font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`text-[9px] cursor-pointer flex items-center gap-1 ${
            autoScroll ? 'text-blue-400 font-bold' : 'text-slate-500'
          }`}
        >
          <span>Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Scrolling Telemetry Event Feed */}
      <div 
        ref={scrollContainerRef}
        className="max-h-56 min-h-[140px] overflow-y-auto p-2 space-y-1.5 divide-y divide-[#171b29]"
      >
        <AnimatePresence initial={false}>
          {filteredLogs.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="pt-1.5 first:pt-0"
            >
              <div className="flex items-center justify-between gap-1 text-[9.5px]">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-slate-500 font-mono text-[8.5px] select-none">
                    {item.timestamp}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded border text-[8px] uppercase tracking-wider ${getBadgeStyle(item.level)}`}>
                    {item.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className={`font-bold font-mono text-[9px] shrink-0 ${
                  item.level === 'critical' ? 'text-red-400' : item.level === 'spike' || item.level === 'warn' ? 'text-amber-300' : 'text-emerald-400'
                }`}>
                  {item.metricDelta}
                </span>
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5 leading-tight truncate">
                {item.message}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredLogs.length === 0 && (
          <div className="py-6 text-center text-[10px] text-slate-500 font-mono italic">
            No telemetry events matching filter. Streaming active...
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="p-1.5 bg-[#090b10] border-t border-[#1a1e2d] flex items-center justify-between text-[8.5px] text-slate-400 font-mono">
        <div className="flex items-center gap-1.5">
          <Zap size={10} className={isHighLoad ? "text-red-400" : "text-blue-400"} />
          <span>CURRENT NODE LOAD:</span>
          <span className={`font-bold ${isHighLoad ? "text-red-400 animate-pulse" : "text-emerald-400"}`}>
            {resourceLoad}% {isHighLoad ? '(HIGH PRESSURE)' : '(NORMAL)'}
          </span>
        </div>
        <span>{filteredLogs.length} events logged</span>
      </div>
    </section>
  );
}
