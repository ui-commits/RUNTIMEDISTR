'use client';

import React from 'react';
import { NodeData } from '@/lib/ontology';
import { useC2 } from '@/lib/c2Context';
import { ChevronRight, ChevronDown, Database, Server, Box, Globe, Activity, X } from 'lucide-react';

interface TreeNavProps {
  nodes: Record<string, NodeData>;
  activeNodeId: string;
  onSelectNode: (id: string) => void;
  onClose?: () => void;
}

export function TreeNav({ nodes, activeNodeId, onSelectNode, onClose }: TreeNavProps) {
  const { overlayOpacity } = useC2();
  // Find roots (nodes with no parent)
  const roots = Object.values(nodes).filter(n => n.parentId === null);

  return (
    <div 
      id="c2-treenav-panel"
      className="h-full w-full flex flex-col relative overflow-hidden border border-border-c2 rounded-none shadow-2xl transition-all duration-200"
      style={{
        backgroundColor: `rgba(13, 17, 23, ${overlayOpacity})`,
        backdropFilter: `blur(${Math.max(4, overlayOpacity * 16)}px)`,
      }}
    >
      <div className="flex items-center justify-between p-3 border-b border-border-c2 shrink-0 bg-[#0d1117]/60">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-blue-400 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">GLOBAL OPERATIONS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-[#777] bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d]">v.2.1.0</span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-[#21262d] rounded transition-colors cursor-pointer"
              title="Close TreeNav (Hotkey: T)"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {roots.map(root => (
          <TreeNode 
            key={root.id} 
            nodes={nodes}
            nodeId={root.id} 
            activeNodeId={activeNodeId} 
            onSelectNode={onSelectNode} 
            level={0} 
          />
        ))}
      </div>
      <div className="p-3 border-t border-border-c2 text-[10px] text-[#555] uppercase tracking-tighter flex justify-between items-center shrink-0">
        <span>GDR ONTOLOGY: {Object.keys(nodes).length} ACTIVE NODES</span>
        <span className="text-fern-c2 font-bold animate-pulse">●</span>
      </div>
    </div>
  );
}

function TreeNode({ 
  nodes, 
  nodeId, 
  activeNodeId, 
  onSelectNode, 
  level 
}: { 
  nodes: Record<string, NodeData>;
  nodeId: string; 
  activeNodeId: string; 
  onSelectNode: (id: string) => void; 
  level: number;
}) {
  const node = nodes[nodeId];
  const isActive = activeNodeId === nodeId;
  
  const isAncestor = React.useMemo(() => {
    let current = activeNodeId;
    while (current) {
      if (current === nodeId) return true;
      current = nodes[current]?.parentId || '';
    }
    return false;
  }, [activeNodeId, nodeId, nodes]);

  const [isExpanded, setIsExpanded] = React.useState(isAncestor);
  
  const actuallyExpanded = isExpanded || isAncestor;

  if (!node) return null;

  const validChildren = (node.childrenIds || []).filter(cid => Boolean(nodes[cid]));
  const hasChildren = validChildren.length > 0;

  return (
    <div className="flex flex-col space-y-1">
      <div 
        className={`flex justify-between items-center text-[11px] border-l-2 py-1 pl-3 cursor-pointer transition-colors ${isActive ? 'border-cobalt-c2 bg-cobalt-c2/5 text-[#e0e0e0]' : 'border-[#444] opacity-70 text-[#e0e0e0] hover:opacity-100 hover:bg-white/5'}`}
        style={{ marginLeft: `${level * 14}px` }}
        onClick={() => {
          if (hasChildren) setIsExpanded(!isExpanded);
          onSelectNode(nodeId);
        }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="w-4 h-4 flex items-center justify-center opacity-70 shrink-0">
            {hasChildren ? (
              actuallyExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : (
              <span className="w-1 h-1 bg-[#666]" />
            )}
          </span>
          {React.createElement(getIconForType(node.type), { 
            size: 14, 
            className: isActive ? 'text-cobalt-c2 shrink-0' : 'text-[#888] shrink-0' 
          })}
          <span className="font-mono truncate">{node.label}</span>
        </div>
        <span className={`text-[10px] font-bold font-mono ${node.status === 'ONLINE' || node.status === 'FLOWING' || node.status === 'STABLE' || node.status === 'SYNCED' ? 'text-fern-c2' : 'text-amber-c2'}`}>
          {node.status === 'ONLINE' ? 'UP' : node.status.substring(0, 4)}
        </span>
      </div>
      {actuallyExpanded && hasChildren && (
        <div className="flex flex-col space-y-1 mt-1">
          {validChildren.map(childId => (
            <TreeNode 
              key={childId} 
              nodes={nodes}
              nodeId={childId} 
              activeNodeId={activeNodeId} 
              onSelectNode={onSelectNode} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getIconForType(type: string) {
  switch (type.toUpperCase()) {
    case 'ROOT': return Globe;
    case 'STORAGE': return Database;
    case 'RUNTIME': return Server;
    case 'PROCESS': return Activity;
    default: return Box;
  }
}
