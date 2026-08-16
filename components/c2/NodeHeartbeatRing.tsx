'use client';

import React from 'react';
import { motion } from 'motion/react';
import { NodeHealthInfo, getResourceLoadHeartbeat } from '@/lib/health';

interface NodeHeartbeatRingProps {
  health: NodeHealthInfo;
  size?: number; // Outer diameter in pixels (default: 210 for central node)
  className?: string;
  showBpmBadge?: boolean;
  bpm?: number;
  interactive?: boolean;
}

/**
 * Calculates heartbeat cycle timing based on node connectivity health.
 */
export function getHeartbeatTiming(status: 'healthy' | 'warning' | 'critical') {
  switch (status) {
    case 'critical':
      return { duration: 0.7, bpm: 138, ekgSpike: 1.8, label: 'TACHY / ARRHYTHMIA' };
    case 'warning':
      return { duration: 1.05, bpm: 104, ekgSpike: 1.4, label: 'ELEVATED' };
    case 'healthy':
    default:
      return { duration: 1.65, bpm: 68, ekgSpike: 1.0, label: 'NOMINAL SINUS' };
  }
}

/**
 * Generates a circular path with an embedded EKG P-Q-R-S-T spike complex.
 */
function generateCircularEkgPath(cx: number, cy: number, radius: number, spikeFactor = 1): string {
  // We formulate a smooth circular arc with an EKG deflection spike near the top/right quadrant
  // Angles in radians: 0 is right, PI/2 is bottom, PI is left, 3PI/2 is top.
  const r = radius;
  
  // EKG complex positioned around angle -PI/2 (top: -90 deg)
  // Let's create an SVG path that traces 360 degrees with an EKG anomaly at top
  const pathParts: string[] = [];
  
  // Start at angle 0 (3 o'clock)
  const startX = cx + r;
  const startY = cy;
  pathParts.push(`M ${startX} ${startY}`);
  
  // Sweep arc to bottom (PI/2) and to left (PI)
  pathParts.push(`A ${r} ${r} 0 0 1 ${cx} ${cy + r}`);
  pathParts.push(`A ${r} ${r} 0 0 1 ${cx - r} ${cy}`);
  
  // Sweep towards top-left (angle 1.35 * PI)
  const preEkgAngle = Math.PI * 1.32;
  const preX = cx + Math.cos(preEkgAngle) * r;
  const preY = cy + Math.sin(preEkgAngle) * r;
  pathParts.push(`A ${r} ${r} 0 0 1 ${preX} ${preY}`);
  
  // P-Wave (slight positive bump)
  const pAngle = Math.PI * 1.38;
  const pR = r + 4 * spikeFactor;
  pathParts.push(`L ${cx + Math.cos(pAngle) * pR} ${cy + Math.sin(pAngle) * pR}`);
  
  // Baseline return
  const pEndAngle = Math.PI * 1.42;
  pathParts.push(`L ${cx + Math.cos(pEndAngle) * r} ${cy + Math.sin(pEndAngle) * r}`);
  
  // Q-Wave (slight negative dip)
  const qAngle = Math.PI * 1.45;
  const qR = r - 5 * spikeFactor;
  pathParts.push(`L ${cx + Math.cos(qAngle) * qR} ${cy + Math.sin(qAngle) * qR}`);
  
  // R-Wave (sharp tall systolic spike outward)
  const rAngle = Math.PI * 1.5; // Top center
  const rR = r + 16 * spikeFactor;
  pathParts.push(`L ${cx + Math.cos(rAngle) * rR} ${cy + Math.sin(rAngle) * rR}`);
  
  // S-Wave (sharp deep downward dip inward)
  const sAngle = Math.PI * 1.54;
  const sR = r - 9 * spikeFactor;
  pathParts.push(`L ${cx + Math.cos(sAngle) * sR} ${cy + Math.sin(sAngle) * sR}`);
  
  // T-Wave (rounded recovery bump)
  const tAngle = Math.PI * 1.62;
  const tR = r + 6 * spikeFactor;
  pathParts.push(`L ${cx + Math.cos(tAngle) * tR} ${cy + Math.sin(tAngle) * tR}`);
  
  // Return to normal circular radius
  const postEkgAngle = Math.PI * 1.68;
  pathParts.push(`L ${cx + Math.cos(postEkgAngle) * r} ${cy + Math.sin(postEkgAngle) * r}`);
  
  // Close arc back to starting point (angle 2*PI / 0)
  pathParts.push(`A ${r} ${r} 0 0 1 ${startX} ${startY}`);
  
  return pathParts.join(' ');
}

/**
 * NodeHeartbeatRing: An HTML/SVG wrapper that creates a subtle, rhythmic
 * heartbeat/EKG pulsing ring around any focal or satellite node in .OperationSphere.
 */
export function NodeHeartbeatRing({
  health,
  size = 220,
  className = '',
  showBpmBadge = false,
  bpm: customBpm,
}: NodeHeartbeatRingProps) {
  const timing = getHeartbeatTiming(health.status);
  const bpm = customBpm || timing.bpm;
  const cx = size / 2;
  const cy = size / 2;
  const baseRadius = (size / 2) - 14;
  
  const ekgPath = generateCircularEkgPath(cx, cy, baseRadius, timing.ekgSpike);

  return (
    <div 
      className={`absolute inset-0 pointer-events-none flex items-center justify-center ${className}`}
      style={{ width: size, height: size, margin: 'auto' }}
    >
      <svg 
        viewBox={`0 0 ${size} ${size}`} 
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Subtle Radial Glow Gradient */}
          <radialGradient id={`ekg-glow-${health.status}`} cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor={health.color} stopOpacity="0" />
            <stop offset="90%" stopColor={health.color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={health.color} stopOpacity="0.4" />
          </radialGradient>

          {/* Heartbeat pulse glow filter */}
          <filter id={`glow-filter-${health.status}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Concentric Expanding Systolic Pulse Wave (Heartbeat Ripple) */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={baseRadius}
          fill="none"
          stroke={health.color}
          strokeWidth="1.2"
          initial={{ scale: 0.95, opacity: 0.7 }}
          animate={{
            scale: [0.98, 1.14, 1.2],
            opacity: [0.65, 0.2, 0],
          }}
          transition={{
            duration: timing.duration,
            repeat: Infinity,
            ease: "easeOut",
            times: [0, 0.4, 1],
          }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* 2. Static Subtle Grid Track */}
        <circle
          cx={cx}
          cy={cy}
          r={baseRadius}
          fill="none"
          stroke={health.color}
          strokeWidth="1"
          strokeOpacity="0.22"
          strokeDasharray="2 6"
        />

        {/* 3. Outer Heartbeat Ring with Embedded EKG Spike Complex */}
        <motion.path
          d={ekgPath}
          fill="none"
          stroke={health.color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#glow-filter-${health.status})`}
          animate={{
            strokeOpacity: [0.45, 0.95, 0.55, 0.9, 0.45],
            scale: [1, 1.025, 0.99, 1.035, 1],
          }}
          transition={{
            duration: timing.duration,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.2, 0.35, 0.5, 1],
          }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* 4. Scanning Oscilloscope Pulse Tracer along the EKG Waveform */}
        <motion.path
          d={ekgPath}
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray={`24 ${baseRadius * 5.8}`}
          animate={{
            strokeDashoffset: [0, -baseRadius * 6.28],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            strokeDashoffset: {
              duration: timing.duration * 2,
              repeat: Infinity,
              ease: "linear",
            },
            opacity: {
              duration: timing.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }
          }}
        />

        {/* 5. Cardiac Rhythm Tick Marks (North, South, East, West) */}
        {[0, 90, 180, 270].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = cx + Math.cos(rad) * (baseRadius - 4);
          const y1 = cy + Math.sin(rad) * (baseRadius - 4);
          const x2 = cx + Math.cos(rad) * (baseRadius + 4);
          const y2 = cy + Math.sin(rad) * (baseRadius + 4);
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={health.color}
              strokeWidth="1.2"
              strokeOpacity="0.4"
            />
          );
        })}
      </svg>

      {/* Optional Heart Rate / Telemetry Badge */}
      {showBpmBadge && (
        <div 
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-0.5 bg-[#0b0f17]/90 border border-slate-700/80 rounded-full font-mono text-[9px] shadow-lg"
          style={{ borderColor: health.ringColor }}
        >
          <motion.span 
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: health.color }}
            animate={{ scale: [1, 1.4, 0.9, 1.5, 1] }}
            transition={{ duration: timing.duration, repeat: Infinity, times: [0, 0.2, 0.35, 0.5, 1] }}
          />
          <span className="text-slate-300 font-bold">{bpm} BPM</span>
          <span className="text-[8px] text-slate-400 font-mono">LIVE</span>
        </div>
      )}
    </div>
  );
}

/**
 * SvgMapHeartbeatPin: A pure SVG component to render the pulsing heartbeat / EKG ring 
 * directly at any node coordinate (cx, cy) inside SVG maps (e.g., GeoMapOverlay).
 */
export function SvgMapHeartbeatPin({
  cx,
  cy,
  radius = 20,
  health,
}: {
  cx: number;
  cy: number;
  radius?: number;
  health: NodeHealthInfo;
}) {
  const timing = getHeartbeatTiming(health.status);
  const r = radius;

  // Mini EKG Wave snippet at the top of the SVG pin ring
  const ekgSnippetPath = `
    M ${cx - r * 0.7} ${cy - r * 0.7}
    L ${cx - r * 0.3} ${cy - r * 0.7}
    L ${cx - r * 0.15} ${cy - r * 1.15}
    L ${cx + r * 0.05} ${cy - r * 0.3}
    L ${cx + r * 0.25} ${cy - r * 0.85}
    L ${cx + r * 0.4} ${cy - r * 0.7}
    L ${cx + r * 0.7} ${cy - r * 0.7}
  `;

  return (
    <g className="pointer-events-none select-none">
      {/* Expanding Systolic Heartbeat Wavefront */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={health.color}
        strokeWidth="1.2"
        initial={{ scale: 0.9, opacity: 0.7 }}
        animate={{
          scale: [0.95, 1.35, 1.55],
          opacity: [0.7, 0.2, 0],
        }}
        transition={{
          duration: timing.duration,
          repeat: Infinity,
          ease: "easeOut",
          times: [0, 0.45, 1],
        }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Pulsing Base Ring */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={health.color}
        strokeWidth="1.4"
        strokeOpacity="0.75"
        strokeDasharray="4 3"
        animate={{
          scale: [1, 1.05, 0.98, 1.07, 1],
          strokeOpacity: [0.5, 0.9, 0.6, 0.95, 0.5],
        }}
        transition={{
          duration: timing.duration,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.2, 0.35, 0.5, 1],
        }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Mini SVG EKG Pulse Trace Segment */}
      <motion.path
        d={ekgSnippetPath}
        fill="none"
        stroke={health.color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{
          strokeOpacity: [0.3, 1, 0.3],
          filter: [
            `drop-shadow(0 0 1px ${health.color})`,
            `drop-shadow(0 0 5px ${health.color})`,
            `drop-shadow(0 0 1px ${health.color})`
          ]
        }}
        transition={{
          duration: timing.duration,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </g>
  );
}

/**
 * LiveEkgWaveform: A mini real-time horizontal EKG sparkline strip.
 */
export function LiveEkgWaveform({
  health,
  width = 110,
  height = 22,
  className = '',
}: {
  health: NodeHealthInfo;
  width?: number;
  height?: number;
  className?: string;
}) {
  const timing = getHeartbeatTiming(health.status);
  const midY = height / 2;
  const spikeH = (height * 0.42) * timing.ekgSpike;

  // Authentic EKG horizontal wave path with P, Q, R, S, T complex
  const wavePath = `
    M 0 ${midY}
    L 20 ${midY}
    L 26 ${midY - 2.5}
    L 32 ${midY}
    L 38 ${midY}
    L 42 ${midY + 3.5}
    L 48 ${midY - spikeH}
    L 54 ${midY + spikeH * 0.6}
    L 59 ${midY}
    L 66 ${midY}
    L 73 ${midY - 4}
    L 80 ${midY}
    L ${width} ${midY}
  `;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Background baseline */}
        <line x1="0" y1={midY} x2={width} y2={midY} stroke={health.color} strokeWidth="1" strokeOpacity="0.2" strokeDasharray="2 3" />
        
        {/* Static faint wave */}
        <path
          d={wavePath}
          fill="none"
          stroke={health.color}
          strokeWidth="1.2"
          strokeOpacity="0.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Animated glowing scanning wave trace */}
        <motion.path
          d={wavePath}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`18 ${width}`}
          animate={{
            strokeDashoffset: [width * 1.2, -width * 0.2],
          }}
          transition={{
            duration: timing.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </svg>
    </div>
  );
}

/**
 * ResourceLoadHeartbeatRing: Renders a dynamic pulsing ring indicator directly around 
 * a node with pulse frequency and glow intensity responding to its 'Resource Load' metric.
 */
export function ResourceLoadHeartbeatRing({
  loadPercentage,
  size = 54,
  className = '',
}: {
  loadPercentage: number;
  size?: number;
  className?: string;
}) {
  const { duration, color, isCritical, isWarning } = getResourceLoadHeartbeat(loadPercentage);
  const cx = size / 2;
  const cy = size / 2;
  const radius = Math.max(10, (size / 2) - 4);

  return (
    <div
      className={`absolute inset-0 pointer-events-none flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
        {/* Subtle Expanding Ripple Wave */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          initial={{ scale: 0.95, opacity: 0.7 }}
          animate={{
            scale: [0.95, isCritical ? 1.45 : isWarning ? 1.28 : 1.16],
            opacity: [0.7, 0.2, 0],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: "easeOut",
          }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Outer Pulsing Load Ring */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={isCritical ? 2.2 : 1.5}
          strokeDasharray={isCritical ? undefined : isWarning ? "4 2" : "3 3"}
          animate={{
            scale: [1, 1.06, 0.98, 1.07, 1],
            strokeOpacity: isCritical ? [0.65, 1, 0.75, 1, 0.65] : [0.45, 0.85, 0.5, 0.9, 0.45],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.2, 0.35, 0.5, 1],
          }}
          style={{
            transformOrigin: `${cx}px ${cy}px`,
          }}
        />

        {/* Small systolic rhythm node indicator */}
        <motion.circle
          cx={cx}
          cy={cy - radius}
          r={isCritical ? 2.5 : 1.8}
          fill={color}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: `${cx}px ${cy - radius}px` }}
        />
      </svg>
    </div>
  );
}
