import type { ProjectionMode } from './projections';

export type NodeStatus = 'ONLINE' | 'OFFLINE' | 'STANDBY' | 'SYNCED' | 'FLOWING' | 'EXECUTING' | 'STABLE';
export type NodePriority = 'CRITICAL' | 'ROUTINE';

export type GeoLocation = {
  lat: number;
  lng: number;
  zoom: number;
  name: string;
  address?: string;
  district?: string;
  coordinatesText?: string;
};

export interface NodeArtifact {
  id: string;
  label: string;
  timestamp: string;
  projection: ProjectionMode;
  previewDataUrl: string;
  fileSize?: string;
  dimensions?: string;
  nodeId: string;
  summary?: string;
}

export type NodeData = {
  id: string;
  label: string;
  type: string;
  status: NodeStatus;
  priority?: NodePriority;
  metrics: Record<string, string | number>;
  logs: string[];
  parentId: string | null;
  childrenIds: string[];
  description?: string;
  geo?: GeoLocation;
  artifacts?: NodeArtifact[];
  pinned?: boolean;
  pinnedPosition?: { x: number; y: number };
  physicalSpec?: {
    hardware?: string;
    power?: string;
    cooling?: string;
    rackLocation?: string;
  };
};


export function getNodePriority(node?: NodeData | null): NodePriority {
  if (!node) return 'ROUTINE';
  if (node.priority) return node.priority;
  return ['ROOT', 'REGION', 'FACILITY', 'TERMINAL'].includes(node.type)
    || node.status === 'FLOWING'
    || node.status === 'EXECUTING'
    ? 'CRITICAL'
    : 'ROUTINE';
}

export const nodes: Record<string, NodeData> = {
  earth: {
    id: "earth",
    label: "Global Operations",
    type: "ROOT",
    status: "ONLINE",
    geo: {
      lat: 20.0,
      lng: 0.0,
      zoom: 1.5,
      name: "Planetary Orbit",
      coordinatesText: "0°00'00\"N 0°00'00\"E",
      district: "Global Orbit - Sector 0",
    },
    metrics: { entities: 84392, active_nodes: 402, throughput: "4.2 PB/s", uptime: "99.99%" },
    logs: ["[SYS] Global satellite telemetry synchronized.", "[NET] Backbone optical routes balanced across all continents."],
    parentId: null,
    childrenIds: ["na", "eu", "as"],
    description: "Planetary level operational overview. Aggregates all regional command nodes and global telemetry.",
  },
  na: {
    id: "na",
    label: "North America Command",
    type: "REGION",
    status: "ONLINE",
    geo: {
      lat: 43.5,
      lng: -102.0,
      zoom: 3.5,
      name: "North America Continental Sector",
      coordinatesText: "43°30'00\"N 102°00'00\"W",
      district: "CONUS Strategic Zone",
    },
    metrics: { entities: 12040, active_nodes: 156, latency: "24ms", load: "38%" },
    logs: ["[SEC] North America regional encryption keys rotated.", "[NET] Traffic re-routing nominal across Tier-1 backbones."],
    parentId: "earth",
    childrenIds: ["pnw", "east"],
    description: "Continental sector hub overseeing Pacific Northwest and Eastern grids.",
  },
  eu: {
    id: "eu",
    label: "EMEA Command",
    type: "REGION",
    status: "STANDBY",
    geo: {
      lat: 50.1,
      lng: 14.4,
      zoom: 3.8,
      name: "European Central Grid",
      coordinatesText: "50°06'00\"N 14°24'00\"E",
      district: "EU-West Zone",
    },
    metrics: { entities: 8402, active_nodes: 94, latency: "140ms", status_code: "STANDBY" },
    logs: ["[SYS] Synchronizing standby state with NA Command."],
    parentId: "earth",
    childrenIds: [],
    description: "European and Middle East regional terminal in low-power standby mode.",
  },
  as: {
    id: "as",
    label: "APAC Command",
    type: "REGION",
    status: "ONLINE",
    geo: {
      lat: 35.6,
      lng: 139.7,
      zoom: 3.8,
      name: "Asia-Pacific Gateway",
      coordinatesText: "35°36'00\"N 139°42'00\"E",
      district: "APAC Core",
    },
    metrics: { entities: 14200, active_nodes: 210, latency: "64ms", throughput: "1.8 PB/s" },
    logs: ["[SYS] APAC submarine cable grid operating at full bandwidth."],
    parentId: "earth",
    childrenIds: [],
    description: "Asia-Pacific primary trans-oceanic gateway hub.",
  },
  east: {
    id: "east",
    label: "Eastern Seaboard Grid",
    type: "ZONE",
    status: "ONLINE",
    geo: {
      lat: 40.7128,
      lng: -74.0060,
      zoom: 6.5,
      name: "New York Metro & Eastern Hub",
      coordinatesText: "40°42'46\"N 74°00'22\"W",
      district: "NY-Metro Zone 1",
    },
    metrics: { entities: 6200, active_nodes: 88, latency: "18ms", power_factor: 0.98 },
    logs: ["[NET] Load balancing active across NYC datacenters."],
    parentId: "na",
    childrenIds: [],
    description: "High-density trading and communication hub for the Atlantic corridor.",
  },
  pnw: {
    id: "pnw",
    label: "Pacific NW Grid",
    type: "ZONE",
    status: "ONLINE",
    geo: {
      lat: 46.5,
      lng: -122.8,
      zoom: 6.8,
      name: "Pacific Northwest Sector (OR / WA)",
      coordinatesText: "46°30'00\"N 122°48'00\"W",
      district: "Cascadia Corridor",
    },
    metrics: { entities: 4030, active_nodes: 42, latency: "12ms", renewable_ratio: "92%" },
    logs: ["[NET] Hydropower-backed server infrastructure synchronized.", "[NET] Low-latency fiber link to Portland active."],
    parentId: "na",
    childrenIds: ["pdx"],
    description: "Regional sub-grid spanning Washington and Oregon with ultra-low latency optical links.",
  },
  pdx: {
    id: "pdx",
    label: "Portland Sub-grid",
    type: "CITY",
    status: "ONLINE",
    geo: {
      lat: 45.5231,
      lng: -122.6765,
      zoom: 12.8,
      name: "Portland Metro Operations",
      address: "Portland, Multnomah County, Oregon",
      coordinatesText: "45°31'23\"N 122°40'35\"W",
      district: "Inner Eastside / Lloyd District",
    },
    metrics: { entities: 840, active_nodes: 12, latency: "4ms", local_nodes: 12 },
    logs: ["[NET] Portland optical ring operating at nominal latency (4ms).", "[SYS] Lloyd District node routing verified."],
    parentId: "pnw",
    childrenIds: ["apt"],
    description: "Metro area optical backbone connecting Lloyd District, Eastside, and Downtown Portland.",
  },
  apt: {
    id: "apt",
    label: "Louisa Flowers Base Alpha",
    type: "FACILITY",
    status: "ONLINE",
    geo: {
      lat: 45.52,
      lng: -122.68,
      zoom: 17.5,
      name: "The Louisa Flowers",
      address: "Base Alpha, Portland, OR",
      coordinatesText: "45°31'49.1\"N 122°39'36.4\"W",
      district: "Lloyd District / Base Alpha Corridor",
    },
    physicalSpec: {
      hardware: "Dedicated C2 Base Alpha Uplink Terminal",
      power: "2.4kW Dedicated Clean Line",
      cooling: "Ambient Climate 21°C",
      rackLocation: "Unit Core / Base Alpha Corridor",
    },
    metrics: { power_draw: "2.4kW", bandwidth: "1.2Gbps", temperature: "21°C", signal_strength: "99.8%" },
    logs: ["[SEC] Facility perimeter secure at Base Alpha.", "[NET] Gigabit symmetric fiber online.", "[ENV] Environmental sensors nominal."],
    parentId: "pdx",
    childrenIds: ["ws"],
    description: "Physical operational base situated at The Louisa Flowers building (Base Alpha, Portland OR). Houses the primary command workstation.",
  },
  ws: {
    id: "ws",
    label: "Primary Workstation",
    type: "TERMINAL",
    status: "ONLINE",
    geo: {
      lat: 45.52,
      lng: -122.68,
      zoom: 20.0,
      name: "Command Rig Alpha",
      address: "Base Alpha workstation, Portland, OR",
      coordinatesText: "45°31'49.1\"N 122°39'36.4\"W",
      district: "Workstation Station 1",
    },
    physicalSpec: {
      hardware: "Custom Multi-Core Array + Dual Display C2 Interface",
      power: "650W Active Load",
      cooling: "Liquid Closed-Loop AIO",
      rackLocation: "Desk Array Unit A",
    },
    metrics: { cpu_usage: "42%", mem_usage: "64GB/128GB", active_processes: 1402, nvme_temp: "38°C" },
    logs: ["[SYS] Operator authenticated.", "[SYS] Kernel module loaded into high-memory segment."],
    parentId: "apt",
    childrenIds: ["dev_env"],
    description: "Physical entry point to the digital workspace at Base Alpha. Monitors local hardware and kernel telemetry.",
  },
  dev_env: {
    id: "dev_env",
    label: "Development Environment",
    type: "ENVIRONMENT",
    status: "ONLINE",
    geo: {
      lat: 45.52,
      lng: -122.68,
      zoom: 20.0,
      name: "Virtualized Local Cluster",
      address: "Base Alpha, Portland, OR",
      coordinatesText: "45°31'49.1\"N 122°39'36.4\"W",
    },
    metrics: { containers: 12, local_ports: 8, memory_pool: "32GB", cpu_shares: "8 Cores" },
    logs: ["[DOCKER] Daemon running with 12 active containers.", "[K8S] Minikube cluster active and synced."],
    parentId: "ws",
    childrenIds: ["repos", "infra"],
    description: "Virtualized workspace isolating engineering domains and microservices.",
  },
  infra: {
    id: "infra",
    label: "Local Infrastructure",
    type: "INFRASTRUCTURE",
    status: "ONLINE",
    geo: {
      lat: 45.52,
      lng: -122.68,
      zoom: 20.0,
      name: "Hypervisor & Network Stack",
      address: "Base Alpha, Portland, OR",
    },
    metrics: { vms: 4, networks: 3, bridge_throughput: "450MB/s" },
    logs: ["[NET] Bridge interface up.", "[SYS] Hypervisor nominal."],
    parentId: "dev_env",
    childrenIds: [],
    description: "Local virtual network bridges, hypervisor instances, and socket pipes.",
  },
  repos: {
    id: "repos",
    label: "Source Repositories",
    type: "STORAGE",
    status: "SYNCED",
    geo: {
      lat: 45.52,
      lng: -122.68,
      zoom: 20.0,
      name: "Codebase Versioning System",
      address: "Base Alpha, Portland, OR",
    },
    metrics: { commits_today: 14, uncommitted_changes: 2, branches: 6 },
    logs: ["[GIT] Fetched origin/main.", "[GIT] Rebase successful with zero conflicts."],
    parentId: "dev_env",
    childrenIds: ["arch"],
    description: "Distributed version control repos and build artifact caches.",
  },
  arch: {
    id: "arch",
    label: "Core Architecture",
    type: "MODULE",
    status: "STABLE",
    geo: {
      lat: 45.52,
      lng: -122.68,
      zoom: 20.0,
      name: "Ontological Kernel Schematics",
      address: "Base Alpha, Portland, OR",
    },
    metrics: { dependencies: 42, complexity_score: 8.4, type_safety: "strict" },
    logs: ["[BUILD] Transpilation complete.", "[TEST] 15/15 passed without regressions."],
    parentId: "repos",
    childrenIds: ["runtime"],
    description: "Ontological type models, contract validations, and modular dependency graph.",
  },
  runtime: {
    id: "runtime",
    label: "Execution Runtime",
    type: "RUNTIME",
    status: "ONLINE",
    geo: {
      lat: 45.52,
      lng: -122.68,
      zoom: 20.0,
      name: "V8 & Node Process Engine",
      address: "Base Alpha, Portland, OR",
    },
    metrics: { heap_size: "140MB", event_loop_lag: "2ms", threads: 8 },
    logs: ["[V8] Garbage collection cycle complete.", "[RUNTIME] Microtask queue latency < 1ms."],
    parentId: "arch",
    childrenIds: ["actors"],
    description: "Real-time execution runtime powering async event handling and memory allocation.",
  },
  actors: {
    id: "actors",
    label: "Actor Model",
    type: "PROCESS",
    status: "ONLINE",
    geo: {
      lat: 45.52,
      lng: -122.68,
      zoom: 20.0,
      name: "Supervised Actor Pool",
      address: "Base Alpha, Portland, OR",
    },
    metrics: { active_actors: 24, mailbox_size: 0, dispatch_rate: "14.2k/s" },
    logs: ["[ACTOR] Dispatcher initialized.", "[ACTOR] Supervisor attached and monitoring mailboxes."],
    parentId: "runtime",
    childrenIds: ["events"],
    description: "Supervised actor mailbox pool providing decoupled concurrent state handling.",
  },
  events: {
    id: "events",
    label: "Event Bus",
    type: "STREAM",
    status: "FLOWING",
    geo: {
      lat: 45.52,
      lng: -122.68,
      zoom: 20.0,
      name: "Reactive PubSub Bus",
      address: "Base Alpha, Portland, OR",
    },
    metrics: { events_per_sec: 1400, dropped: 0, backpressure: "0%" },
    logs: ["[BUS] Subscribed to topic 'system.events'.", "[BUS] Broadcast channel open."],
    parentId: "actors",
    childrenIds: ["code"],
    description: "Zero-loss high-throughput message bus connecting all telemetry observers.",
  },
  code: {
    id: "code",
    label: "Source Execution",
    type: "BINARY",
    status: "EXECUTING",
    geo: {
      lat: 45.52,
      lng: -122.68,
      zoom: 20.0,
      name: "Native JIT Binary Core",
      address: "Base Alpha, Portland, OR",
    },
    metrics: { instructions_per_sec: "4B", branching_factor: 1.2, cache_hits: "99.4%" },
    logs: ["[BIN] Instruction pointer at 0x0040120.", "[BIN] Branch prediction rate: 98%"],
    parentId: "events",
    childrenIds: [],
    description: "Native optimized instructions executing with real-time instruction pointer telemetry.",
  }
};