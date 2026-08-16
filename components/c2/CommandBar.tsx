'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useC2 } from '@/lib/c2Context';
import { ProjectionMode } from '@/lib/projections';
import { 
  Search, 
  Globe, 
  Network, 
  Cpu, 
  Layers, 
  FolderTree, 
  Activity, 
  Terminal, 
  Camera, 
  Sliders, 
  RotateCcw, 
  CornerDownLeft, 
  X,
  MapPin,
  Sparkles,
  Command
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommandBarProps {
  currentProjection: ProjectionMode;
  onSelectProjection: (projection: ProjectionMode) => void;
  onCaptureSnapshot?: () => void;
  onToggleTree?: () => void;
  onToggleInspector?: () => void;
  onToggleTerminal?: () => void;
}

interface CommandItem {
  id: string;
  category: 'NODES' | 'PROJECTIONS' | 'ACTIONS';
  title: string;
  subtitle?: string;
  badge?: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string;
}

export function CommandBar({
  currentProjection,
  onSelectProjection,
  onCaptureSnapshot,
  onToggleTree,
  onToggleInspector,
  onToggleTerminal,
}: CommandBarProps) {
  const { 
    nodes, 
    activeNodeId, 
    selectNode, 
    commandBarOpen, 
    setCommandBarOpen, 
    resetNodes,
    setKeyMapOpen,
    overlayOpacity,
    setOverlayOpacity,
    searchQuery,
    setSearchQuery,
    triggerSearchSelectionHalo,
    clearSearchSelectionHalo,
  } = useC2();

   const closeCommandBar = useCallback(() => {
     setCommandBarOpen(false);
     clearSearchSelectionHalo();
   }, [setCommandBarOpen, clearSearchSelectionHalo]);

  const query = searchQuery || '';
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (commandBarOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [commandBarOpen]);

  // Build command palette items
  const allCommands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    // 1. Projections
    const projectionsList: { id: ProjectionMode; title: string; desc: string; icon: React.ElementType }[] = [
      { id: 'knowledge', title: 'Knowledge Space Map Projection', desc: 'Interactive domain continents (Recovery, Projects, Research, Infra...) & zoom', icon: Sparkles },
      { id: 'geographic', title: 'Geographic Intel Projection', desc: 'Vector cartography, satellite tile overlay, coordinates', icon: Globe },
      { id: 'digital', title: 'Digital Graph Projection', desc: 'Semantic polar radar, node topology & telemetry links', icon: Network },
      { id: 'physical', title: 'Physical Hardware Rack Projection', desc: 'Server chassis, blade slots, thermal & power spec', icon: Cpu },
      { id: 'ontology', title: 'Ontology Matrix Projection', desc: 'Hierarchical schema cards & relational models', icon: Layers },
    ];

    projectionsList.forEach((p) => {
      list.push({
        id: `proj-${p.id}`,
        category: 'PROJECTIONS',
        title: p.title,
        subtitle: p.desc,
        badge: currentProjection === p.id ? 'ACTIVE' : undefined,
        icon: p.icon,
        keywords: `projection switch change view mode ${p.id} ${p.title}`,
        action: () => {
          onSelectProjection(p.id);
          closeCommandBar();
        },
      });
    });

    // 2. Nodes
    Object.values(nodes).forEach((n) => {
      const isTarget = activeNodeId === n.id;
      list.push({
        id: `node-${n.id}`,
        category: 'NODES',
        title: n.label,
        subtitle: n.geo?.address || n.description || `Node Type: ${n.type} • Status: ${n.status}`,
        badge: isTarget ? 'CURRENT' : n.type,
        icon: n.geo?.address ? MapPin : Globe,
        keywords: `node ${n.id} ${n.label} ${n.type} ${n.status} ${n.geo?.address || ''} ${n.geo?.name || ''} ${n.description || ''}`,
        action: () => {
          selectNode(n.id);
          triggerSearchSelectionHalo(n.id);
          closeCommandBar();
        },
      });
    });

    // 3. System Actions
    if (onCaptureSnapshot) {
      list.push({
        id: 'action-snapshot',
        category: 'ACTIONS',
        title: 'Capture Canvas Visual Snapshot',
        subtitle: 'Save instant rendered view to active node metadata artifacts',
        badge: 'KEY [S]',
        icon: Camera,
        keywords: 'snapshot capture photo image artifact camera export screenshot',
        action: () => {
          closeCommandBar();
          onCaptureSnapshot();
        },
      });
    }

    if (onToggleTree) {
      list.push({
        id: 'action-tree',
        category: 'ACTIONS',
        title: 'Toggle Hierarchy TreeNav',
        subtitle: 'Open or close the left global operations file explorer',
        badge: 'KEY [T]',
        icon: FolderTree,
        keywords: 'tree hierarchy explorer left panel files',
        action: () => {
          onToggleTree();
          closeCommandBar();
        },
      });
    }

    if (onToggleInspector) {
      list.push({
        id: 'action-inspector',
        category: 'ACTIONS',
        title: 'Toggle Telemetry Inspector',
        subtitle: 'Open or close the node metadata & telemetry inspector panel',
        badge: 'KEY [I]',
        icon: Activity,
        keywords: 'inspector telemetry metadata metrics right panel',
        action: () => {
          onToggleInspector();
          closeCommandBar();
        },
      });
    }

    if (onToggleTerminal) {
      list.push({
        id: 'action-terminal',
        category: 'ACTIONS',
        title: 'Toggle Natural Language Terminal',
        subtitle: 'Open or close the bottom AI execution chatbox',
        badge: 'KEY [C]',
        icon: Terminal,
        keywords: 'terminal chat console cli gemini ai agent prompt',
        action: () => {
          onToggleTerminal();
          closeCommandBar();
        },
      });
    }

    list.push({
      id: 'action-opacity-toggle',
      category: 'ACTIONS',
      title: 'Cycle UI Overlay Opacity',
      subtitle: `Current: ${Math.round(overlayOpacity * 100)}% (See-through canvas mode)`,
      badge: 'OPACITY',
      icon: Sliders,
      keywords: 'opacity transparent see through see-through background blur overlay',
      action: () => {
        const next = overlayOpacity >= 0.9 ? 0.45 : overlayOpacity >= 0.6 ? 0.92 : 0.7;
        setOverlayOpacity(next);
        closeCommandBar();
      },
    });

    list.push({
      id: 'action-keymap',
      category: 'ACTIONS',
      title: 'Show Keyboard Shortcuts Guide',
      subtitle: 'View full cheat sheet of navigation and system hotkeys',
      badge: 'KEY [?]',
      icon: Command,
      keywords: 'help shortcuts keymap keys key map cheat sheet hotkeys',
      action: () => {
        closeCommandBar();
        setKeyMapOpen(true);
      },
    });

    list.push({
      id: 'action-reset',
      category: 'ACTIONS',
      title: 'Reset Ontology to Factory State',
      subtitle: 'Restore all default telemetry nodes and links',
      badge: 'RESET',
      icon: RotateCcw,
      keywords: 'reset factory restore default restart ontology',
      action: () => {
        resetNodes();
        closeCommandBar();
      },
    });

    return list;
  }, [
    nodes, 
    activeNodeId, 
    currentProjection, 
    overlayOpacity,
    onSelectProjection, 
    onCaptureSnapshot, 
    onToggleTree, 
    onToggleInspector, 
    onToggleTerminal, 
    selectNode, 
    triggerSearchSelectionHalo,
    closeCommandBar, 
    setKeyMapOpen,
    resetNodes,
    setOverlayOpacity
  ]);

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const cleanQuery = query.toLowerCase().trim();
    return allCommands.filter((cmd) => {
      const matchTitle = cmd.title.toLowerCase().includes(cleanQuery);
      const matchSub = cmd.subtitle?.toLowerCase().includes(cleanQuery);
      const matchKey = cmd.keywords?.toLowerCase().includes(cleanQuery);
      const matchCat = cmd.category.toLowerCase().includes(cleanQuery);
      return matchTitle || matchSub || matchKey || matchCat;
    });
  }, [allCommands, query]);

  // Handle keyboard navigation inside command bar
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeCommandBar();
    }
  };

  // Group filtered results by category
  const categories = ['PROJECTIONS', 'NODES', 'ACTIONS'] as const;

  return (
    <AnimatePresence>
      {commandBarOpen && (
        <div id="c2-global-command-bar-container" className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setCommandBarOpen(false)}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-2xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden font-mono z-10 flex flex-col max-h-[75vh]"
          >
            {/* Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-[#30363d] bg-[#0d1117]/80 gap-3">
              <Search size={16} className="text-indigo-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search nodes, projections, or actions... (e.g. Portland, rack, snapshot)"
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                >
                  <X size={14} />
                </button>
              )}
              <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-[#161b22] px-2 py-1 rounded border border-[#30363d] shrink-0">
                <span>ESC</span>
              </div>
            </div>

            {/* Results List */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-3">
              {filteredCommands.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <div className="text-sm font-bold text-slate-300 mb-1">No matching nodes or commands</div>
                  <div>Try searching for <strong className="text-indigo-400">Portland</strong>, <strong className="text-indigo-400">515 NE Holladay</strong>, or <strong className="text-indigo-400">physical</strong>.</div>
                </div>
              ) : (
                categories.map((cat) => {
                  const itemsInCat = filteredCommands.filter((c) => c.category === cat);
                  if (itemsInCat.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {cat}
                      </div>
                      {itemsInCat.map((item) => {
                        const globalIndex = filteredCommands.indexOf(item);
                        const isSelected = globalIndex === selectedIndex;
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.id}
                            onClick={item.action}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-300 hover:bg-[#21262d] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-indigo-700 text-white' : 'bg-[#0d1117] text-indigo-400 border border-[#30363d]'}`}>
                                <Icon size={14} />
                              </div>
                              <div className="truncate">
                                <div className="font-semibold truncate">{item.title}</div>
                                {item.subtitle && (
                                  <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                    {item.subtitle}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 pl-2">
                              {item.badge && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  isSelected
                                    ? 'bg-indigo-800 text-white'
                                    : 'bg-[#0d1117] text-indigo-300 border border-[#30363d]'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                              {isSelected && (
                                <CornerDownLeft size={12} className="text-indigo-200 shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer hints */}
            <div className="px-4 py-2 bg-[#0d1117] border-t border-[#30363d] flex items-center justify-between text-[10px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#161b22] border border-[#30363d] rounded text-white">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-[#161b22] border border-[#30363d] rounded text-white">↓</kbd> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#161b22] border border-[#30363d] rounded text-white">↵</kbd> Select
                </span>
              </div>
              <div className="text-indigo-400">
                GDR Spotlight v3.7
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
