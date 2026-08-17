'use client';

import React from 'react';
import { motion } from 'motion/react';
import { NodeData } from '@/lib/ontology';
import { getNodeHealth, NodeHealthInfo, getNodeResourceLoad } from '@/lib/health';

export interface LayoutNodePosition {
  id: string;
  node: NodeData;
  x: number; // relative to center (0, 0)
  y: number; // relative to center (0, 0)
  health: NodeHealthInfo;
}

interface DigitalDataFlowPathsProps {
  centerNode: LayoutNodePosition;
  parentNode: LayoutNodePosition | null;
  childrenNodes: LayoutNodePosition[];
  siblingFlows?: boolean;
  showBandwidthTags?: boolean;
  activeSpikeNodeId?: string | null;
}

/**
 * DigitalDataFlowPaths: Renders subtle, animated SVG paths with continuous data packet
 * flow pulses between connected nodes in Digital projection mode.
 * Dynamically varies line thickness, opacity, and particle speeds based on Telemetry Load.
 * Includes real-time monitor detecting sudden network traffic spikes with a glowing 'Overload' alert state.
 */
export function DigitalDataFlowPaths({
  centerNode,
  parentNode,
  childrenNodes,
  siblingFlows = true,
  showBandwidthTags = true,
  activeSpikeNodeId,
}: DigitalDataFlowPathsProps) {
  return (
    <svg 
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0"
      style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.25))' }}
    >
      <defs>
        {/* Glow Filters */}
        <filter id="data-glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="data-glow-red" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="overload-pulse-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Dynamic Flow Gradients */}
        <linearGradient id="flow-gradient-active" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
        </linearGradient>

        <linearGradient id="flow-gradient-parent" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
        </linearGradient>

        <linearGradient id="flow-gradient-surge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
          <stop offset="30%" stopColor="#fca5a5" stopOpacity="1" />
          <stop offset="70%" stopColor="#ff0055" stopOpacity="1" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="1" />
        </linearGradient>
      </defs>

      <g transform="translate(0, 0)">
        {/* 1. Parent Node -> Center Active Node Data Flow */}
        {parentNode && (
          <ParentToCenterFlow
            parent={parentNode}
            center={centerNode}
            showBandwidthTag={showBandwidthTags}
            hasSpike={activeSpikeNodeId === parentNode.id || activeSpikeNodeId === centerNode.id}
          />
        )}

        {/* 2. Center Active Node <-> Children Satellite Nodes Data Flow */}
        {childrenNodes.map((child, idx) => (
          <CenterToChildFlow
            key={`flow-child-${child.id}`}
            center={centerNode}
            child={child}
            index={idx}
            total={childrenNodes.length}
            showBandwidthTag={showBandwidthTags}
            hasSpike={activeSpikeNodeId === child.id || activeSpikeNodeId === centerNode.id}
          />
        ))}

        {/* 3. Inter-Satellite Peer Mesh Flow Paths (Lateral data routing) */}
        {siblingFlows && childrenNodes.length > 1 && (
          <SiblingMeshFlows childrenNodes={childrenNodes} />
        )}
      </g>
    </svg>
  );
}

/**
 * Animated flow path between Parent Node and Center Active Node.
 */
function ParentToCenterFlow({
  parent,
  center,
  showBandwidthTag,
  hasSpike,
}: {
  parent: LayoutNodePosition;
  center: LayoutNodePosition;
  showBandwidthTag?: boolean;
  hasSpike?: boolean;
}) {
  const centerLoad = getNodeResourceLoad(center.node);
  const parentLoad = getNodeResourceLoad(parent.node);
  const effectiveLoad = Math.max(centerLoad, parentLoad);

  const isOverload = hasSpike || effectiveLoad >= 78;

  // Dynamic stroke thickness & opacity based on Telemetry Load
  const strokeWidth = isOverload
    ? 5.8 + ((effectiveLoad - 75) / 25) * 2.8 
    : effectiveLoad > 35 
    ? 2.4 + ((effectiveLoad - 35) / 40) * 1.8 
    : 1.5;

  const strokeOpacity = isOverload ? 1.0 : Math.min(0.95, 0.28 + (effectiveLoad / 100) * 0.65);
  const lineColor = isOverload ? '#ff0055' : effectiveLoad >= 50 ? '#f59e0b' : '#3b82f6';

  const x1 = `calc(50% + ${parent.x}px)`;
  const y1 = `calc(50% + ${parent.y + 24}px)`;
  const x2 = `calc(50% + ${center.x}px)`;
  const y2 = `calc(50% + ${center.y - 78}px)`;

  // Midpoint coordinates for bandwidth tag
  const midX = (parent.x + center.x) / 2;
  const midY = (parent.y + 24 + center.y - 78) / 2;

  return (
    <g className="parent-flow-group">
      {/* Overload Alert Glowing Back-aura */}
      {isOverload && (
        <motion.line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#ff0055"
          strokeWidth={strokeWidth * 2.2}
          strokeOpacity={0.5}
          filter="url(#overload-pulse-glow)"
          animate={{
            strokeOpacity: [0.35, 0.85, 0.35],
            strokeWidth: [strokeWidth * 1.8, strokeWidth * 2.8, strokeWidth * 1.8],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Static Sub-track with load-scaled thickness and opacity */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={lineColor}
        strokeWidth={strokeWidth * 0.65}
        strokeOpacity={strokeOpacity * 0.4}
        strokeDasharray="2 4"
      />

      {/* Animated Data Stream Line */}
      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isOverload ? "url(#flow-gradient-surge)" : "url(#flow-gradient-parent)"}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={isOverload ? "12 8" : "8 12"}
        filter={isOverload ? "url(#data-glow-red)" : undefined}
        animate={{
          strokeDashoffset: [40, 0],
          strokeOpacity: isOverload ? [0.75, 1, 0.75] : [strokeOpacity * 0.6, strokeOpacity, strokeOpacity * 0.6],
        }}
        transition={{
          strokeDashoffset: { duration: isOverload ? 0.45 : 1.8, repeat: Infinity, ease: "linear" },
          strokeOpacity: { duration: isOverload ? 0.5 : 2.2, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      {/* High-speed Photon Pulse */}
      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#ffffff"
        strokeWidth={Math.max(2.2, strokeWidth * 0.75)}
        strokeLinecap="round"
        strokeDasharray="16 100"
        animate={{
          strokeDashoffset: [130, -130],
        }}
        transition={{
          duration: isOverload ? 0.4 : 1.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ filter: `drop-shadow(0 0 6px ${lineColor})` }}
      />

      {/* Bandwidth / Overload Telemetry Tag Badge */}
      {showBandwidthTag && (
        <g transform={`translate(0, 0)`} style={{ transform: `translate(calc(50% + ${midX}px), calc(50% + ${midY}px))` }}>
          <rect
            x={isOverload ? "-56" : "-42"}
            y="-9"
            width={isOverload ? "112" : "84"}
            height="18"
            rx="4"
            fill="#080c14"
            fillOpacity="0.92"
            stroke={isOverload ? "#ff0055" : lineColor}
            strokeWidth={isOverload ? "1.4" : "0.8"}
            filter={isOverload ? "url(#data-glow-red)" : undefined}
          />
          <text
            x="0"
            y="3.5"
            textAnchor="middle"
            fill={isOverload ? "#fecdd3" : "#93c5fd"}
            fontSize={isOverload ? "8.5" : "8"}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isOverload ? `⚠ OVERLOAD · ${effectiveLoad}%` : `${(1.2 + (effectiveLoad / 100) * 8.4).toFixed(1)} Gbps · ${effectiveLoad}%`}
          </text>
        </g>
      )}
    </g>
  );
}

/**
 * Animated flow path between Center Node and each Satellite Child Node.
 */
function CenterToChildFlow({
  center,
  child,
  index,
  total,
  showBandwidthTag,
  hasSpike,
}: {
  center: LayoutNodePosition;
  child: LayoutNodePosition;
  index: number;
  total: number;
  showBandwidthTag?: boolean;
  hasSpike?: boolean;
}) {
  const centerLoad = getNodeResourceLoad(center.node);
  const childLoad = getNodeResourceLoad(child.node);
  const effectiveLoad = Math.max(centerLoad, childLoad);

  const isOverload = hasSpike || effectiveLoad >= 78;

  // Dynamic stroke thickness & opacity based on Telemetry Load
  const strokeWidth = isOverload
    ? 5.2 + ((effectiveLoad - 75) / 25) * 2.8 
    : effectiveLoad > 35 
    ? 2.2 + ((effectiveLoad - 35) / 40) * 1.8 
    : 1.4;

  const strokeOpacity = isOverload ? 1.0 : Math.min(0.95, 0.28 + (effectiveLoad / 100) * 0.65);
  const flowColor = isOverload ? '#ff0055' : effectiveLoad >= 50 ? '#f59e0b' : child.health.color;

  // Center is at (0, 0), Child is at (child.x, child.y)
  const cx = child.x * 0.45;
  const cy = child.y * 0.45;
  const perpX = -child.y * 0.08 * (index % 2 === 0 ? 1 : -1);
  const perpY = child.x * 0.08 * (index % 2 === 0 ? 1 : -1);

  const ctrlX = cx + perpX;
  const ctrlY = cy + perpY;

  // Generate SVG Path d string
  const pathD = `M calc(50% + ${center.x}px) calc(50% + ${center.y}px) Q calc(50% + ${ctrlX}px) calc(50% + ${ctrlY}px) calc(50% + ${child.x}px) calc(50% + ${child.y}px)`;

  const duration = isOverload ? 0.45 : child.health.status === 'critical' ? 0.85 : child.health.status === 'warning' ? 1.25 : 2.0;

  // Midpoint calculation for Telemetry Load pill
  const midX = (ctrlX + child.x * 0.5) * 0.6;
  const midY = (ctrlY + child.y * 0.5) * 0.6;

  return (
    <g className="center-child-flow">
      {/* Overload Alert Glowing Back-aura */}
      {isOverload && (
        <motion.path
          d={pathD}
          fill="none"
          stroke="#ff0055"
          strokeWidth={strokeWidth * 2.2}
          strokeOpacity={0.45}
          filter="url(#overload-pulse-glow)"
          animate={{
            strokeOpacity: [0.3, 0.8, 0.3],
            strokeWidth: [strokeWidth * 1.8, strokeWidth * 2.6, strokeWidth * 1.8],
          }}
          transition={{
            duration: 0.75,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* 1. Underlying ambient spline track with load-scaled thickness and opacity */}
      <path
        d={pathD}
        fill="none"
        stroke={flowColor}
        strokeWidth={strokeWidth * 0.65}
        strokeOpacity={strokeOpacity * 0.4}
      />

      {/* 2. Pulsing Data Flow Track with Dash animation scaled with load */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={isOverload ? "url(#flow-gradient-surge)" : flowColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={isOverload ? "10 8" : "6 14"}
        filter={isOverload ? "url(#data-glow-red)" : undefined}
        animate={{
          strokeDashoffset: [0, -40],
          strokeOpacity: isOverload ? [0.75, 1, 0.75] : [strokeOpacity * 0.55, strokeOpacity, strokeOpacity * 0.55],
        }}
        transition={{
          strokeDashoffset: {
            duration,
            repeat: Infinity,
            ease: "linear",
          },
          strokeOpacity: {
            duration: duration * 1.3,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      />

      {/* 3. Fast High-Intensity Photon Packet along the path */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="#ffffff"
        strokeWidth={Math.max(2.0, strokeWidth * 0.7)}
        strokeLinecap="round"
        strokeDasharray="12 140"
        animate={{
          strokeDashoffset: [170, -170],
        }}
        transition={{
          duration: duration * 1.0,
          repeat: Infinity,
          ease: "easeInOut",
          delay: (index % 3) * 0.25,
        }}
        style={{ filter: `drop-shadow(0 0 5px ${flowColor})` }}
      />

      {/* Bandwidth / Overload Alert Badge at midpoint */}
      {showBandwidthTag && (
        <g transform={`translate(0, 0)`} style={{ transform: `translate(calc(50% + ${midX}px), calc(50% + ${midY}px))` }}>
          <rect
            x={isOverload ? "-52" : "-38"}
            y="-8"
            width={isOverload ? "104" : "76"}
            height="16"
            rx="4"
            fill="#080c14"
            fillOpacity="0.92"
            stroke={isOverload ? "#ff0055" : flowColor}
            strokeWidth={isOverload ? "1.4" : "0.8"}
            filter={isOverload ? "url(#data-glow-red)" : undefined}
          />
          <text
            x="0"
            y="3"
            textAnchor="middle"
            fill={isOverload ? "#fecdd3" : "#a5f3fc"}
            fontSize={isOverload ? "8" : "7.5"}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isOverload ? `⚡ OVERLOAD ${effectiveLoad}%` : `${(0.8 + (effectiveLoad / 100) * 8.4).toFixed(1)}G · ${effectiveLoad}%`}
          </text>
        </g>
      )}
    </g>
  );
}

/**
 * Inter-satellite lateral bridges showing subtle cluster synchronization.
 */
function SiblingMeshFlows({
  childrenNodes,
}: {
  childrenNodes: LayoutNodePosition[];
}) {
  return (
    <g className="sibling-mesh-flow">
      {childrenNodes.map((child, idx) => {
        const nextChild = childrenNodes[(idx + 1) % childrenNodes.length];
        if (childrenNodes.length < 2 || idx === childrenNodes.length - 1 && childrenNodes.length > 2) return null;

        const childLoad = getNodeResourceLoad(child.node);
        const nextLoad = getNodeResourceLoad(nextChild.node);
        const meshLoad = Math.max(childLoad, nextLoad);
        const meshWidth = meshLoad > 70 ? 2.0 : 1.0;
        const meshOpacity = meshLoad > 70 ? 0.45 : 0.16;

        const pathD = `M calc(50% + ${child.x}px) calc(50% + ${child.y}px) Q calc(50% + ${(child.x + nextChild.x) * 0.35}px) calc(50% + ${(child.y + nextChild.y) * 0.35}px) calc(50% + ${nextChild.x}px) calc(50% + ${nextChild.y}px)`;

        return (
          <motion.path
            key={`mesh-${child.id}-${nextChild.id}`}
            d={pathD}
            fill="none"
            stroke={meshLoad > 70 ? "#ef4444" : "#3b82f6"}
            strokeWidth={meshWidth}
            strokeOpacity={meshOpacity}
            strokeDasharray="3 6"
            animate={{
              strokeDashoffset: [0, -18],
            }}
            transition={{
              duration: meshLoad > 70 ? 1.5 : 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        );
      })}
    </g>
  );
}
