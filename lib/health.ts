import type { NodeData } from './ontology';

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface NodeHealthInfo {
  status: HealthStatus;
  color: string;
  ringColor: string;
  glowColor: string;
  badgeClass: string;
  label: string;
  pingClass: string;
}

export interface NodeResourcePressure {
  load: number | null;
  status: 'unknown' | 'nominal' | 'elevated' | 'high';
  color: string;
  label: string;
}

export const CRITICAL_RESOURCE_LOAD_THRESHOLD = 80;

function parsePercent(value: string | number | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.min(100, value));
  if (typeof value !== 'string') return null;
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : null;
}

/** Resource pressure is independent from connectivity health. */
export function getNodeResourcePressure(node?: NodeData | null): NodeResourcePressure {
  if (!node) return { load: null, status: 'unknown', color: '#64748b', label: 'NO SIGNAL' };
  const metrics = node.metrics ?? {};
  const candidates = [metrics.resource_load, metrics.load, metrics.cpu_usage, metrics.backpressure];
  const load = candidates.map((value) => parsePercent(value)).find((value): value is number => value !== null) ?? null;
  if (load === null) return { load, status: 'unknown', color: '#64748b', label: 'UNREPORTED' };
  if (load >= 80) return { load, status: 'high', color: '#f43f5e', label: 'HIGH PRESSURE' };
  if (load >= 60) return { load, status: 'elevated', color: '#f59e0b', label: 'ELEVATED' };
  return { load, status: 'nominal', color: '#10b981', label: 'NOMINAL' };
}

export function isNodeHighPressure(node?: NodeData | null): boolean {
  return getNodeResourcePressure(node).status === 'high';
}

/**
 * Parses and computes the numeric Resource Load percentage (0 - 100) for a given node.
 * Checks metrics like resource_load, cpu_usage, load, mem_usage, backpressure, etc.
 */
export function getNodeResourceLoad(node?: NodeData | null): number {
  if (!node || !node.metrics) return 30;

  if (node.metrics.resource_load !== undefined) {
    const val = parseFloat(String(node.metrics.resource_load).replace(/[^0-9.]/g, ''));
    if (!isNaN(val)) return Math.min(100, Math.max(0, Math.round(val)));
  }

  if (node.metrics.load !== undefined) {
    const val = parseFloat(String(node.metrics.load).replace(/[^0-9.]/g, ''));
    if (!isNaN(val)) return Math.min(100, Math.max(0, Math.round(val)));
  }

  if (node.metrics.cpu_usage !== undefined) {
    const val = parseFloat(String(node.metrics.cpu_usage).replace(/[^0-9.]/g, ''));
    if (!isNaN(val)) return Math.min(100, Math.max(0, Math.round(val)));
  }

  if (node.metrics.backpressure !== undefined) {
    const val = parseFloat(String(node.metrics.backpressure).replace(/[^0-9.]/g, ''));
    if (!isNaN(val) && val > 0) return Math.min(100, Math.max(0, Math.round(val)));
  }

  if (node.metrics.mem_usage && typeof node.metrics.mem_usage === 'string' && node.metrics.mem_usage.includes('/')) {
    const parts = node.metrics.mem_usage.split('/');
    const used = parseFloat(parts[0].replace(/[^0-9.]/g, ''));
    const total = parseFloat(parts[1].replace(/[^0-9.]/g, ''));
    if (!isNaN(used) && !isNaN(total) && total > 0) {
      return Math.min(100, Math.max(0, Math.round((used / total) * 100)));
    }
  }

  // Fallback estimation
  if (node.status === 'OFFLINE') return 95;
  if (node.status === 'STANDBY') return 25;
  if (node.status === 'EXECUTING') return 84;
  if (node.status === 'FLOWING') return 62;

  return 42;
}

/**
 * Computes the connectivity health metadata for any node.
 * Green (#10b981) for healthy/online/stable/synced
 * Yellow (#f59e0b) for warning/standby/high latency
 * Red (#ef4444) for critical/offline/degraded
 */
export function getNodeHealth(node?: NodeData | null): NodeHealthInfo {
  if (!node) {
    return {
      status: 'healthy',
      color: '#10b981',
      ringColor: 'rgba(16, 185, 129, 0.7)',
      glowColor: 'rgba(16, 185, 129, 0.25)',
      badgeClass: 'text-emerald-400 bg-emerald-950/80 border-emerald-700/80',
      label: 'HEALTHY',
      pingClass: 'fill-emerald-500',
    };
  }

  const isOffline = node.status === 'OFFLINE';
  const isStandby = node.status === 'STANDBY';

  const latency = typeof node.metrics?.latency === 'string' ? parseInt(node.metrics.latency, 10) : 0;
  const dropped = typeof node.metrics?.dropped === 'number' ? node.metrics.dropped : 0;

  if (isOffline || dropped > 50) {
    return {
      status: 'critical',
      color: '#ef4444',
      ringColor: 'rgba(239, 68, 68, 0.85)',
      glowColor: 'rgba(239, 68, 68, 0.45)',
      badgeClass: 'text-red-400 bg-red-950/90 border-red-700/90',
      label: 'CRITICAL',
      pingClass: 'fill-red-500',
    };
  }

  if (isStandby || latency > 100) {
    return {
      status: 'warning',
      color: '#f59e0b',
      ringColor: 'rgba(245, 158, 11, 0.8)',
      glowColor: 'rgba(245, 158, 11, 0.35)',
      badgeClass: 'text-amber-400 bg-amber-950/80 border-amber-700/80',
      label: 'WARNING',
      pingClass: 'fill-amber-500',
    };
  }

  return {
    status: 'healthy',
    color: '#10b981',
    ringColor: 'rgba(16, 185, 129, 0.75)',
    glowColor: 'rgba(16, 185, 129, 0.25)',
    badgeClass: 'text-emerald-400 bg-emerald-950/80 border-emerald-700/80',
    label: 'HEALTHY',
    pingClass: 'fill-emerald-500',
  };
}

export interface PriorityStylingInfo {
  priority: 'CRITICAL' | 'ROUTINE';
  isCritical: boolean;
  borderClass: string;
  bgGradientClass: string;
  badgeClass: string;
  glowClass: string;
  accentColor: string;
}

/**
 * Returns visual styling parameters to distinguish Critical vs Routine nodes.
 * Critical: thicker border (2.5px), subtle crimson/rose background gradient, and glowing alert badge.
 * Routine: sleek 1px border, subtle slate/neutral background gradient, and minimalist badge.
 */
export function getNodePriorityStyling(priority: 'CRITICAL' | 'ROUTINE'): PriorityStylingInfo {
  if (priority === 'CRITICAL') {
    return {
      priority: 'CRITICAL',
      isCritical: true,
      borderClass: 'border-[2.5px] border-rose-500/80',
      bgGradientClass: 'bg-gradient-to-b from-[#240810]/95 via-[#18090f]/90 to-[#0e070e]/95',
      badgeClass: 'text-rose-300 bg-rose-950/90 border-rose-600/80 shadow-[0_0_10px_rgba(244,63,94,0.35)]',
      glowClass: 'shadow-[0_0_22px_rgba(244,63,94,0.25)]',
      accentColor: '#f43f5e',
    };
  }
  return {
    priority: 'ROUTINE',
    isCritical: false,
    borderClass: 'border border-slate-700/60',
    bgGradientClass: 'bg-gradient-to-b from-[#111622]/85 via-[#0c0f16]/90 to-[#07090e]/95',
    badgeClass: 'text-slate-400 bg-slate-900/80 border-slate-700/60',
    glowClass: '',
    accentColor: '#64748b',
  };
}

/**
 * Calculates heartbeat pulse frequency, duration, and visual feedback corresponding
 * to a node's current Resource Load metric (0% - 100%).
 * Provides a dynamic "visual heartbeat" for network performance.
 */
export function getResourceLoadHeartbeat(loadPercentage: number) {
  const clamped = Math.max(5, Math.min(100, Math.round(loadPercentage)));
  // Low load (5% - 30%): 40 - 65 BPM (cycle duration 2.2s - 1.7s, calm cyan)
  // Medium load (31% - 70%): 66 - 110 BPM (cycle duration 1.6s - 0.95s, warning amber)
  // High load (71% - 100%): 111 - 165 BPM (cycle duration 0.9s - 0.44s, critical crimson)
  const bpm = Math.round(40 + (clamped / 100) * 125);
  const duration = Math.max(0.42, 2.2 - (clamped / 100) * 1.72);
  const isCritical = clamped >= CRITICAL_RESOURCE_LOAD_THRESHOLD;
  const isWarning = clamped >= 50 && !isCritical;
  const color = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#38bdf8';
  const ringGlow = isCritical
    ? '0 0 20px rgba(239, 68, 68, 0.8), inset 0 0 12px rgba(239, 68, 68, 0.4)'
    : isWarning
    ? '0 0 14px rgba(245, 158, 11, 0.6), inset 0 0 8px rgba(245, 158, 11, 0.3)'
    : '0 0 10px rgba(56, 189, 248, 0.4), inset 0 0 6px rgba(56, 189, 248, 0.2)';

  return { bpm, duration, color, ringGlow, isCritical, isWarning, load: clamped };
}