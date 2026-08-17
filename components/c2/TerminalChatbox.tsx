"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Terminal as TerminalIcon,
  Send,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
  Cpu,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useC2 } from "@/lib/c2Context";
import Markdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  executedActions?: string[];
  isError?: boolean;
}

const PRESET_PROMPTS = [
  "Take EMEA Command offline for maintenance",
  "Inspect latency bottlenecks across the network",
  "Add a new cache_layer module under repos with 99.9% uptime",
  "Explain how the Actor Model handles message dispatching",
  "Run a full security integrity audit on Primary Workstation",
  "Jump focus to Eastern Seaboard Grid",
];

export function TerminalChatbox() {
  const { nodes, activeNodeId, executeAction, selectNode, overlayOpacity } = useC2();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      role: "system",
      content: `[GDR KERNEL v3.7 ONLINE]
Global Distribution Runtime session initialized. Connected to multi-layer ontology graph.
You can enter natural language instructions, system queries, topology mutations, or standard CLI commands (/help, /nodes, /select, /clear).`,
      timestamp: "12:00:00",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.7-flash");
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const idCounterRef = useRef(100);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const getNextId = (prefix: string) => {
    idCounterRef.current += 1;
    return `${prefix}-${idCounterRef.current}`;
  };

  const handleSend = async (userPrompt?: string) => {
    const promptToSend = (userPrompt ?? input).trim();
    if (!promptToSend || isLoading) return;

    const currentMsgId = getNextId("msg");
    const currentTimeStr = new Date().toLocaleTimeString("en-US", { hour12: false });

    // Save to command history
    setCommandHistory((prev) => [promptToSend, ...prev.filter((c) => c !== promptToSend)].slice(0, 30));
    setHistoryIndex(-1);

    const userMessage: Message = {
      id: currentMsgId,
      role: "user",
      content: promptToSend,
      timestamp: currentTimeStr,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Handle local CLI shortcuts
    if (promptToSend.startsWith("/")) {
      const parts = promptToSend.slice(1).split(" ");
      const cmd = parts[0]?.toLowerCase();
      const arg = parts.slice(1).join(" ");

      if (cmd === "clear" || cmd === "cls") {
        setMessages([]);
        setIsLoading(false);
        return;
      }
      if (cmd === "help") {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: getNextId("sys"),
              role: "system",
              content: `HERMES C2 TERMINAL COMMANDS:
- Natural Language: "Add a database node under dev_env", "What node has the highest latency?", "Set NA to STANDBY"
- /select <nodeId>  : Shift focus to target node
- /nodes            : List all nodes in current hierarchy
- /clear            : Clear terminal output
- /help             : Show this guidance table`,
              timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
            },
          ]);
          setIsLoading(false);
        }, 150);
        return;
      }
      if (cmd === "select" && arg) {
        const target = arg.toLowerCase().trim();
        if (nodes[target]) {
          selectNode(target);
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: getNextId("sys"),
                role: "assistant",
                content: `[EXEC] Switched focus target to node [${target}]: ${nodes[target].label}`,
                timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
                executedActions: [`Focus shifted to [${target}]`],
              },
            ]);
            setIsLoading(false);
          }, 150);
          return;
        }
      }
      if (cmd === "nodes") {
        setTimeout(() => {
          const list = Object.values(nodes)
            .map((n) => `• [${n.id.padEnd(8)}] ${n.status.padEnd(9)} | ${n.type.padEnd(12)} | ${n.label}`)
            .join("\n");
          setMessages((prev) => [
            ...prev,
            {
              id: getNextId("sys"),
              role: "system",
              content: `CURRENT NETWORK ONTOLOGY NODES:\n${list}`,
              timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
            },
          ]);
          setIsLoading(false);
        }, 150);
        return;
      }
    }

    try {
      // Build conversation payload for Gemini API
      const conversationHistory = [...messages, userMessage]
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          currentNodeId: activeNodeId,
          nodesState: nodes,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const responseText = data.text || "[No response from AI Kernel]";
      const actionResults: string[] = [];

      // Execute returned mutations
      if (Array.isArray(data.actions) && data.actions.length > 0) {
        for (const action of data.actions) {
          const resultDesc = executeAction(action);
          if (resultDesc) {
            actionResults.push(resultDesc);
          }
        }
      }

      const assistantMessage: Message = {
        id: getNextId("msg"),
        role: "assistant",
        content: responseText,
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        executedActions: actionResults.length > 0 ? actionResults : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Connection failed";
      setMessages((prev) => [
        ...prev,
        {
          id: getNextId("err"),
          role: "assistant",
          content: `[KERNEL_COMM_FAULT] Error dispatching to Gemini Core: ${errMsg}\nTry re-issuing the instruction or check network uplink.`,
          timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  return (
    <div
      id="c2-terminal-chatbox"
      style={{
        backgroundColor: `rgba(8, 8, 10, ${overlayOpacity})`,
        backdropFilter: `blur(${Math.max(4, overlayOpacity * 16)}px)`,
      }}
      className={`border border-border-c2 flex flex-col transition-all duration-200 rounded-none overflow-hidden shadow-2xl relative ${
        isExpanded ? "h-[480px]" : "h-56"
      }`}
    >
      {/* Terminal Top Bar */}
      <div className="bg-[#0c0c0e] border-b border-border-c2 px-3 py-2 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center space-x-2">
          <TerminalIcon size={14} className="text-cobalt-c2 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-white">
            GDR KERNEL <span className="text-[#666] font-normal">{'// GLOBAL DISTRIBUTION RUNTIME'}</span>
          </span>
        </div>

        {/* Model Selector & Terminal Controls */}
        <div className="flex items-center space-x-2 text-[11px] font-mono">
          <div className="flex items-center bg-[#151518] border border-border-c2 rounded px-2 py-0.5 text-[#888]">
            <Cpu size={12} className="text-cobalt-c2 mr-1.5" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-[#bbb] text-[10px] focus:outline-none cursor-pointer"
            >
              <option value="gemini-3.7-flash" className="bg-[#111] text-white">
                gemini-3.7-flash (Default)
              </option>
              <option value="gemini-3.5-flash" className="bg-[#111] text-white">
                gemini-3.5-flash
              </option>
              <option value="gemini-3.1-pro-preview" className="bg-[#111] text-white">
                gemini-3.1-pro-preview (Deep Reasoning)
              </option>
              <option value="gemini-3.1-flash-lite" className="bg-[#111] text-white">
                gemini-3.1-flash-lite (Ultra Fast)
              </option>
            </select>
          </div>

          <button
            onClick={() => setMessages([])}
            className="p-1 hover:bg-zinc-800 text-[#666] hover:text-white rounded transition-colors cursor-pointer"
            title="Clear Output"
          >
            <Trash2 size={13} />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-zinc-800 text-[#666] hover:text-white rounded transition-colors cursor-pointer"
            title={isExpanded ? "Collapse view" : "Expand view"}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Quick Prompts Carousel */}
      <div className="bg-[#0e0e11] border-b border-border-c2 px-3 py-1.5 flex items-center space-x-2 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
        <span className="text-[9px] font-mono uppercase tracking-widest text-[#555] flex items-center gap-1 shrink-0">
          <Sparkles size={11} className="text-cobalt-c2" />
          Suggestions:
        </span>
        {PRESET_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="text-[10px] font-mono px-2 py-0.5 bg-[#18181c] hover:bg-cobalt-c2/20 border border-[#2e2e34] hover:border-cobalt-c2/50 text-[#aaa] hover:text-white rounded transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Terminal Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs select-text">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-1">
            {/* Message Header Prompt */}
            <div className="flex items-center space-x-2 text-[10px]">
              {msg.role === "user" ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span>operator@hermes:~$</span>
                </span>
              ) : msg.role === "system" ? (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <AlertTriangle size={11} />
                  <span>[SYSTEM_BROADCAST]</span>
                </span>
              ) : (
                <span className="text-cobalt-c2 font-bold flex items-center gap-1">
                  <Sparkles size={11} />
                  <span>[HERMES-AI-CORE]</span>
                </span>
              )}
              <span className="text-[#555]">{msg.timestamp}</span>
            </div>

            {/* Content Body */}
            <div
              className={`p-2.5 rounded border leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#111115] border-[#2a2a30] text-zinc-200"
                  : msg.role === "system"
                  ? "bg-amber-950/20 border-amber-900/40 text-amber-200/90 whitespace-pre-wrap"
                  : msg.isError
                  ? "bg-red-950/20 border-red-900/50 text-red-300 whitespace-pre-wrap"
                  : "bg-[#0c0c0f] border-border-c2 text-[#e0e0e0]"
              }`}
            >
              {msg.role === "user" ? (
                <div className="font-mono text-white">{msg.content}</div>
              ) : (
                <div className="markdown-body space-y-2">
                  <Markdown>{msg.content}</Markdown>
                </div>
              )}

              {/* Action Badges */}
              {msg.executedActions && msg.executedActions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border-c2 space-y-1">
                  <div className="text-[10px] text-cobalt-c2 uppercase tracking-wider font-bold flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-fern-c2" />
                    Autonomous Executions:
                  </div>
                  {msg.executedActions.map((act, idx) => (
                    <div
                      key={idx}
                      className="text-[10px] font-mono text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 px-2 py-0.5 rounded flex items-center gap-1"
                    >
                      <span className="text-emerald-500">⚡</span>
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="space-y-1 animate-pulse">
            <div className="text-[10px] text-cobalt-c2 font-bold flex items-center gap-1">
              <Sparkles size={11} className="animate-spin" />
              <span>[HERMES-AI-CORE ANALYZING]...</span>
            </div>
            <div className="p-3 bg-[#0c0c0f] border border-cobalt-c2/30 rounded text-[#888] flex items-center space-x-3">
              <div className="flex space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cobalt-c2 animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-cobalt-c2 animate-ping delay-75" />
                <span className="w-1.5 h-1.5 rounded-full bg-cobalt-c2 animate-ping delay-150" />
              </div>
              <span className="text-[11px] text-[#aaa]">Synthesizing telemetry & natural language instructions...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Prompt Box */}
      <div className="p-2.5 bg-[#0c0c0e] border-t border-border-c2 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 bg-[#050506] border border-border-c2 focus-within:border-cobalt-c2 rounded px-3 py-1.5 transition-colors"
        >
          <span className="text-emerald-400 font-mono text-xs select-none">operator@hermes:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything in natural language, request edits, inspect telemetry, or type /help..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-xs font-mono text-white placeholder-[#555] focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-2.5 py-1 bg-cobalt-c2 hover:bg-blue-600 disabled:bg-zinc-800 text-white text-[10px] font-mono uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Run</span>
            <Send size={10} />
          </button>
        </form>
      </div>
    </div>
  );
}
