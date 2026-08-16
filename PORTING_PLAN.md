# Porting Plan: DGR Production Pieces → Hermes Command

This document outlines the step-by-step plan to port DGR's production-hardened pieces into the Hermes Command repository.

## Phase 0: Preparation

### 0.1 Create Missing Files
- [ ] `lib/geminiResponse.ts` — Response normalization
- [ ] `lib/projections.ts` — Centralized projection modes
- [ ] `app/health/route.ts` — Health endpoint
- [ ] `scripts/prepare-standalone.mjs` — Standalone packaging
- [ ] `tests/` directory with test files
- [ ] `ARCHITECTURE.md` — Architecture documentation
- [ ] `AGENTS.md` — Contribution rules

### 0.2 Update Configuration
- [ ] `package.json` — Add scripts, overrides, packageManager, type: module
- [ ] `next.config.ts` — Remove ignoreBuildErrors/ignoreDuringBuilds
- [ ] `.env.example` — Add DGR environment variables

---

## Phase 1: Core Library Updates (Critical)

### 1.1 `lib/c2Actions.ts` — Complete Rewrite
**Source:** DGR `lib/c2Actions.ts`
**Changes:**
- Export `sanitizeNodeId`, `normalizeNodeStatus`, `isNodeStatus`
- Add `ACTION_TYPES` set with `TOGGLE_PIN`, `SET_RESOURCE_LOAD`
- Add bounds constants (MAX_ID_LENGTH, MAX_LABEL_LENGTH, etc.)
- Implement `normalizeBoundedString`, `normalizeMetrics`, `isMetricRecord`
- Rewrite `normalizeC2Action` with strict validation
- Add `createNodeState`, `deleteNodeSubtreeState` pure functions
- Remove any React-specific code

**Validation:** `bun run test` (c2Actions tests pass)

### 1.2 `lib/geminiResponse.ts` — New File
**Source:** DGR `lib/geminiResponse.ts`
**Changes:**
- Export `GeminiTerminalResponse` interface
- Implement `createOfflineGeminiResponse` with bounded echo
- Implement `normalizeGeminiResponse` with text/action limits and action filtering

**Validation:** `bun run test` (geminiResponse tests pass)

### 1.3 `lib/projections.ts` — New File
**Source:** DGR `lib/projections.ts`
**Changes:**
- Export `PROJECTION_MODES`, `ProjectionMode`, `DigitalLayoutMode`
- Export `isProjectionMode` type guard

### 1.4 `lib/ontology.ts` — Updates
**Source:** DGR `lib/ontology.ts` (with Hermes node data)
**Changes:**
- Import `ProjectionMode` from `./projections`
- Update `NodeArtifact.projection` to use `ProjectionMode`
- Sanitize node addresses (replace real addresses with generic ones)
- Keep Hermes node hierarchy data

### 1.5 `lib/health.ts` — Updates
**Source:** DGR `lib/health.ts` (merge with Hermes additions)
**Changes:**
- Add `NodeResourcePressure` interface and `getNodeResourcePressure`
- Keep Hermes `getNodeResourceLoad`, `isNodeHighPressure`, `getNodeHealth`, `getNodePriorityStyling`, `getResourceLoadHeartbeat`
- Ensure resource pressure is separate from connectivity health

### 1.6 `lib/gemini.ts` — Minor Update
**Source:** DGR `lib/gemini.ts`
**Changes:**
- Update User-Agent header to `hermes-c2/0.1.0`

---

## Phase 2: API Route Hardening (Critical)

### 2.1 `app/api/gemini/chat/route.ts` — Complete Rewrite
**Source:** DGR `app/api/gemini/chat/route.ts`
**Changes:**
- Add constants: `ALLOWED_MODELS`, `MAX_BODY_BYTES`, `MAX_MESSAGES`, `MAX_TOTAL_MESSAGE_LENGTH`, `MAX_MESSAGE_LENGTH`, `MAX_NODES_STATE_LENGTH`, `RATE_LIMIT_WINDOW_MS`, `DEFAULT_RATE_LIMIT`, `MAX_MODEL_TIMEOUT_MS`, `DEFAULT_MODEL_TIMEOUT_MS`
- Add `ChatMessage`, `RateLimitBucket` interfaces
- Implement `jsonError`, `parsePositiveInteger`, `safeTokenEquals`, `authorizeRequest`, `getClientKey`, `checkRateLimit`, `parseMessages`, `withTimeout`
- Import `sanitizeNodeId` from `c2Actions`
- Import `createOfflineGeminiResponse`, `normalizeGeminiResponse` from `geminiResponse`
- Add authentication check (`HERMES_API_TOKEN`)
- Add rate limiting
- Add request size validation
- Add message parsing with limits
- Add model allowlist validation
- Add node state size validation
- Wrap Gemini call in `withTimeout`
- Use `normalizeGeminiResponse` on response
- Return generic error messages (no raw exceptions)

**Validation:** `bun run test` (geminiRoute tests pass)

### 2.2 `app/health/route.ts` — New File
**Source:** DGR `app/health/route.ts`
**Changes:**
- Export `GET` handler with `dynamic = 'force-dynamic'`
- Return `{ ok: true, service: 'hermes-c2', status: 'healthy', timestamp }`
- Add `Cache-Control: no-store` header

**Validation:** `bun run test` (healthRoute tests pass)

---

## Phase 3: Client State & Context (High)

### 3.1 `lib/c2Context.tsx` — Major Refactor
**Source:** DGR `lib/c2Context.tsx` (adapted for Hermes UI features)
**Changes:**
- Import `DigitalLayoutMode`, `ProjectionMode` from `./projections`
- Import `createNodeState`, `deleteNodeSubtreeState`, `isMetricRecord`, `normalizeC2Action`, `normalizeNodeStatus` from `./c2Actions`
- Add `nodesRef`, `activeNodeIdRef` for synchronous reads
- Add `commitNodes`, `updateNodes`, `commitActiveNodeId` helpers
- Update `GhostNodeTrace` to include `nodeId` field, restrict `reason` to `"navigated" | "decommissioned"`
- Update `LayoutSnapshot` to use `ProjectionMode` and `DigitalLayoutMode` types
- Update `C2ContextType` method signatures to match DGR (return strings for mutations)
- Implement `addGhostTrace` with `nodeId` and timestamp-based ID
- Update `selectNode` to use refs
- Update `triggerSearchSelectionHalo`, add `clearSearchSelectionHalo`
- Update all mutation methods to use `updateNodes` pattern and return strings
- Update `createNode` to use `createNodeState` and commit via refs
- Update `deleteNode` to use `deleteNodeSubtreeState` and handle active node fallback
- Update `resetNodes` to clear ghosts, snapshots, search state
- Update `executeAction` to use `normalizeC2Action` as single validation path
- Remove duplicated validation logic from switch cases

**Validation:** Manual testing of all terminal actions, tree navigation, node creation/deletion

---

## Phase 4: Tests (High)

### 4.1 `tests/c2Actions.test.ts`
**Source:** DGR `tests/c2Actions.test.ts`
**Changes:**
- Test `deleteNodeSubtreeState` (descendants, parent links)
- Test `createNodeState` (duplicates, missing parents)
- Test `normalizeNodeStatus` and action normalization
- Test `TOGGLE_PIN`, `SET_RESOURCE_LOAD` actions
- Test payload sanitization and bounds

### 4.2 `tests/geminiResponse.test.ts`
**Source:** DGR `tests/geminiResponse.test.ts`
**Changes:**
- Test offline response bounds and shape
- Test normalization drops invalid actions
- Test text/action count bounds

### 4.3 `tests/geminiRoute.test.ts`
**Source:** DGR `tests/geminiRoute.test.ts`
**Changes:**
- Test offline response without API key
- Test auth enforcement when `HERMES_API_TOKEN` set
- Test oversized body rejection

### 4.4 `tests/health.test.ts`
**Source:** DGR `tests/health.test.ts`
**Changes:**
- Test resource pressure vs connectivity health independence

### 4.5 `tests/healthRoute.test.ts`
**Source:** DGR `tests/healthRoute.test.ts`
**Changes:**
- Test health endpoint contract (status, headers, shape)

---

## Phase 5: Build & Packaging (High)

### 5.1 `scripts/prepare-standalone.mjs`
**Source:** DGR `scripts/prepare-standalone.mjs`
**Changes:**
- Copy `.next/static` → `.next/standalone/.next/static`
- Copy `public/` → `.next/standalone/public/`
- Validate both exist before copying

### 5.2 `package.json` — Updates
**Source:** DGR `package.json` (adapted for Hermes deps)
**Changes:**
- Add `"type": "module"`
- Add `postbuild: "bun scripts/prepare-standalone.mjs"`
- Update `start: "bun .next/standalone/server.js"`
- Add `lint: "eslint ."`
- Add `typecheck: "tsc --noEmit"`
- Add `test` script pointing to test files
- Add `overrides` for `postcss` and `sharp`
- Add `packageManager: "bun@1.3.13"` and `engines.bun`
- Remove unused deps: `@hookform/resolvers`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `firebase-tools`
- Update `eslint-config-next` to match Next.js version

### 5.3 `next.config.ts` — Updates
**Source:** DGR `next.config.ts`
**Changes:**
- Remove `eslint.ignoreDuringBuilds`
- Remove `typescript.ignoreBuildErrors`
- Remove `images.remotePatterns` (not needed)
- Remove webpack HMR disable (not needed)
- Keep `output: 'standalone'` and `transpilePackages: ['motion']`

### 5.4 `.env.example` — Updates
**Source:** DGR `.env.example` (merged with Hermes)
**Changes:**
- Add `HERMES_API_TOKEN`, `HERMES_CHAT_RATE_LIMIT_PER_MINUTE`, `HERMES_GEMINI_TIMEOUT_MS`
- Keep `GEMINI_API_KEY`, `APP_URL`

---

## Phase 6: Documentation (Medium)

### 6.1 `README.md` — Complete Rewrite
**Source:** DGR `README.md` (adapted for Hermes branding)
**Changes:**
- Full feature list, tech stack, requirements
- Quick start with bun commands
- Environment variables table
- Commands table
- Dashboard usage (keyboard shortcuts, terminal commands)
- Gemini API docs
- Health check docs
- Project structure
- Production build instructions
- State and persistence notes
- Dependency policy
- Documentation maintenance
- Mature UI integration notes

### 6.2 `ARCHITECTURE.md` — New File
**Source:** DGR `ARCHITECTURE.md` (adapted)
**Changes:**
- High-level data flow diagram
- Source-of-truth boundaries table
- Node hierarchy invariants
- AI actions rules
- State ownership
- UI and performance guidelines
- Build and dependencies
- Current constraints
- Projection modes
- Action types table
- API contracts
- Component boundaries
- Validation gate
- UI merge guidance
- Definition of done

### 6.3 `AGENTS.md` — New File
**Source:** DGR `AGENTS.md` (adapted for Hermes)
**Changes:**
- Project intent
- Source-of-truth boundaries
- Required invariants (node hierarchy, AI actions, state ownership, UI/performance, build/deps)
- Development workflow
- UI merge guidance
- Definition of done
- Mature UI rules

---

## Phase 7: UI Reconciliation (Medium)

### 7.1 Update Components Using Context
**Files to review/update:**
- `components/c2/TerminalChatbox.tsx` — Ensure `executeAction` usage matches new signature
- `components/c2/TreeNav.tsx` — Ensure `selectNode` usage
- `components/c2/Inspector.tsx` — Ensure health/pressure imports from `lib/health.ts`
- `components/c2/OperationSphere.tsx` — Ensure `ProjectionMode` import
- `components/c2/CommandBar.tsx` — Ensure `triggerSearchSelectionHalo`/`clearSearchSelectionHalo`
- `app/page.tsx` — Ensure dynamic imports preserved, context provider unchanged

### 7.2 Update Projection Components
**Files to review:**
- `components/c2/GeoMapOverlay.tsx`
- `components/c2/DigitalDataFlowPaths.tsx`
- `components/c2/MiniMap.tsx` — Uses `getNodeResourcePressure`/`getNodeHealth`
- `components/c2/NodeHeartbeatRing.tsx` — Uses `getResourceLoadHeartbeat`
- `components/c2/KnowledgeSpaceView.tsx` — Lazy loaded

---

## Phase 8: Validation Gate

Run complete validation after each phase:

```powershell
bun install
bun run test
bun run typecheck
bun run lint
bun audit
bun run build
```

### Smoke Tests
- [ ] `bun run dev` — Homepage loads
- [ ] Terminal: `/help`, `/nodes`, `/select pdx`, `/clear`
- [ ] Terminal: Natural language prompt → Gemini response → actions execute
- [ ] Terminal: Offline mode (no API key) works
- [ ] Projections: Geographic, Digital, Physical, Ontology, Knowledge all render
- [ ] Tree nav: Expand/collapse, search, select
- [ ] Inspector: Metrics, health, logs, artifacts
- [ ] Command palette: Node search, projection switch, actions
- [ ] Keyboard shortcuts: All 12 shortcuts work
- [ ] `GET /health` returns 200 with correct shape
- [ ] `bun run build` produces `.next/standalone/.next/static`
- [ ] `bun run start` serves production build

---

## Phase 9: Lockfile Sync

```powershell
bun install
# Verify bun.lock and package-lock.json are clean
bun audit
```

---

## Rollback Plan

If any phase breaks the build:
1. `git stash` or revert the phase's commits
2. Run validation gate on clean baseline
3. Re-apply phase with fixes

---

## Success Criteria

All of the following must pass:
- [ ] `bun run test` — All 5 test suites pass
- [ ] `bun run typecheck` — Zero TypeScript errors
- [ ] `bun run lint` — Zero lint errors
- [ ] `bun audit` — No high/critical vulnerabilities
- [ ] `bun run build` — Standalone build succeeds, assets copied
- [ ] Smoke tests pass
- [ ] Documentation updated