'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { OperationSphere } from '@/components/c2/OperationSphere';
import { ProjectionMode } from '@/lib/projections';
import { TimeSyncOverlay } from '@/components/c2/TimeSyncOverlay';
import { generateCanvasSnapshot } from '@/components/c2/SnapshotUtility';
import { C2Provider, useC2 } from '@/lib/c2Context';

const TreeNav = dynamic(() => import('@/components/c2/TreeNav').then((m) => m.TreeNav));
const Inspector = dynamic(() => import('@/components/c2/Inspector').then((m) => m.Inspector));
const TerminalChatbox = dynamic(() => import('@/components/c2/TerminalChatbox').then((m) => m.TerminalChatbox));
const CommandBar = dynamic(() => import('@/components/c2/CommandBar').then((m) => m.CommandBar));
const KeyMapModal = dynamic(() => import('@/components/c2/KeyMapModal').then((m) => m.KeyMapModal));
import { 
  Terminal, 
  RotateCcw, 
  Layers, 
  Globe, 
  Activity, 
  Cpu, 
  Network, 
  ChevronDown, 
  FolderTree,
  Camera,
  Keyboard,
  Sparkles,
  Plane,
  Home,
  Radar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function GDRDashboardContent() {
  const { 
    nodes, 
    activeNodeId, 
    selectNode, 
    resetNodes,
    addNodeArtifact,
    commandBarOpen,
    setCommandBarOpen,
    keyMapOpen,
    setKeyMapOpen,
    clearSearchSelectionHalo,
  } = useC2();
  
  // HUD Layer visibility states
  const [treeOpen, setTreeOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  
  // Projection mode state
  const [projection, setProjection] = useState<ProjectionMode>('geographic');
  const [projectionMenuOpen, setProjectionMenuOpen] = useState(false);

  // Snapshot flash & toast feedback
  const [snapshotFlash, setSnapshotFlash] = useState(false);
  const [snapshotToast, setSnapshotToast] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: '',
  });

  const activeNode = nodes[activeNodeId] || nodes['pdx'] || nodes['earth'];

  const projectionLabels: Record<ProjectionMode, { label: string; icon: React.ElementType; desc: string }> = {
    knowledge: { label: 'Knowledge Space Map', icon: Sparkles, desc: 'Interactive domain continents & progressive zoom' },
    geographic: { label: 'Geographic Intel', icon: Globe, desc: 'Preloaded vector cartography & satellite' },
    digital: { label: 'Digital Graph', icon: Network, desc: 'Semantic polar radar & node topology' },
    physical: { label: 'Physical Rack', icon: Cpu, desc: 'Chassis blades, thermal & power spec' },
    ontology: { label: 'Ontology Matrix', icon: Layers, desc: 'Hierarchical schema relations' },
  };

  const CurrentProjectionIcon = projectionLabels[projection].icon;

  // Snapshot Capture Handler
  const handleCaptureSnapshot = useCallback(async () => {
    try {
      // Trigger camera flash visual feedback
      setSnapshotFlash(true);
      setTimeout(() => setSnapshotFlash(false), 250);

      // Generate snapshot
      const artifact = await generateCanvasSnapshot(activeNode, projection);
      addNodeArtifact(activeNode.id, artifact);

      // Show toast
      setSnapshotToast({
        visible: true,
        text: `Captured "${artifact.label}" (${artifact.dimensions}) and saved to node metadata.`,
      });
      setTimeout(() => {
        setSnapshotToast({ visible: false, text: '' });
      }, 3500);

      // Auto-open Inspector so user can see their artifact
      setInspectorOpen(true);
    } catch (err) {
      console.error('Failed to capture snapshot:', err);
    }
  }, [activeNode, projection, addNodeArtifact]);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes when typing in text input fields or textareas
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );

      // Cmd+K / Ctrl+K opens Command Bar anywhere
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const next = !commandBarOpen;
        setCommandBarOpen(next);
        if (!next) clearSearchSelectionHalo();
        return;
      }

      // If user is currently typing in an input field, do not trigger single-key hotkeys
      if (isInput) return;

      if (e.key === '/') {
        e.preventDefault();
        setCommandBarOpen(true);
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setKeyMapOpen(!keyMapOpen);
      } else if (e.key === '1' || e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setProjection('geographic');
      } else if (e.key === '2' || e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setProjection('digital');
      } else if (e.key === '3' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setProjection('physical');
      } else if (e.key === '4' || e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setProjection('ontology');
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        setTreeOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setInspectorOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'c' || e.key === '`') {
        e.preventDefault();
        setTerminalOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleCaptureSnapshot();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        resetNodes();
      } else if (e.key === 'Escape') {
        setProjectionMenuOpen(false);
        if (commandBarOpen) { setCommandBarOpen(false); clearSearchSelectionHalo(); }
        if (keyMapOpen) setKeyMapOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    commandBarOpen, 
    keyMapOpen, 
    setCommandBarOpen, 
    setKeyMapOpen, 
    handleCaptureSnapshot, 
    resetNodes,
    clearSearchSelectionHalo,
  ]);

  return (
    <div className="h-screen w-screen bg-[#0d1117] text-slate-100 overflow-hidden flex flex-col font-sans select-none relative">
      {/* Visual Camera Flash Animation Overlay */}
      <AnimatePresence>
        {snapshotFlash && (
          <motion.div
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Snapshot Confirmation Toast */}
      <AnimatePresence>
        {snapshotToast.visible && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#161b22]/95 backdrop-blur-md border border-indigo-500/80 px-4 py-2.5 rounded-none shadow-2xl flex items-center gap-3 font-mono text-xs text-white"
          >
            <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center border border-indigo-500">
              <Camera size={13} />
            </div>
            <span>{snapshotToast.text}</span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded">
              SAVED
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Status Bar */}
      <header className="h-14 border-b border-[#30363d] bg-[#161b22]/95 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-40">
        {/* Left: Brand Logo & Quick Jump Presets */}
        <div className="flex items-center gap-3">
          {/* Brand Logo */}
          <button
            onClick={() => {
              selectNode('earth');
              setProjection('geographic');
            }}
            className="w-8 h-8 rounded-sm bg-indigo-600/20 border border-indigo-500/50 flex items-center justify-center shadow-inner hover:bg-indigo-600/30 transition-colors cursor-pointer"
            title="GDR // Global Distribution Runtime — return to Global Earth"
            aria-label="Global Distribution Runtime"
          >
            <Radar size={16} className="text-indigo-300" />
          </button>

          {/* Active Target Indicator */}
          <span className="text-[10px] font-mono text-slate-300 tracking-wider uppercase flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            TARGET: <strong className="text-white">{activeNode.label}</strong>
          </span>

          <div className="h-6 w-px bg-[#30363d]" />

          {/* Quick 1-Click Jump Presets (icon-only: globe, plane, house) */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'earth', icon: Globe, label: 'Global Earth', hint: 'Jump to Global Earth Root (default view)' },
              { id: 'pdx', icon: Plane, label: 'Portland (PDX)', hint: 'Jump to Portland Metro Operations' },
              { id: 'apt', icon: Home, label: '515 NE Holladay', hint: 'Jump to The Louisa Flowers (515 NE Holladay St)' },
            ].map(({ id, icon: PresetIcon, label, hint }) => {
              const isActive = activeNodeId === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    selectNode(id);
                    setProjection('geographic');
                  }}
                  className={`w-7 h-7 rounded-sm flex items-center justify-center transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.35)]'
                      : 'text-slate-400 border border-[#30363d] bg-[#0d1117] hover:text-white hover:bg-[#21262d] hover:border-slate-500'
                  }`}
                  title={hint}
                  aria-label={label}
                  aria-pressed={isActive}
                >
                  <PresetIcon size={14} className={isActive ? 'text-white' : 'text-indigo-400'} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-5 w-px bg-[#30363d]" />

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Capture Canvas Snapshot Button (icon-only) */}
          <button
            onClick={handleCaptureSnapshot}
            className="p-1.5 bg-[#0d1117] hover:bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 hover:text-white rounded-sm shadow-sm transition-all cursor-pointer"
            title="Capture Canvas Snapshot artifact into node metadata (Hotkey: S)"
            aria-label="Capture Canvas Snapshot"
          >
            <Camera size={13} />
          </button>

          {/* Projection Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProjectionMenuOpen(!projectionMenuOpen)}
              className="px-3 py-1.5 bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] hover:border-slate-500 rounded-sm text-xs font-mono flex items-center gap-2 text-white transition-all cursor-pointer shadow-sm"
            >
              <CurrentProjectionIcon size={13} className="text-indigo-400" />
              <span className="font-semibold hidden sm:inline">{projectionLabels[projection].label}</span>
              <ChevronDown size={12} className={`text-slate-400 transition-transform ${projectionMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Projection Dropdown Menu */}
            {projectionMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setProjectionMenuOpen(false)} 
                />
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#161b22] border border-[#30363d] rounded-sm shadow-2xl p-1.5 z-50 font-mono space-y-1">
                  <div className="px-2.5 py-1 text-[10px] text-slate-400 uppercase font-bold border-b border-[#30363d]">
                    Select Canvas Projection
                  </div>
                  {(Object.keys(projectionLabels) as ProjectionMode[]).map((mode, idx) => {
                    const item = projectionLabels[mode];
                    const Icon = item.icon;
                    const isSelected = projection === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => {
                          setProjection(mode);
                          setProjectionMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-sm text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'hover:bg-[#21262d] text-slate-300 hover:text-white'
                        }`}
                      >
                        <Icon size={14} className={isSelected ? 'text-white mt-0.5' : 'text-indigo-400 mt-0.5'} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span>{item.label}</span>
                            <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-indigo-800 text-white' : 'bg-[#0d1117] text-slate-500'}`}>
                              {idx + 1}
                            </span>
                          </div>
                          <div className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Keyboard Shortcuts Key-Map Button */}
          <button
            onClick={() => setKeyMapOpen(true)}
            className="p-1.5 bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] hover:border-slate-500 text-slate-300 hover:text-white rounded-sm transition-colors cursor-pointer shadow-sm"
            title="View Keyboard Shortcuts Key-Map [?]"
          >
            <Keyboard size={14} />
          </button>

          <div className="h-5 w-px bg-[#30363d]" />

          {/* HUD Layer Toggle Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Global Operations File Explorer Toggle */}
            <button
              onClick={() => setTreeOpen((prev) => !prev)}
              className={`px-3 py-1.5 text-xs font-mono rounded-sm flex items-center gap-1.5 border transition-all cursor-pointer ${
                treeOpen
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                  : 'bg-[#0d1117] border-[#30363d] text-slate-300 hover:text-white hover:bg-[#21262d]'
              }`}
              title="Toggle Global Operations Hierarchy Tree [T]"
            >
              <FolderTree size={13} className={treeOpen ? 'text-white' : 'text-indigo-400'} />
              <span className="hidden md:inline">Tree [T]</span>
            </button>

            {/* Reset State */}
            <button
              onClick={resetNodes}
              title="Reset Ontology State to Defaults [R]"
              className="p-1.5 bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] hover:border-slate-500 text-slate-400 hover:text-white rounded-sm transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <div className="h-5 w-px bg-[#30363d]" />

          {/* Global Time-Sync Overlay */}
          <TimeSyncOverlay activeNode={activeNode} />
        </div>
      </header>

      {/* Center Stage: Maximized Full-Bleed Main Canvas */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        {/* OperationSphere is the Base Layer (100% Width & Height) */}
        <OperationSphere 
          nodes={nodes} 
          activeNodeId={activeNodeId} 
          onSelectNode={(nodeId: string) => {
            selectNode(nodeId);
            setInspectorOpen(true);
          }}
          projection={projection}
          onProjectionChange={setProjection}
          onCaptureSnapshot={handleCaptureSnapshot}
        />

        {/* Floating Left Pull-Tab: Telemetry Inspector Shelf */}
        <AnimatePresence>
          {!inspectorOpen && (
            <motion.button
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              onClick={() => setInspectorOpen(true)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-40 h-14 w-7 rounded-r-sm bg-emerald-600/20 border border-l-0 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 hover:text-white flex items-center justify-center cursor-pointer shadow-lg transition-colors"
              title="Pull out Node Telemetry Inspector [I]"
              aria-label="Open Telemetry Inspector"
            >
              <Activity size={14} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Floating Left Overlay: Node Metadata & Inspector */}
        <AnimatePresence>
          {inspectorOpen && (
            <motion.div
              initial={{ opacity: 0, x: -30, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute left-4 top-4 bottom-4 w-84 sm:w-96 z-30 flex flex-col pointer-events-auto"
            >
              <Inspector 
                activeNode={activeNode} 
                onCaptureSnapshot={handleCaptureSnapshot}
                onClose={() => setInspectorOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Left Overlay: Global Operations Hierarchy Tree */}
        <AnimatePresence>
          {treeOpen && (
            <motion.div
              initial={{ opacity: 0, x: -30, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute left-4 top-4 bottom-4 w-80 sm:w-88 z-30 flex flex-col pointer-events-auto"
            >
              <TreeNav 
                nodes={nodes} 
                activeNodeId={activeNodeId} 
                onSelectNode={selectNode}
                onClose={() => setTreeOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Bottom Center Dock: Terminal Chatbox */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => setTerminalOpen((prev) => !prev)}
          className={`absolute bottom-2 left-1/2 -translate-x-1/2 z-40 px-2.5 h-8 rounded-none border text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg transition-colors ${
            terminalOpen
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-[#161b22]/95 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/20 hover:text-white'
          }`}
          title={terminalOpen ? 'Dismiss Terminal Chatbox [C]' : 'Pull up Terminal Chatbox [C]'}
          aria-label="Toggle Terminal Chatbox"
          aria-pressed={terminalOpen}
        >
          <Terminal size={13} />
          <span className="hidden sm:inline">{terminalOpen ? 'CLOSE' : 'TERMINAL'}</span>
        </motion.button>

        {/* Floating Bottom Overlay: Natural Language AI Terminal Chatbox */}
        <AnimatePresence>
          {terminalOpen && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.22 }}
              className="absolute bottom-12 left-4 right-4 sm:left-12 sm:right-12 lg:left-1/2 lg:-translate-x-1/2 lg:w-[860px] max-h-[50vh] z-30 flex flex-col shadow-2xl pointer-events-auto"
            >
              <TerminalChatbox />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Command Palette / Spotlight Search */}
        <CommandBar
          currentProjection={projection}
          onSelectProjection={setProjection}
          onCaptureSnapshot={handleCaptureSnapshot}
          onToggleTree={() => setTreeOpen((prev) => !prev)}
          onToggleInspector={() => setInspectorOpen((prev) => !prev)}
          onToggleTerminal={() => setTerminalOpen((prev) => !prev)}
        />

        {/* Keyboard Shortcuts Key-Map Floating Modal */}
        <KeyMapModal />
      </main>

      {/* Global Status Footer */}
      <footer className="h-8 border-t border-[#30363d] bg-[#161b22] px-4 flex justify-between items-center shrink-0 text-[11px] font-mono text-slate-400 z-40">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-300">GDR // GLOBAL DISTRIBUTION RUNTIME</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ONLINE & ARMED</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-white font-mono">
            LATENCY: <strong className="text-slate-300">4.2ms</strong>
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-slate-400 flex items-center gap-1">
            <span>NODES:</span> 
            <span className="text-indigo-400 font-bold">{Object.keys(nodes).length} ACTIVE</span>
          </div>
          <div className="text-slate-600">|</div>
          <div className="flex items-center gap-1">
            <span>PROJECTION:</span>
            <span className="text-white font-semibold uppercase">{projection}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HermesC2Dashboard() {
  return (
    <C2Provider>
      <GDRDashboardContent />
    </C2Provider>
  );
}
