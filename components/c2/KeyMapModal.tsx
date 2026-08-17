'use client';

import React from 'react';
import { useC2 } from '@/lib/c2Context';
import { 
  Command, 
  X, 
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
  Keyboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShortcutGroup {
  category: string;
  items: {
    keys: string[];
    description: string;
    icon?: React.ElementType;
  }[];
}

export function KeyMapModal() {
  const { keyMapOpen, setKeyMapOpen } = useC2();

  const shortcutGroups: ShortcutGroup[] = [
    {
      category: 'CANVAS PROJECTIONS',
      items: [
        { keys: ['1', 'G'], description: 'Switch to Geographic Intel Projection', icon: Globe },
        { keys: ['2', 'D'], description: 'Switch to Digital Topology Graph', icon: Network },
        { keys: ['3', 'P'], description: 'Switch to Physical Hardware Rack', icon: Cpu },
        { keys: ['4', 'O'], description: 'Switch to Ontology Matrix View', icon: Layers },
      ],
    },
    {
      category: 'SEARCH & DISCOVERY',
      items: [
        { keys: ['⌘', 'K'], description: 'Open Global Command Bar / Spotlight Search', icon: Command },
        { keys: ['/'], description: 'Quick Search Ontology & Nodes', icon: Command },
        { keys: ['?'], description: 'Toggle this Keyboard Shortcuts Key-Map', icon: Keyboard },
      ],
    },
    {
      category: 'HUD OVERLAYS & PANELS',
      items: [
        { keys: ['T'], description: 'Toggle Global Operations Hierarchy Tree', icon: FolderTree },
        { keys: ['I'], description: 'Toggle Node Metadata & Telemetry Inspector', icon: Activity },
        { keys: ['C', '`'], description: 'Toggle Natural Language AI Terminal', icon: Terminal },
      ],
    },
    {
      category: 'TACTICAL ACTIONS & VIEW CONTROLS',
      items: [
        { keys: ['S'], description: 'Capture Visual Snapshot Artifact to Metadata', icon: Camera },
        { keys: ['O'], description: 'Cycle Overlay Panel Opacity (Transparent / Opaque)', icon: Sliders },
        { keys: ['R'], description: 'Reset Ontology to Default Portland Metro State', icon: RotateCcw },
        { keys: ['ESC'], description: 'Close any active modal, drawer, or dropdown' },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {keyMapOpen && (
        <div id="c2-keymap-modal-container" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setKeyMapOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-none shadow-2xl overflow-hidden font-mono z-10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d] bg-[#0d1117]/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-none bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Keyboard size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                    Keyboard Shortcuts Guide
                    <span className="text-[9px] bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded">
                      HOTKEYS
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Tactical keyboard navigation and rapid HUD toggles</p>
                </div>
              </div>

              <button
                onClick={() => setKeyMapOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-[#21262d] rounded-none transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto max-h-[65vh] space-y-5">
              {shortcutGroups.map((group) => (
                <div key={group.category} className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#30363d] pb-1">
                    {group.category}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {group.items.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-none bg-[#0d1117]/70 border border-[#30363d]/60 hover:border-slate-500 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2.5 text-slate-300">
                            {Icon && <Icon size={14} className="text-blue-400 shrink-0" />}
                            <span>{item.description}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 pl-3">
                            {item.keys.map((k, kIdx) => (
                              <kbd
                                key={kIdx}
                                className="px-2 py-0.5 min-w-[24px] text-center text-xs font-bold bg-[#21262d] text-white border border-[#30363d] rounded shadow-inner"
                              >
                                {k}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-[#0d1117] border-t border-[#30363d] flex items-center justify-between text-[11px] text-slate-400">
              <span>Press <kbd className="px-1.5 py-0.5 bg-[#21262d] text-white rounded border border-[#30363d]">ESC</kbd> or <kbd className="px-1.5 py-0.5 bg-[#21262d] text-white rounded border border-[#30363d]">?</kbd> to dismiss</span>
              <span className="text-blue-400 font-semibold">GDR-C2 Operational Suite</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
