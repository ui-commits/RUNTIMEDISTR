"use client";

import React, { createContext, useContext, useRef, useState, ReactNode } from "react";
import { nodes as initialNodes, NodeData, NodeStatus, NodeArtifact } from "./ontology";
import { DigitalLayoutMode, ProjectionMode } from "./projections";
import { createNodeState, deleteNodeSubtreeState, isMetricRecord, normalizeC2Action, normalizeNodeStatus } from "./c2Actions";

export interface GhostNodeTrace {
  id: string;
  nodeId: string;
  label: string;
  type: string;
  status: NodeStatus;
  timestamp: number;
  reason: "navigated" | "decommissioned";
}

export interface LayoutSnapshot {
  id: string;
  name: string;
  timestamp: number;
  projection: ProjectionMode;
  digitalLayout: DigitalLayoutMode;
  zoomLevel: number;
  activeNodeId: string;
  description?: string;
}

interface C2ContextType {
  nodes: Record<string, NodeData>;
  activeNodeId: string;
  selectNode: (id: string) => void;
  updateNodeStatus: (id: string, status: NodeStatus) => string;
  updateNodeMetrics: (id: string, metrics: Record<string, string | number>) => string;
  addNodeLog: (id: string, log: string) => string;
  addNodeArtifact: (nodeId: string, artifact: NodeArtifact) => void;
  deleteNodeArtifact: (nodeId: string, artifactId: string) => void;
  toggleNodePin: (nodeId: string, pinned?: boolean) => string;
  setNodeResourceLoad: (nodeId: string, load: number) => string;
  overlayOpacity: number;
  setOverlayOpacity: (opacity: number) => void;
  commandBarOpen: boolean;
  setCommandBarOpen: (open: boolean) => void;
  keyMapOpen: boolean;
  setKeyMapOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchSelectedHaloNodeId: string | null;
  triggerSearchSelectionHalo: (id: string) => void;
  clearSearchSelectionHalo: () => void;
  showRecent: boolean;
  setShowRecent: React.Dispatch<React.SetStateAction<boolean>>;
  recentGhosts: GhostNodeTrace[];
  layoutSnapshots: LayoutSnapshot[];
  saveLayoutSnapshot: (params: Omit<LayoutSnapshot, "id" | "timestamp">) => LayoutSnapshot;
  deleteLayoutSnapshot: (id: string) => void;
  createNode: (params: { parentId: string; id: string; label: string; type: string; status?: NodeStatus; description?: string; metrics?: Record<string, string | number> }) => string;
  deleteNode: (id: string) => string;
  resetNodes: () => void;
  executeAction: (action: unknown) => string;
}

const C2Context = createContext<C2ContextType | undefined>(undefined);

export function C2Provider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<Record<string, NodeData>>(initialNodes);
  const [activeNodeId, setActiveNodeId] = useState("earth");
  const [overlayOpacity, setOverlayOpacity] = useState(0.92);
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [keyMapOpen, setKeyMapOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSelectedHaloNodeId, setSearchSelectedHaloNodeId] = useState<string | null>(null);
  const [showRecent, setShowRecent] = useState<boolean>(true);
  const [recentGhosts, setRecentGhosts] = useState<GhostNodeTrace[]>([]);
  const [layoutSnapshots, setLayoutSnapshots] = useState<LayoutSnapshot[]>([]);
  const nodesRef = useRef(nodes);
  const activeNodeIdRef = useRef(activeNodeId);
  const snapshotCounterRef = useRef(0);

  const commitNodes = (nextNodes: Record<string, NodeData>) => {
    nodesRef.current = nextNodes;
    setNodes(nextNodes);
  };
  const updateNodes = (updater: (current: Record<string, NodeData>) => Record<string, NodeData>) => commitNodes(updater(nodesRef.current));
  const commitActiveNodeId = (id: string) => {
    activeNodeIdRef.current = id;
    setActiveNodeId(id);
  };
  const addGhostTrace = (node: NodeData, reason: GhostNodeTrace["reason"]) => {
    const timestamp = Date.now();
    setRecentGhosts((current) => [{
      id: node.id + ":" + timestamp + ":" + reason,
      nodeId: node.id,
      label: node.label,
      type: node.type,
      status: node.status,
      timestamp,
      reason,
    }, ...current.filter((trace) => trace.nodeId !== node.id)].slice(0, 12));
  };
  const selectNode = (id: string) => {
    if (!nodesRef.current[id]) return;
    const previousId = activeNodeIdRef.current;
    if (previousId && previousId !== id && nodesRef.current[previousId]) addGhostTrace(nodesRef.current[previousId], "navigated");
    commitActiveNodeId(id);
  };
  const triggerSearchSelectionHalo = (id: string) => {
    if (!nodesRef.current[id]) return;
    setSearchSelectedHaloNodeId(id);
    selectNode(id);
  };
  const clearSearchSelectionHalo = () => setSearchSelectedHaloNodeId(null);

  const addNodeArtifact = (nodeId: string, artifact: NodeArtifact) => {
    updateNodes((prev) => {
      if (!prev[nodeId]) return prev;
      return { ...prev, [nodeId]: {
        ...prev[nodeId],
        artifacts: [artifact, ...(prev[nodeId].artifacts || [])],
        logs: [("[SYS] Canvas snapshot artifact " + artifact.label + " (" + artifact.projection.toUpperCase() + ") saved."), ...prev[nodeId].logs].slice(0, 25),
      }};
    });
  };
  const deleteNodeArtifact = (nodeId: string, artifactId: string) => updateNodes((prev) => {
    if (!prev[nodeId] || !prev[nodeId].artifacts) return prev;
    return { ...prev, [nodeId]: {
      ...prev[nodeId],
      artifacts: prev[nodeId].artifacts?.filter((artifact) => artifact.id !== artifactId),
      logs: [("[SYS] Artifact " + artifactId + " purged from node metadata."), ...prev[nodeId].logs].slice(0, 25),
    }};
  });
  const updateNodeStatus = (id: string, status: NodeStatus) => {
    if (!nodesRef.current[id]) return "Target node [" + id + "] not found in hierarchy.";
    updateNodes((prev) => ({ ...prev, [id]: { ...prev[id], status, logs: [("[SYS] Status mutated to " + status + " via C2 Terminal"), ...prev[id].logs].slice(0, 20) } }));
    return "Status of [" + id + "] updated to " + status + ".";
  };
  const updateNodeMetrics = (id: string, metrics: Record<string, string | number>) => {
    if (!nodesRef.current[id]) return "Target node [" + id + "] not found in hierarchy.";
    updateNodes((prev) => ({ ...prev, [id]: { ...prev[id], metrics: { ...prev[id].metrics, ...metrics }, logs: ["[SYS] Telemetry metrics updated via C2 Terminal", ...prev[id].logs].slice(0, 20) } }));
    return "Telemetry metrics updated for [" + id + "].";
  };
  const addNodeLog = (id: string, log: string) => {
    if (!nodesRef.current[id]) return "Target node [" + id + "] not found in hierarchy.";
    updateNodes((prev) => ({ ...prev, [id]: { ...prev[id], logs: [log, ...prev[id].logs].slice(0, 20) } }));
    return "Log recorded on [" + id + "].";
  };
  const toggleNodePin = (id: string, pinned?: boolean) => {
    if (!nodesRef.current[id]) return "Target node [" + id + "] not found in hierarchy.";
    const nextPinned = typeof pinned === "boolean" ? pinned : !nodesRef.current[id].pinned;
    updateNodes((prev) => ({ ...prev, [id]: { ...prev[id], pinned: nextPinned, logs: [("[LAYOUT] Node coordinates " + (nextPinned ? "pinned" : "unpinned") + " via C2 command."), ...prev[id].logs].slice(0, 20) } }));
    return "Node [" + id + "] " + (nextPinned ? "pinned" : "unpinned") + " for layout control.";
  };
  const setNodeResourceLoad = (id: string, load: number) => {
    if (!nodesRef.current[id]) return "Target node [" + id + "] not found in hierarchy.";
    if (!Number.isFinite(load)) return "Rejected invalid resource load for [" + id + "].";
    const normalizedLoad = Math.round(Math.min(100, Math.max(0, load)));
    updateNodes((prev) => ({ ...prev, [id]: { ...prev[id], metrics: { ...prev[id].metrics, resource_load: normalizedLoad + "%" }, logs: [("[TELEMETRY] Resource pressure updated to " + normalizedLoad + "%."), ...prev[id].logs].slice(0, 20) } }));
    return "Resource pressure for [" + id + "] set to " + normalizedLoad + "%.";
  };
  const saveLayoutSnapshot = (params: Omit<LayoutSnapshot, "id" | "timestamp">) => {
    snapshotCounterRef.current += 1;
    const snapshot: LayoutSnapshot = {
      ...params,
      id: "layout_" + Date.now() + "_" + snapshotCounterRef.current,
      name: params.name.trim().slice(0, 80) || "Layout " + snapshotCounterRef.current,
      description: params.description?.trim().slice(0, 240),
      timestamp: Date.now(),
      zoomLevel: Math.min(1.8, Math.max(0.5, params.zoomLevel)),
    };
    setLayoutSnapshots((current) => [snapshot, ...current].slice(0, 20));
    addNodeLog(snapshot.activeNodeId, "[LAYOUT] Snapshot " + snapshot.name + " saved.");
    return snapshot;
  };
  const deleteLayoutSnapshot = (id: string) => setLayoutSnapshots((current) => current.filter((snapshot) => snapshot.id !== id));
  const createNode = ({ parentId, id, label, type, status = "ONLINE", description = "Custom node initialized via C2 Terminal.", metrics = { status: "ACTIVE", latency: "5ms" } }: {
    parentId: string; id: string; label: string; type: string; status?: NodeStatus; description?: string; metrics?: Record<string, string | number>;
  }) => {
    const result = createNodeState(nodesRef.current, { parentId, id, label, type, status, description, metrics });
    if (!result.ok || !result.nodeId) return result.message;
    commitNodes(result.nodes);
    commitActiveNodeId(result.nodeId);
    return result.message;
  };
  const deleteNode = (id: string) => {
    const target = nodesRef.current[id];
    const result = deleteNodeSubtreeState(nodesRef.current, id);
    if (!result.ok) return result.message;
    if (target) addGhostTrace(target, "decommissioned");
    commitNodes(result.nodes);
    if (result.affectedIds?.includes(activeNodeIdRef.current)) commitActiveNodeId("earth");
    return result.message;
  };
  const resetNodes = () => {
    commitNodes(initialNodes);
    commitActiveNodeId("earth");
    setSearchQuery("");
    setSearchSelectedHaloNodeId(null);
    setRecentGhosts([]);
    setLayoutSnapshots([]);
  };
  const executeAction = (action: unknown): string => {
    try {
      const normalizedAction = normalizeC2Action(action);
      if (!normalizedAction) return "Rejected malformed or unsupported action.";
      const { type, payload } = normalizedAction;
      const nodeId = String(payload.nodeId ?? payload.id ?? activeNodeIdRef.current);
      switch (type) {
        case "SELECT_NODE": return nodesRef.current[nodeId] ? (selectNode(nodeId), "Focus shifted to node [" + nodeId + "].") : "Target node [" + nodeId + "] not found in hierarchy.";
        case "UPDATE_STATUS": { const status = normalizeNodeStatus(payload.status); return status ? updateNodeStatus(nodeId, status) : "Rejected invalid status for [" + nodeId + "]."; }
        case "UPDATE_METRICS": return isMetricRecord(payload.metrics) ? updateNodeMetrics(nodeId, payload.metrics) : "Rejected invalid telemetry metrics for [" + nodeId + "].";
        case "ADD_LOG": { const log = payload.log ?? payload.message; return typeof log === "string" && log.trim() ? addNodeLog(nodeId, log.trim().slice(0, 2000)) : "Rejected empty log entry for [" + nodeId + "]."; }
        case "CREATE_NODE": {
          const id = String(payload.id ?? ("node_" + Date.now().toString().slice(-6)));
          const status = normalizeNodeStatus(payload.status ?? "ONLINE");
          const metrics = payload.metrics === undefined ? { status: "ACTIVE" } : payload.metrics;
          if (!status || !isMetricRecord(metrics)) return "Rejected invalid node payload for [" + id + "].";
          return createNode({ parentId: String(payload.parentId ?? activeNodeIdRef.current), id, label: String(payload.label ?? id.toUpperCase()).slice(0, 160), type: String(payload.type ?? "MODULE").slice(0, 80), status, description: String(payload.description ?? "Created via terminal agent.").slice(0, 2000), metrics });
        }
        case "DELETE_NODE": return payload.nodeId || payload.id ? deleteNode(nodeId) : "Missing nodeId for decommissioning.";
        case "TOGGLE_PIN": return typeof payload.pinned === "undefined" || typeof payload.pinned === "boolean" ? toggleNodePin(nodeId, payload.pinned as boolean | undefined) : "Rejected invalid pin state for [" + nodeId + "].";
        case "SET_RESOURCE_LOAD": { const candidate = typeof payload.load === "number" ? payload.load : Number(payload.load ?? payload.resource_load); return Number.isFinite(candidate) ? setNodeResourceLoad(nodeId, candidate) : "Rejected invalid resource load for [" + nodeId + "]."; }
        case "EXECUTE_DIAGNOSTIC": { const result = addNodeLog(nodeId, "[DIAGNOSTIC] Integrity scan nominal. Latency: 4ms. Zero packet drop."); return result.startsWith("Log recorded") ? "Integrity diagnostics completed for [" + nodeId + "]." : result; }
        default: return "Rejected unsupported action: " + type + ".";
      }
    } catch (error: unknown) {
      return "Action execution warning: " + (error instanceof Error ? error.message : String(error));
    }
  };

  return <C2Context.Provider value={{
    nodes, activeNodeId, selectNode, updateNodeStatus, updateNodeMetrics, addNodeLog,
    addNodeArtifact, deleteNodeArtifact, toggleNodePin, setNodeResourceLoad,
    overlayOpacity, setOverlayOpacity, commandBarOpen, setCommandBarOpen, keyMapOpen, setKeyMapOpen,
    searchQuery, setSearchQuery, searchSelectedHaloNodeId, triggerSearchSelectionHalo, clearSearchSelectionHalo,
    showRecent, setShowRecent,
    recentGhosts, layoutSnapshots, saveLayoutSnapshot, deleteLayoutSnapshot,
    createNode, deleteNode, resetNodes, executeAction,
  }}>{children}</C2Context.Provider>;
}

export function useC2() {
  const context = useContext(C2Context);
  if (!context) throw new Error("useC2 must be used within a C2Provider");
  return context;
}