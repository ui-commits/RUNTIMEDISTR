'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { NodeData } from '@/lib/ontology';
import { 
  Clock, 
  Globe, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Radio, 
  Sun, 
  Moon, 
  Sparkles, 
  Activity,
  Layers,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TimeSyncOverlayProps {
  activeNode: NodeData;
}

interface ZoneInfo {
  id: string;
  name: string;
  code: string;
  timeZone: string;
  region: string;
  offsetLabel: string;
  flag: string;
  associatedNodeIds: string[];
}

const GLOBAL_ZONES: ZoneInfo[] = [
  {
    id: 'utc',
    name: 'Coordinated Universal Time',
    code: 'UTC (ZULU)',
    timeZone: 'UTC',
    region: 'GDR Master Clock / Planetary Orbit',
    offsetLabel: '+00:00',
    flag: '🌐',
    associatedNodeIds: ['earth'],
  },
  {
    id: 'pt',
    name: 'Pacific Standard / Daylight',
    code: 'US PACIFIC (PT)',
    timeZone: 'America/Los_Angeles',
    region: 'Portland // 515 NE Holladay // Cascadia',
    offsetLabel: '-07:00',
    flag: '🌲',
    associatedNodeIds: ['pdx', 'apt', 'ws', 'dev_env', 'infra', 'repos', 'pnw', 'na'],
  },
  {
    id: 'et',
    name: 'Eastern Standard / Daylight',
    code: 'US EASTERN (ET)',
    timeZone: 'America/New_York',
    region: 'New York Metro // Atlantic Backbone',
    offsetLabel: '-04:00',
    flag: '🗽',
    associatedNodeIds: ['east'],
  },
  {
    id: 'gmt',
    name: 'British / Western European',
    code: 'EUROPE (LON/CET)',
    timeZone: 'Europe/London',
    region: 'EMEA Command // London / Frankfurt',
    offsetLabel: '+01:00',
    flag: '🏛️',
    associatedNodeIds: ['eu'],
  },
  {
    id: 'jst',
    name: 'Japan Standard Time',
    code: 'ASIA PACIFIC (JST)',
    timeZone: 'Asia/Tokyo',
    region: 'APAC Gateway // Tokyo / Singapore',
    offsetLabel: '+09:00',
    flag: '🗼',
    associatedNodeIds: ['as'],
  },
];

const timeSubscribers = new Set<() => void>();
let currentTime = new Date();
let timerStarted = false;

function subscribeTime(callback: () => void) {
  timeSubscribers.add(callback);
  if (!timerStarted && typeof window !== 'undefined') {
    timerStarted = true;
    setInterval(() => {
      currentTime = new Date();
      timeSubscribers.forEach(cb => cb());
    }, 100);
  }
  return () => {
    timeSubscribers.delete(callback);
  };
}

export function TimeSyncOverlay({ activeNode }: TimeSyncOverlayProps) {
  const now = React.useSyncExternalStore(
    subscribeTime,
    () => currentTime,
    () => null
  );

  const [isExpanded, setIsExpanded] = useState(false);
  const [showMillis, setShowMillis] = useState(true);
  const [use24Hour, setUse24Hour] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [driftMs, setDriftMs] = useState<number>(0.12);

  useEffect(() => {
    // Minor simulated jitter in NTP drift
    const jitterInterval = setInterval(() => {
      setDriftMs(Number((0.08 + Math.random() * 0.15).toFixed(3)));
    }, 3000);

    return () => {
      clearInterval(jitterInterval);
    };
  }, []);

  // Determine which zone is primary for the currently active node
  const activeZoneId = useMemo(() => {
    if (!activeNode) return 'pt';
    const found = GLOBAL_ZONES.find(z => z.associatedNodeIds.includes(activeNode.id));
    if (found) return found.id;
    // Fallback based on node labels or parent
    if (activeNode.parentId === 'pdx' || activeNode.parentId === 'apt' || activeNode.parentId === 'pnw') return 'pt';
    if (activeNode.id === 'na') return 'pt';
    if (activeNode.id === 'east') return 'et';
    if (activeNode.id === 'eu') return 'gmt';
    if (activeNode.id === 'as') return 'jst';
    return 'pt';
  }, [activeNode]);

  const activeZone = GLOBAL_ZONES.find(z => z.id === activeZoneId) || GLOBAL_ZONES[1];

  const formatZoneTime = (date: Date | null, timeZone: string) => {
    if (!date) return { timeStr: '--:--:--', dateStr: '----/--/--', isDay: true, hours: 0, millis: '000' };

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: !use24Hour,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        weekday: 'short',
      });

      // Get 24-hour hour for daylight determination
      const hour24Formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        hour: 'numeric',
      });

      const timeStr = formatter.format(date);
      const dateStr = dateFormatter.format(date);
      const hours = parseInt(hour24Formatter.format(date), 10);
      const isDay = hours >= 6 && hours < 18;
      const millis = String(date.getMilliseconds()).padStart(3, '0');

      return { timeStr, dateStr, isDay, hours, millis };
    } catch {
      return { timeStr: date.toISOString().slice(11, 19), dateStr: date.toISOString().slice(0, 10), isDay: true, hours: 12, millis: '000' };
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const activeFormatted = formatZoneTime(now, activeZone.timeZone);

  return (
    <div id="c2-global-time-sync-overlay" className="relative z-30 font-mono text-xs select-none">
      {/* Top Header Pill Trigger / Mini Clock Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 bg-[#161b22]/95 hover:bg-[#21262d] border border-[#30363d] hover:border-slate-500 rounded-none px-2.5 py-1 text-slate-200 transition-all cursor-pointer shadow-sm group"
        title="Click to expand synchronized global multi-zone time matrix"
      >
        {/* Sync Pulse Light */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Clock size={13} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
        </div>

        {/* Active Node Time */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1">
            {activeFormatted.isDay ? (
              <Sun size={11} className="text-amber-400 shrink-0" />
            ) : (
              <Moon size={11} className="text-indigo-300 shrink-0" />
            )}
            <span className="text-[9px] text-indigo-300 uppercase font-semibold">
              {activeZone.id === 'pt' ? 'PDX' : activeZone.code.split(' ')[0]}
            </span>
          </div>
          <span className="text-emerald-400 font-bold tabular-nums text-[11px]">
            {activeFormatted.timeStr}
          </span>
          {showMillis && (
            <span className="text-[9px] text-slate-500 tabular-nums">
              .{activeFormatted.millis.slice(0, 2)}
            </span>
          )}
        </div>

        {/* Expand / Collapse Indicator */}
        <div className="text-slate-400 group-hover:text-white pl-0.5">
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
      </div>

      {/* Expanded Multi-Zone Synchronized Overlay Popover */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop click dismiss */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsExpanded(false)} 
            />
            
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-[#161b22]/98 backdrop-blur-2xl border border-[#30363d] rounded-none shadow-2xl p-3 z-50 text-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#30363d]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-none bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                    <Radio size={13} className="text-indigo-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                      <span>Global Time Synchronization</span>
                      <span className="text-[9px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.2 rounded font-semibold">
                        LOCKED
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      NTP Stratum-1 Reference // Jitter: ±{driftMs}ms
                    </div>
                  </div>
                </div>

                {/* Micro Toggle Controls */}
                <div className="flex items-center gap-1 bg-[#0d1117] p-0.5 border border-[#30363d] rounded text-[10px]">
                  <button
                    onClick={() => setUse24Hour(!use24Hour)}
                    className={`px-1.5 py-0.5 rounded transition-colors ${use24Hour ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                    title="Toggle 24-hour vs 12-hour format"
                  >
                    24H
                  </button>
                  <button
                    onClick={() => setShowMillis(!showMillis)}
                    className={`px-1.5 py-0.5 rounded transition-colors ${showMillis ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                    title="Toggle millisecond precision"
                  >
                    .ms
                  </button>
                </div>
              </div>

              {/* Master Epoch & ISO Timestamp Banner */}
              <div className="bg-[#0d1117] border border-[#30363d] rounded-none p-2 mb-2.5 flex items-center justify-between text-[10px]">
                <div className="space-y-0.5 overflow-hidden">
                  <div className="text-slate-400 text-[9px] uppercase font-bold flex items-center gap-1">
                    <Zap size={10} className="text-amber-400" />
                    <span>UNIX Epoch Timestamp</span>
                  </div>
                  <div className="text-white font-bold tabular-nums truncate text-xs">
                    {now ? now.getTime() : '----------------'}
                  </div>
                </div>

                <button
                  onClick={() => handleCopy(now ? now.toISOString() : '', 'iso')}
                  className="flex items-center gap-1 px-2 py-1 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded text-[10px] text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Copy ISO-8601 Timestamp"
                >
                  {copiedKey === 'iso' ? (
                    <>
                      <Check size={11} className="text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span>ISO-8601</span>
                    </>
                  )}
                </button>
              </div>

              {/* Synchronized Zone Cards */}
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-0.5">
                {GLOBAL_ZONES.map((zone) => {
                  const formatted = formatZoneTime(now, zone.timeZone);
                  const isNodePrimary = zone.id === activeZoneId;

                  return (
                    <div
                      key={zone.id}
                      className={`p-2 rounded-none border transition-all ${
                        isNodePrimary
                          ? 'bg-indigo-950/40 border-indigo-500/70 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                          : 'bg-[#0d1117]/80 border-[#30363d] hover:bg-[#161b22] hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="text-sm select-none">{zone.flag}</span>
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-[11px] truncate">{zone.code}</span>
                              {isNodePrimary && (
                                <span className="text-[8px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/50 px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                                  ACTIVE TARGET
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-400 truncate">
                              {zone.region}
                            </div>
                          </div>
                        </div>

                        {/* Synchronized Time Display */}
                        <div className="text-right shrink-0 pl-2">
                          <div className="flex items-center justify-end gap-1">
                            {formatted.isDay ? (
                              <Sun size={11} className="text-amber-400" />
                            ) : (
                              <Moon size={11} className="text-indigo-300" />
                            )}
                            <span className={`font-bold tabular-nums text-xs ${isNodePrimary ? 'text-emerald-400' : 'text-slate-100'}`}>
                              {formatted.timeStr}
                            </span>
                            {showMillis && (
                              <span className="text-[9px] text-slate-400 tabular-nums">
                                .{formatted.millis}
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono">
                            {formatted.dateStr} <span className="text-slate-400">({zone.offsetLabel})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer Target Association */}
              <div className="mt-2.5 pt-2 border-t border-[#30363d] flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate">Target: <strong className="text-white">{activeNode.label}</strong> ({activeZone.code.split(' ')[0]})</span>
                </div>
                <span className="text-indigo-400 font-semibold shrink-0">GPS // UTC LOCKED</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
