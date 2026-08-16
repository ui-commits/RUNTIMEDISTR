# Gap Analysis: Hermes Command vs DGR Production Pieces

This document compares the current `hermes-command` project against the DGR production baseline to identify gaps that need to be ported over.

## Summary

| Area | DGR Status | Hermes Status | Gap |
| --- | --- | --- | --- |
| **API Route Hardening** | ✅ Complete | ⚠️ Partial | Missing auth, rate limiting, size limits, timeout, model allowlist |
| **Action Validation** | ✅ Complete | ⚠️ Partial | Missing `TOGGLE_PIN`, `SET_RESOURCE_LOAD`, stricter normalization |
| **Gemini Response Normalization** | ✅ Complete | ❌ Missing | No `lib/geminiResponse.ts` module |
| **Health Route** | ✅ Complete | ❌ Missing | No `app/health/route.ts` |
| **Tests** | ✅ Complete | ❌ Missing | No `tests/` directory |
| **Standalone Packaging** | ✅ Complete | ⚠️ Partial | `postbuild` script exists but no packaging script |
| **Package/Config Fixes** | ✅ Complete | ⚠️ Partial | Missing overrides, typecheck/test/lint scripts, packageManager |
| **Docs** | ✅ Complete | ⚠️ Partial | Old AI Studio README, missing ARCHITECTURE.md, AGENTS.md |

---

## Detailed Gap Analysis

### 1. API Route Hardening (`app/api/gemini/chat/route.ts`)

**DGR has (Hermes missing):**
- ✅ Bearer token authentication (`HERMES_API_TOKEN`) with timing-safe comparison
- ✅ Per-IP rate limiting (configurable via `HERMES_CHAT_RATE_LIMIT_PER_MINUTE`, default 30/min)
- ✅ Request body size limit (900 KB)
- ✅ Message count limit (50), per-message length (10K), total length (250K)
- ✅ Node state serialization limit (250K)
- ✅ Model allowlist (`ALLOWED_MODELS`) with validation
- ✅ Server-side timeout for Gemini calls (configurable via `HERMES_GEMINI_TIMEOUT_MS`, default 20s, max 30s)
- ✅ Input sanitization (`sanitizeNodeId` on `currentNodeId`)
- ✅ Structured error responses with appropriate HTTP status codes
- ✅ No raw exception leakage to client

**Hermes has:**
- ✅ Basic request validation (messages array required)
- ✅ Offline fallback when `GEMINI_API_KEY` missing
- ✅ System instruction with action schema
- ❌ No authentication
- ❌ No rate limiting
- ❌ No size limits
- ❌ No model allowlist
- ❌ No timeout wrapper
- ❌ No input sanitization on `currentNodeId`
- ❌ Returns raw error messages in 500 response

### 2. Action Validation (`lib/c2Actions.ts`)

**DGR has (Hermes missing):**
- ✅ Additional action types: `TOGGLE_PIN`, `SET_RESOURCE_LOAD`
- ✅ Stricter `normalizeC2Action` with bounds checking
- ✅ Metric validation (`normalizeMetrics` with key/value limits)
- ✅ String length bounds for all fields
- ✅ `isMetricRecord` type guard
- ✅ `createNodeState` and `deleteNodeSubtreeState` pure functions
- ✅ `normalizeNodeStatus` / `isNodeStatus` helpers
- ✅ `sanitizeNodeId` exported and used in route

**Hermes has:**
- ✅ Basic action types: `SELECT_NODE`, `UPDATE_STATUS`, `UPDATE_METRICS`, `ADD_LOG`, `CREATE_NODE`, `DELETE_NODE`, `EXECUTE_DIAGNOSTIC`
- ⚠️ `executeAction` in `c2Context.tsx` duplicates validation logic (violates invariant)
- ❌ Missing `TOGGLE_PIN`, `SET_RESOURCE_LOAD`
- ❌ No metric validation
- ❌ No string length bounds
- ❌ No pure mutation functions (logic lives in React component)
- ❌ No `sanitizeNodeId` export

### 3. Gemini Response Normalization (`lib/geminiResponse.ts`)

**DGR has:**
- ✅ `normalizeGeminiResponse` — bounds text (12K), actions (10), filters invalid actions via `normalizeC2Action`
- ✅ `createOfflineGeminiResponse` — bounded echo (500 chars), sanitized node ID
- ✅ Shared `GeminiTerminalResponse` interface

**Hermes has:**
- ❌ No `lib/geminiResponse.ts` file
- ⚠️ Inline parsing in route with basic try/catch
- ❌ No bounds on response text or action count
- ❌ No validation of returned actions against allowlist

### 4. Health Route (`app/health/route.ts`)

**DGR has:**
- ✅ `GET /health` with `dynamic = 'force-dynamic'`
- ✅ Returns `{ ok, service, status, timestamp }`
- ✅ `Cache-Control: no-store`
- ✅ Independent of Gemini, browser state, ontology

**Hermes has:**
- ❌ No health route at all

### 5. Tests (`tests/`)

**DGR has:**
- ✅ `tests/c2Actions.test.ts` — node mutations, action/status normalization
- ✅ `tests/geminiResponse.test.ts` — offline/online normalization bounds
- ✅ `tests/geminiRoute.test.ts` — offline response, auth enforcement, body size limit
- ✅ `tests/health.test.ts` — resource pressure vs connectivity health
- ✅ `tests/healthRoute.test.ts` — health endpoint contract
- ✅ Uses Bun test runner (`bun test`)

**Hermes has:**
- ❌ No tests directory
- ❌ No test script in package.json

### 6. Standalone Packaging (`scripts/prepare-standalone.mjs`)

**DGR has:**
- ✅ Postbuild script copies `.next/static` → `.next/standalone/.next/static`
- ✅ Copies `public/` → `.next/standalone/public/`
- ✅ Validates standalone build and static assets exist
- ✅ `postbuild` in package.json runs automatically

**Hermes has:**
- ⚠️ `next.config.ts` has `output: 'standalone'`
- ❌ No `scripts/prepare-standalone.mjs`
- ❌ No `postbuild` script
- ❌ Browser assets not copied to standalone output

### 7. Package/Config Fixes (`package.json`, `next.config.ts`)

**DGR has:**
- ✅ `"type": "module"`
- ✅ Security overrides: `postcss: "8.5.26"`, `sharp: "0.35.3"`
- ✅ `packageManager: "bun@1.3.13"` and `engines.bun`
- ✅ Scripts: `typecheck`, `test`, `postbuild`, `start` (uses standalone server)
- ✅ `eslint-config-next` version matches Next.js
- ✅ No `ignoreBuildErrors` or `ignoreDuringBuilds`
- ✅ Cleaner dependencies (no `@hookform/resolvers`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `firebase-tools`)

**Hermes has:**
- ❌ No `"type": "module"`
- ❌ No security overrides
- ❌ No `packageManager` / `engines`
- ❌ Missing `typecheck`, `test`, `postbuild` scripts
- ❌ `start` uses `next start` instead of standalone server
- ❌ `next.config.ts` has `ignoreBuildErrors: true`, `ignoreDuringBuilds: true`
- ❌ Extra dependencies not in DGR

### 8. Docs

**DGR has:**
- ✅ Comprehensive README with quick start, env vars, commands, API, health, structure, build, state, deps, mature UI
- ✅ ARCHITECTURE.md with data flow, invariants, contracts, constraints
- ✅ AGENTS.md with contribution rules, invariants, workflow, merge guidance

**Hermes has:**
- ❌ Minimal AI Studio README
- ❌ No ARCHITECTURE.md
- ❌ No AGENTS.md

---

## Additional Differences in Core Logic

### `lib/c2Context.tsx`

| Feature | DGR | Hermes |
| --- | --- | --- |
| `nodesRef` / `activeNodeIdRef` | ✅ Used for sync reads in `executeAction` | ❌ Missing |
| `commitNodes` / `updateNodes` pattern | ✅ Centralized state updates | ❌ Direct `setNodes` calls |
| `executeAction` uses `normalizeC2Action` | ✅ Single validation path | ❌ Duplicates validation in switch |
| `deleteNode` uses `deleteNodeSubtreeState` | ✅ Proper subtree deletion | ❌ Only removes direct node, doesn't clean descendants |
| `resetNodes` clears ghosts/snapshots | ✅ Complete reset | ❌ Only resets nodes/activeNodeId |
| Ghost traces include `nodeId` field | ✅ | ❌ |
| LayoutSnapshot uses `ProjectionMode` type | ✅ | ❌ Uses string literals |

### `lib/ontology.ts`

| Feature | DGR | Hermes |
| --- | --- | --- |
| `ProjectionMode` imported from `projections.ts` | ✅ | ❌ Uses inline string union |
| Node data sanitized (addresses generalized) | ✅ | ❌ Contains real addresses |
| `priority` field optional, computed via `getNodePriority` | ✅ | ✅ Both have |

### `lib/health.ts`

| Feature | DGR | Hermes |
| --- | --- | --- |
| `getNodeResourcePressure` returns structured object | ✅ | ❌ `getNodeResourceLoad` returns number only |
| Resource pressure separate from connectivity health | ✅ | ❌ Mixed in `getNodeHealth` |
| `NodeResourcePressure` type exported | ✅ | ❌ |

### `lib/projections.ts`

| Feature | DGR | Hermes |
| --- | --- | --- |
| Centralized projection modes | ✅ | ❌ Missing |

---

## Priority Classification

| Priority | Items |
| --- | --- |
| **Critical (Security/Correctness)** | API auth, rate limiting, size limits, timeout, action validation, response normalization, health route |
| **High (Architecture)** | Tests, standalone packaging, pure mutation functions, `c2Context` refs |
| **Medium (Maintainability)** | Package config fixes, docs, projections module |
| **Low (Polish)** | Health types, ontology sanitization, ghost trace fields |