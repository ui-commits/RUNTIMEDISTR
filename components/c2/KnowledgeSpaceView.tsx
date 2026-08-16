'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Cpu, 
  Network, 
  Layers, 
  ShieldAlert, 
  FolderGit2, 
  BookOpen, 
  Briefcase, 
  Activity, 
  Sparkles, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ChevronRight, 
  MapPin, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Terminal,
  ExternalLink,
  Zap,
  Server
} from 'lucide-react';
import { NodeData } from '@/lib/ontology';

export interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  status: 'OPTIMAL' | 'ACTIVE' | 'CRITICAL_RECOVERY' | 'VERIFIED' | 'STABLE';
  summary: string;
  details: string[];
  metrics?: Record<string, string | number>;
  ontologyNodeId?: string;
  dateOrVersion?: string;
  tags: string[];
  codeSnippet?: string;
}

export interface ContinentDomain {
  id: string;
  name: string;
  code: string;
  color: string;
  borderAccent: string;
  bgGlow: string;
  icon: React.ElementType;
  tagline: string;
  description: string;
  position: { x: number; y: number }; // relative percentage coordinates on canvas
  items: KnowledgeItem[];
}

interface KnowledgeSpaceViewProps {
  nodes: Record<string, NodeData>;
  activeNode: NodeData;
  onSelectNode: (nodeId: string) => void;
  onHoverNode?: (node: NodeData | null, e?: React.MouseEvent) => void;
}

export const CONTINENTS: ContinentDomain[] = [
  {
    id: 'recovery',
    name: 'Recovery Domain',
    code: 'DOM-01',
    color: '#f59e0b', // Amber
    borderAccent: 'border-amber-500/50',
    bgGlow: 'from-amber-500/20 to-amber-950/40',
    icon: ShieldAlert,
    tagline: 'Workstation replacement, incident records & housing base',
    description: 'Authentic recovery effort documenting hardware failure incidents, workstation replacement roadmap at 515 NE Holladay St, and equipment recovery audits.',
    position: { x: 22, y: 32 },
    items: [
      {
        id: 'apt_base',
        title: 'Louisa Flowers Base Alpha (515 NE Holladay St)',
        category: 'Physical Location',
        status: 'VERIFIED',
        ontologyNodeId: 'apt',
        dateOrVersion: 'Portland, OR 97232',
        summary: 'Primary operational housing base situated in Portland Lloyd District.',
        details: [
          'Dedicated 2.4kW clean electrical feed for command workstation.',
          'Symmetric gigabit optical fiber uplink with 4ms latency to regional backbones.',
          'Physical location: 515 NE Holladay St, Portland, OR 97232.',
          'Houses the central C2 command terminal and recovery hardware.'
        ],
        metrics: { power: '2.4kW', latency: '4ms', fiber: '1.2 Gbps', temp: '21°C' },
        tags: ['Base Alpha', 'Portland', 'Physical Layer', 'Recovery']
      },
      {
        id: 'incident_hw',
        title: 'Primary Workstation GPU Memory Failure Incident',
        category: 'Incident Log',
        status: 'CRITICAL_RECOVERY',
        ontologyNodeId: 'ws',
        dateOrVersion: 'INC-2026-0811',
        summary: 'Thermal breakdown and memory bus corruption on legacy GPU render pipeline.',
        details: [
          'Symptom: PCIe bus errors (AER error code 0x00000020) causing kernel panics.',
          'Root Cause: Silicon degradation under sustained compute workloads during model quantization.',
          'Mitigation: Shifted graphics projection engine to headless WebGL2 fallback on CPU memory pool.',
          'Resolution Plan: Replacement workstation funding & assembly in progress.'
        ],
        metrics: { aer_code: '0x20', bus_width: '256-bit', status: 'Degraded' },
        tags: ['Hardware Failure', 'GPU', 'PCIe AER', 'Incident Report']
      },
      {
        id: 'workstation_roadmap',
        title: 'Workstation Replacement & Upgrade Roadmap',
        category: 'Recovery Timeline',
        status: 'ACTIVE',
        dateOrVersion: 'Phase 2 / 3',
        summary: '3-phase engineering blueprint for full C2 rig replacement and high-density compute array.',
        details: [
          'Phase 1 (Complete): Isolate faulty memory channels, deploy resilient fallbacks.',
          'Phase 2 (Active): Community & supporter funding drive for dual-socket workstation replacement.',
          'Phase 3 (Upcoming): Assembly of 128GB ECC RAM + dual RTX workstation array at 515 NE Holladay St.'
        ],
        metrics: { completion: '65%', target_ecc: '128GB', goal: '$3,800' },
        tags: ['Roadmap', 'Workstation', 'Funding', 'Equipment']
      }
    ]
  },
  {
    id: 'projects',
    name: 'Projects Domain',
    code: 'DOM-02',
    color: '#6366f1', // Indigo
    borderAccent: 'border-indigo-500/50',
    bgGlow: 'from-indigo-500/20 to-indigo-950/40',
    icon: Cpu,
    tagline: 'Living software, C2 telemetry & distribution systems',
    description: 'Production software systems built by Christopher Rodriguez, including the Global Distribution Runtime, Hermes C2 Engine, and Memory Kernel.',
    position: { x: 50, y: 28 },
    items: [
      {
        id: 'gdr_core',
        title: 'Global Distribution Runtime (GDR v3.7)',
        category: 'Core System',
        status: 'OPTIMAL',
        ontologyNodeId: 'earth',
        dateOrVersion: 'v3.7.0',
        summary: 'Real-time state synchronization engine connecting 402 global command nodes.',
        details: [
          'Zero-copy event bus broadcasting telemetry updates under 5ms latency.',
          'Cross-region failover between North America, EMEA, and APAC sectors.',
          'Built with TypeScript, Next.js 15 App Router, and motion state machines.'
        ],
        metrics: { nodes: 402, throughput: '4.2 PB/s', uptime: '99.99%' },
        tags: ['GDR', 'Distributed Systems', 'Real-Time', 'Core']
      },
      {
        id: 'hermes_c2',
        title: 'Hermes C2 Command Center',
        category: 'UI & Command Matrix',
        status: 'OPTIMAL',
        ontologyNodeId: 'pdx',
        dateOrVersion: 'Build 804',
        summary: 'Tactical multi-projection HUD with GIS mapping, digital graph, and AI terminal.',
        details: [
          '4-Layer Projections: Geographic, Digital Polar, Physical Rack, and Ontology Matrix.',
          'Integrated Natural Language AI Terminal with Google Gemini 3.5/3.7 integration.',
          'Snapshot utility capturing high-res canvas artifacts into node telemetry logs.'
        ],
        metrics: { latency: '4.2ms', projections: 4, hotkeys: 12 },
        tags: ['Hermes C2', 'UI/UX', 'Command Center', 'Gemini AI']
      },
      {
        id: 'memory_kernel',
        title: 'Ontological Memory Kernel',
        category: 'Database & Schema',
        status: 'STABLE',
        ontologyNodeId: 'arch',
        dateOrVersion: 'Kernel v1.2',
        summary: 'Immutable event sourcing and typed graph schema database.',
        details: [
          'Strict TypeScript schema enforcement across all system nodes.',
          'Deterministic state recovery via replayable event audit trails.',
          'Zero memory leakage under continuous 14.2k events/sec throughput.'
        ],
        metrics: { type_safety: '100%', complexity: '8.4', unit_tests: '420/420' },
        tags: ['Schema', 'Ontology', 'Type Safety', 'Event Sourcing']
      }
    ]
  },
  {
    id: 'research',
    name: 'Research Domain',
    code: 'DOM-03',
    color: '#10b981', // Emerald
    borderAccent: 'border-emerald-500/50',
    bgGlow: 'from-emerald-500/20 to-emerald-950/40',
    icon: BookOpen,
    tagline: 'Actor systems, fault tolerance & optical routing',
    description: 'Applied computer science research in actor mailbox concurrency, low-latency packet routing, and zero-loss event buses.',
    position: { x: 78, y: 35 },
    items: [
      {
        id: 'paper_actor',
        title: 'Supervised Actor Pool Concurrency Benchmarks',
        category: 'Research Paper',
        status: 'VERIFIED',
        ontologyNodeId: 'actors',
        dateOrVersion: 'TR-2026-04',
        summary: 'Empirical evaluation of 14,200 actor dispatches/sec on resource-constrained hardware.',
        details: [
          'Demonstrated lock-free queueing under backpressure without dropped messages.',
          'Supervisor trees maintaining 100% uptime through automatic child restarts.',
          'Benchmark code compiled using native TypeScript type stripping.'
        ],
        metrics: { dispatch_rate: '14.2k/s', dropped_packets: 0, mailbox_lag: '0ms' },
        tags: ['Actor Model', 'Concurrency', 'Benchmarks', 'Research'],
        codeSnippet: `export class ActorSupervisor {\n  private mailbox = new LockFreeQueue<SystemEvent>();\n  async dispatch(evt: SystemEvent): Promise<void> {\n    await this.mailbox.enqueue(evt);\n    this.notifySubscribers();\n  }\n}`
      },
      {
        id: 'paper_pnw_fiber',
        title: 'Cascadia Optical Backbone Latency Analysis',
        category: 'Field Study',
        status: 'STABLE',
        ontologyNodeId: 'pnw',
        dateOrVersion: 'TR-2026-02',
        summary: 'Latency profile of the Portland-Seattle optical corridor backed by 92% renewable power.',
        details: [
          'Measured sub-4ms roundtrip time between Portland Lloyd District and Seattle Eastside hub.',
          'Resilience analysis under simulated fiber cuts with automatic rerouting.',
          'Published open dataset of Cascadia regional network topology.'
        ],
        metrics: { rtt: '3.8ms', renewable_ratio: '92%', nodes_tested: 42 },
        tags: ['Optical Network', 'Cascadia', 'PNW', 'Telemetry']
      }
    ]
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure Domain',
    code: 'DOM-04',
    color: '#3b82f6', // Blue
    borderAccent: 'border-blue-500/50',
    bgGlow: 'from-blue-500/20 to-blue-950/40',
    icon: Server,
    tagline: 'Hypervisors, containers, network bridges & power grids',
    description: 'Physical hardware, virtualized Docker/K8s clusters, network bridge interfaces, and regional command hubs.',
    position: { x: 26, y: 70 },
    items: [
      {
        id: 'na_command_hub',
        title: 'North America Command (CONUS Sector)',
        category: 'Regional Grid',
        status: 'OPTIMAL',
        ontologyNodeId: 'na',
        dateOrVersion: 'CONUS Hub 1',
        summary: 'Continental sector hub supervising Pacific NW and Eastern grids.',
        details: [
          'Oversees 156 active edge nodes with 24ms average CONUS latency.',
          'Automated encryption key rotation every 24 hours across Tier-1 backbones.',
          'Redundant multi-region failover links to EMEA and APAC.'
        ],
        metrics: { active_nodes: 156, load: '38%', latency: '24ms' },
        tags: ['North America', 'Regional Command', 'CONUS', 'Backbone']
      },
      {
        id: 'virtual_cluster',
        title: 'Virtualized Local Container Cluster',
        category: 'K8s / Docker',
        status: 'OPTIMAL',
        ontologyNodeId: 'dev_env',
        dateOrVersion: 'Minikube v1.32',
        summary: '12 active microservice containers running on local hypervisor stack.',
        details: [
          '32GB dedicated RAM allocation with 8 CPU core shares.',
          'Isolated bridge interfaces maintaining 450MB/s throughput.',
          'Automated hot-reloading dev server configured on hardcoded port 3000.'
        ],
        metrics: { containers: 12, memory_pool: '32GB', bridge_speed: '450MB/s' },
        tags: ['Docker', 'Kubernetes', 'Virtualization', 'Infrastructure']
      }
    ]
  },
  {
    id: 'consulting',
    name: 'Consulting Domain',
    code: 'DOM-05',
    color: '#ec4899', // Pink
    borderAccent: 'border-pink-500/50',
    bgGlow: 'from-pink-500/20 to-pink-950/40',
    icon: Briefcase,
    tagline: 'Systems architecture auditing, threat modeling & advisory',
    description: 'Fractional architecture advisory, threat modeling, disaster recovery planning, and systems engineering engagement models.',
    position: { x: 52, y: 72 },
    items: [
      {
        id: 'audit_framework',
        title: '6-Layer Systems Resilience Audit Framework',
        category: 'Methodology',
        status: 'VERIFIED',
        dateOrVersion: 'Audit Spec v2.1',
        summary: 'Comprehensive evaluation methodology for mission-critical engineering systems.',
        details: [
          'Layer 1: Physical & Power Infrastructure (Redundancy, clean lines).',
          'Layer 2: Network Topologies & Edge Latency.',
          'Layer 3: Event Bus & Messaging Guarantee (Zero dropped packets).',
          'Layer 4: Data Persistence & Schema Audit.',
          'Layer 5: Security & Least Privilege Access.',
          'Layer 6: Disaster Recovery & Hardware Replacement Plans.'
        ],
        metrics: { layers: 6, checklists: 48, compliance: 'WCAG AA / ISO' },
        tags: ['Audit', 'Resilience', 'Architecture', 'Consulting']
      },
      {
        id: 'threat_model',
        title: 'Zero-Trust C2 Security Architecture',
        category: 'Security Model',
        status: 'STABLE',
        dateOrVersion: 'SecSpec 2026',
        summary: 'Least privilege access control, token rotation, and immutable audit logs.',
        details: [
          'All API keys isolated strictly in server-side environment variables.',
          'Client UI rendered with zero public secrets.',
          'Immutable event bus logs recording every operator action.'
        ],
        metrics: { auth_mode: 'Zero-Trust', secret_leak_risk: '0%', audit_log: 'Enabled' },
        tags: ['Security', 'Zero-Trust', 'Least Privilege', 'Threat Model']
      }
    ]
  },
  {
    id: 'knowledge',
    name: 'Knowledge Domain',
    code: 'DOM-06',
    color: '#8b5cf6', // Purple
    borderAccent: 'border-purple-500/50',
    bgGlow: 'from-purple-500/20 to-purple-950/40',
    icon: FolderGit2,
    tagline: 'Ontological schemas, repositories & execution runtime',
    description: 'Formal schemas, source code repositories, execution runtime telemetry, and interactive technical documentation.',
    position: { x: 76, y: 68 },
    items: [
      {
        id: 'git_codebase',
        title: 'Distributed Source Repositories',
        category: 'Codebase',
        status: 'STABLE',
        ontologyNodeId: 'repos',
        dateOrVersion: 'Git main',
        summary: 'Version controlled codebase with 420 passing unit tests and zero build warnings.',
        details: [
          'Strict TypeScript type safety with no `any` leaks.',
          'Modular architecture separating UI, ontology engine, and API routes.',
          'Clean git commit history documenting every architectural iteration.'
        ],
        metrics: { unit_tests: '420/420', branches: 6, type_coverage: '100%' },
        tags: ['Git', 'TypeScript', 'Codebase', 'Repository']
      },
      {
        id: 'v8_engine',
        title: 'V8 & Node.js Execution Telemetry',
        category: 'Runtime Engine',
        status: 'OPTIMAL',
        ontologyNodeId: 'runtime',
        dateOrVersion: 'Node v22.x',
        summary: 'Memory allocation, garbage collection, and microtask queue latency telemetry.',
        details: [
          'Heap size: 140MB maintained during active canvas rendering.',
          'Microtask queue latency < 1ms under sustained events.',
          'Native JIT compilation optimizing event loop throughput.'
        ],
        metrics: { heap: '140MB', event_loop_lag: '1.2ms', threads: 8 },
        tags: ['V8', 'Node.js', 'Runtime', 'Performance']
      }
    ]
  }
];

export function KnowledgeSpaceView({
  nodes,
  activeNode,
  onSelectNode,
  onHoverNode
}: KnowledgeSpaceViewProps) {
  // Navigation State
  const [selectedContinentId, setSelectedContinentId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // Active continent object
  const activeContinent = useMemo(() => {
    if (!selectedContinentId) return null;
    return CONTINENTS.find(c => c.id === selectedContinentId) || null;
  }, [selectedContinentId]);

  // Active selected item object
  const activeItem = useMemo(() => {
    if (!selectedItemId) return null;
    for (const c of CONTINENTS) {
      const found = c.items.find(i => i.id === selectedItemId);
      if (found) return found;
    }
    return null;
  }, [selectedItemId]);

  // Filtered items when searching globally
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const results: { continent: ContinentDomain; item: KnowledgeItem }[] = [];
    for (const c of CONTINENTS) {
      for (const item of c.items) {
        if (
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.tags.some(t => t.toLowerCase().includes(q))
        ) {
          results.push({ continent: c, item });
        }
      }
    }
    return results;
  }, [searchQuery]);

  // Zoom handlers
  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(Math.max(Math.round((prev + delta) * 10) / 10, 0.7), 1.8));
  };

  const handleReset = () => {
    setSelectedContinentId(null);
    setSelectedItemId(null);
    setSearchQuery('');
    setZoomLevel(1.0);
  };

  const handleSelectContinent = (id: string) => {
    setSelectedContinentId(id);
    setSelectedItemId(null);
  };

  const handleSelectItem = (item: KnowledgeItem, continentId?: string) => {
    if (continentId) setSelectedContinentId(continentId);
    setSelectedItemId(item.id);
    if (item.ontologyNodeId && nodes[item.ontologyNodeId]) {
      onSelectNode(item.ontologyNodeId);
    }
  };

  return (
    <div className="KnowledgeSpaceView relative w-full h-full bg-[#05070a] text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Background Cartographic Spatial Grid */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 60%),
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 40px 40px, 40px 40px',
        }}
      />

      {/* Top Knowledge Space Header Bar & Dynamic Breadcrumbs */}
      <div className="relative z-20 px-4 py-3 bg-[#0a0e17]/90 border-b border-border-c2 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Breadcrumb Trail */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#131826] hover:bg-indigo-600/30 text-indigo-400 hover:text-white border border-indigo-500/40 rounded transition-all cursor-pointer font-bold"
          >
            <Globe size={13} />
            <span>Knowledge Space</span>
          </button>

          {activeContinent && (
            <>
              <ChevronRight size={13} className="text-slate-500 shrink-0" />
              <button
                onClick={() => {
                  setSelectedItemId(null);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#131826] text-white border border-slate-700 rounded hover:border-slate-500 transition-all cursor-pointer font-bold"
                style={{ color: activeContinent.color }}
              >
                <activeContinent.icon size={13} />
                <span>{activeContinent.name}</span>
              </button>
            </>
          )}

          {activeItem && (
            <>
              <ChevronRight size={13} className="text-slate-500 shrink-0" />
              <div className="px-2.5 py-1 bg-indigo-950/80 border border-indigo-700/80 text-indigo-200 rounded font-bold truncate max-w-[220px]">
                {activeItem.title}
              </div>
            </>
          )}
        </div>

        {/* Search Input & Zoom Controls */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search domains, projects, incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-64 pl-8 pr-3 py-1 bg-[#0a0d14] border border-[#2d3748] rounded-none text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            )}
          </div>

          {/* Zoom Level Bar */}
          <div className="flex items-center bg-[#0a0d14] border border-[#2d3748] rounded-none p-0.5 font-mono text-xs text-slate-300">
            <button
              onClick={() => handleZoom(-0.15)}
              className="p-1 hover:bg-white/10 hover:text-white rounded transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={12} />
            </button>
            <span className="px-2 text-[10px] font-bold">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => handleZoom(0.15)}
              className="p-1 hover:bg-white/10 hover:text-white rounded transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={12} />
            </button>
            <button
              onClick={handleReset}
              className="p-1 hover:bg-white/10 hover:text-white rounded transition-colors cursor-pointer ml-1 border-l border-[#2d3748]"
              title="Reset Knowledge Space Map"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* 1. GLOBAL CONTINENT MAP MODE (Level 0) */}
        {!selectedContinentId && !searchQuery && (
          <div 
            className="w-full h-full relative transition-transform duration-500 ease-out flex items-center justify-center p-6"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* SVG Ambient Connecting Vectors between Continents */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <linearGradient id="vector-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Draw inter-continent network mesh */}
              {CONTINENTS.map((c1, idx) => {
                const c2 = CONTINENTS[(idx + 1) % CONTINENTS.length];
                const c3 = CONTINENTS[(idx + 2) % CONTINENTS.length];
                return (
                  <g key={`mesh-${c1.id}`}>
                    <line
                      x1={`${c1.position.x}%`}
                      y1={`${c1.position.y}%`}
                      x2={`${c2.position.x}%`}
                      y2={`${c2.position.y}%`}
                      stroke="url(#vector-grad)"
                      strokeWidth="1.2"
                      strokeDasharray="4 6"
                      strokeOpacity="0.3"
                    />
                    <line
                      x1={`${c1.position.x}%`}
                      y1={`${c1.position.y}%`}
                      x2={`${c3.position.x}%`}
                      y2={`${c3.position.y}%`}
                      stroke="rgba(99, 102, 241, 0.15)"
                      strokeWidth="1"
                      strokeDasharray="2 4"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Render 6 Major Continent Landmass Cards */}
            <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto items-center pointer-events-auto z-10 overflow-y-auto">
              {CONTINENTS.map((continent) => {
                const Icon = continent.icon;
                return (
                  <motion.div
                    key={continent.id}
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectContinent(continent.id)}
                    className={`relative p-5 rounded-none bg-gradient-to-b ${continent.bgGlow} bg-[#0c101d]/90 border ${continent.borderAccent} shadow-[0_0_25px_rgba(0,0,0,0.6)] backdrop-blur-md cursor-pointer transition-all duration-300 group flex flex-col justify-between h-[210px] overflow-hidden`}
                  >
                    {/* Background Radial Glow */}
                    <div 
                      className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-60" 
                      style={{ backgroundColor: continent.color }} 
                    />

                    {/* Top Row: Code & Icon */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded bg-black/60 text-[10px] font-mono font-bold text-slate-300 border border-slate-700/60 uppercase tracking-widest">
                          {continent.code}
                        </span>
                        <div 
                          className="w-9 h-9 rounded-none flex items-center justify-center border shadow-md transition-transform group-hover:rotate-6"
                          style={{ backgroundColor: `${continent.color}20`, borderColor: continent.color, color: continent.color }}
                        >
                          <Icon size={20} />
                        </div>
                      </div>

                      <h2 className="text-base font-bold text-white font-mono tracking-tight flex items-center gap-2 group-hover:text-indigo-300 transition-colors">
                        {continent.name}
                      </h2>
                      <p className="text-[11px] text-slate-400 font-sans mt-1 line-clamp-2 leading-relaxed">
                        {continent.tagline}
                      </p>
                    </div>

                    {/* Bottom Row: Item count & Explore Button */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: continent.color }} />
                        <strong className="text-white">{continent.items.length}</strong> Artifacts
                      </span>

                      <div className="flex items-center gap-1 text-indigo-400 font-bold group-hover:translate-x-1 transition-transform text-[11px]">
                        <span>Explore Domain</span>
                        <ArrowRight size={13} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. SEARCH RESULTS OVERLAY MODE */}
        {searchQuery && (
          <div className="w-full h-full overflow-y-auto p-6 z-20 relative bg-[#05070a]/95 backdrop-blur-md">
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 font-mono">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Search size={14} className="text-indigo-400" />
                  Search Results for &quot;{searchQuery}&quot;
                </h3>
                <span className="text-xs text-slate-400">{searchResults.length} matching items</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-mono text-xs bg-[#0c101d] rounded-none border border-slate-800">
                  No artifacts or domains match your query.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map(({ continent, item }) => (
                    <motion.div
                      key={item.id}
                      onClick={() => handleSelectItem(item, continent.id)}
                      whileHover={{ scale: 1.01 }}
                      className="p-4 rounded-none bg-[#0e1322] border border-slate-700 hover:border-indigo-500 cursor-pointer transition-all font-mono space-y-2"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase font-bold">
                          {continent.name}
                        </span>
                        <span className="text-slate-400">{item.category}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-snug">{item.title}</h4>
                      <p className="text-xs text-slate-400 font-sans line-clamp-2">{item.summary}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. CONTINENT ZOOM-IN MODE (Level 1) */}
        {selectedContinentId && activeContinent && !searchQuery && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full h-full overflow-y-auto p-6 z-20 relative"
          >
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Continent Header Banner */}
              <div 
                className={`p-6 rounded-none bg-gradient-to-r ${activeContinent.bgGlow} bg-[#0c101d] border ${activeContinent.borderAccent} shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-bold border uppercase"
                      style={{ borderColor: activeContinent.color, color: activeContinent.color, backgroundColor: `${activeContinent.color}20` }}
                    >
                      {activeContinent.code}
                    </span>
                    <span className="text-xs text-slate-400">CONTINENT DOMAIN</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <activeContinent.icon size={24} style={{ color: activeContinent.color }} />
                    {activeContinent.name}
                  </h2>
                  <p className="text-xs text-slate-300 font-sans max-w-2xl leading-relaxed">
                    {activeContinent.description}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedContinentId(null)}
                  className="px-3.5 py-1.5 bg-[#161b26] hover:bg-white/10 text-slate-300 hover:text-white border border-slate-700 rounded-none text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <RotateCcw size={13} />
                  <span>Back to All Domains</span>
                </button>
              </div>

              {/* Items Grid inside Selected Continent */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeContinent.items.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectItem(item)}
                      className={`p-5 rounded-none bg-[#0c101d]/90 border transition-all cursor-pointer font-mono flex flex-col justify-between space-y-4 shadow-lg ${
                        isSelected 
                          ? 'border-indigo-400 bg-indigo-950/40 shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {/* Top Meta */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                            {item.category}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            item.status === 'OPTIMAL' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            item.status === 'CRITICAL_RECOVERY' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          }`}>
                            {item.status}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white leading-snug hover:text-indigo-300 transition-colors">
                          {item.title}
                        </h3>

                        <p className="text-xs text-slate-400 font-sans leading-relaxed line-clamp-3">
                          {item.summary}
                        </p>
                      </div>

                      {/* Details List */}
                      <ul className="text-[11px] text-slate-300 font-sans space-y-1.5 border-t border-slate-800/80 pt-3">
                        {item.details.slice(0, 2).map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-indigo-400 font-bold shrink-0">›</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Metrics Badges */}
                      {item.metrics && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                          {Object.entries(item.metrics).map(([k, v]) => (
                            <div key={k} className="px-2 py-0.5 bg-[#05070a] border border-slate-800 rounded text-[9.5px] text-slate-400">
                              <span className="text-slate-500 uppercase">{k}: </span>
                              <strong className="text-indigo-300">{v}</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer CTA */}
                      <div className="flex items-center justify-between pt-2 text-[10px] text-indigo-400 font-bold">
                        <span>{item.dateOrVersion || 'Inspect Details'}</span>
                        <div className="flex items-center gap-1">
                          <span>View Item</span>
                          <ChevronRight size={12} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Item Detail Inspector Drawer / Modal */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.22 }}
            className="absolute bottom-4 left-4 right-4 max-w-4xl mx-auto z-40 bg-[#0e1322]/98 border border-indigo-500/80 rounded-none p-5 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-xl font-mono text-xs text-white space-y-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-indigo-500/30 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-700 text-[10px] rounded uppercase font-bold">
                    {activeItem.category}
                  </span>
                  <span className="text-[10px] text-slate-400">{activeItem.dateOrVersion}</span>
                </div>
                <h3 className="text-base font-bold text-white">{activeItem.title}</h3>
              </div>

              <button
                onClick={() => setSelectedItemId(null)}
                className="p-1.5 hover:bg-white/10 rounded-none text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-3">
                <p className="text-xs text-slate-300 font-sans leading-relaxed">{activeItem.summary}</p>

                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Engineering Evidence & Specifications:</h4>
                  <ul className="space-y-1.5 text-slate-300 font-sans text-xs">
                    {activeItem.details.map((d, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-[#05070a]/60 p-2 rounded border border-slate-800">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {activeItem.codeSnippet && (
                  <div className="space-y-1 pt-2">
                    <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Implementation Snippet:</h4>
                    <pre className="p-3 bg-[#05070a] border border-slate-800 rounded-none text-[11px] text-indigo-300 overflow-x-auto">
                      <code>{activeItem.codeSnippet}</code>
                    </pre>
                  </div>
                )}
              </div>

              {/* Sidebar Metrics & Tags */}
              <div className="space-y-3 bg-[#05070a]/80 p-3.5 rounded-none border border-slate-800">
                <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Node Telemetry Metrics</h4>
                {activeItem.metrics && (
                  <div className="space-y-1.5">
                    {Object.entries(activeItem.metrics).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-[11px] border-b border-slate-800/60 pb-1">
                        <span className="text-slate-400 uppercase">{k}:</span>
                        <strong className="text-white font-mono">{v}</strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2">
                  <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Domain Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {activeItem.tags.map(t => (
                      <span key={t} className="px-1.5 py-0.5 bg-indigo-950/80 text-indigo-300 text-[9.5px] rounded border border-indigo-800">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {activeItem.ontologyNodeId && nodes[activeItem.ontologyNodeId] && (
                  <button
                    onClick={() => {
                      if (activeItem.ontologyNodeId) {
                        onSelectNode(activeItem.ontologyNodeId);
                      }
                    }}
                    className="w-full mt-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-none font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Zap size={13} />
                    <span>Select Node in C2 Telemetry</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
