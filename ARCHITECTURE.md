# Architecture

This document describes the data flow, state ownership, component boundaries, API contracts, and current constraints of the Hermes C2 dashboard.

## High-Level Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Client (React) │────▶│  /api/gemini/chat │────▶│  Google Gen AI SDK  │
│  Terminal Input │     │  (Next.js Route) │     │  (Gemini Models)    │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
        ▲                       │                         │
        │                       ▼                         ▼
        │              ┌──────────────────┐     ┌─────────────────────┐
        │              │ lib/geminiResponse│     │  lib/c2Actions.ts   │
        │              │  normalize/validate│     │  action validation  │
        │              └──────────────────┘     └─────────────────────┘
        │                       │                         │
        ▼                       ▼                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  C2Context      │     │  lib/health.ts   │     │  lib/ontology.ts    │
│  (Client State) │     │  Derived Health  │     │  Node Types & Data  │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
```

## Source-of-Truth Boundaries

| File | Responsibility |
| --- | --- |
| `lib/ontology.ts` | Node model (`NodeData`), initial hierarchy, `getNodePriority` |
| `lib/c2Context.tsx` | Live client state (`nodes`, `activeNodeId`), mutation API |
| `lib/c2Actions.ts` | Pure validation & mutation helpers (`normalizeC2Action`, `createNodeState`, `deleteNodeSubtreeState`) |
| `app/api/gemini/chat/route.ts` | Server-side Gemini boundary, request validation, rate limiting, auth |
| `app/health/route.ts` | Shallow production liveness endpoint |
| `lib/geminiResponse.ts` | Online/offline response normalization |
| `app/page.tsx` | Dashboard composition, top-level panel/projection UI state |
| `components/c2/OperationSphere.tsx` | Projection selection & rendering |
| `scripts/prepare-standalone.mjs` | Standalone build browser-asset packaging |
| `tests/` | Regression tests for mutations, validation, parsing |

## Node Hierarchy Invariants

- Every non-root node must reference an existing `parentId`.
- A parent must include each direct child in `childrenIds`.
- Node IDs are sanitized, non-empty, and unique (lowercase alphanumeric + underscore, max 128 chars).
- The `earth` root node cannot be deleted.
- Deleting a node deletes its entire descendant subtree and repairs surviving parent links.
- If the active node is deleted, focus returns to `earth`.
- Use the pure functions in `lib/c2Actions.ts`; do not duplicate hierarchy mutation logic in components.

## AI Actions

- Treat model output and API input as untrusted data.
- Only action types accepted by `normalizeC2Action` may reach state mutation code.
- Validate node existence, statuses, metrics, logs, and payload shapes before mutation.
- The terminal response shape is always `{ text: string, actions: C2Action[] }`.
- Missing `GEMINI_API_KEY` must continue to return a useful offline response with HTTP 200.
- Never expose `GEMINI_API_KEY` to client components or `NEXT_PUBLIC_*` variables.
- Do not return raw server exceptions to the client.

When adding or changing an AI action, update all of the following together:

1. The action allowlist and normalization in `lib/c2Actions.ts`.
2. The execution switch in `lib/c2Context.tsx`.
3. The Gemini action instructions/schema in `app/api/gemini/chat/route.ts`.
4. Relevant tests in `tests/`.

## State Ownership

- Runtime node changes are intentionally client-side and in-memory.
- Components consume state through `useC2()` rather than importing and mutating initial ontology data.
- Keep `nodesRef` and `activeNodeIdRef` synchronized with React state so sequential AI actions operate on current values.
- Keep pure mutation logic outside React where it can be tested directly.

## UI and Performance

- Reuse design tokens from `app/globals.css` before introducing new hard-coded colors.
- Preserve keyboard accessibility and do not trigger single-key shortcuts while users are typing.
- Keep heavy closed-by-default panels dynamically imported in `app/page.tsx`. In particular, avoid moving Recharts or React Markdown back into the initial bundle.
- Projection components receive `NodeData`; they must not become alternate state stores.
- Preserve the four projection IDs: `geographic`, `digital`, `physical`, and `ontology`.
- Keep the dashboard usable at common desktop widths and avoid breaking the existing responsive panel sizing.

## Build and Dependencies

- Bun is the active package manager for this checkout. `bun.lock` must describe the direct dependency intent.
- `package-lock.json` is kept for npm-compatible installs when Node/npm are available.
- The PostCSS and Sharp overrides in `package.json` are intentional security pins. Do not remove them without a clean audit and successful production build.
- Do not hand-edit lockfiles. Regenerate them with their package managers.
- Do not commit `node_modules/`, `.next/`, TypeScript build caches, logs, coverage, or environment files.
- `next.config.ts` uses `output: "standalone"`. If that changes, update the build/start documentation and packaging script together.
- `bun run build` automatically runs `postbuild`; do not bypass it when producing a deployable artifact.
- `GET /health` must stay fast, non-cacheable, side-effect free, and independent of external services.

For dependency changes:

```powershell
bun install
bun audit
bun run build
```

Confirm that both lockfiles no longer reference removed packages or vulnerable transitive versions.

## Deployment Targets

### Vercel (primary)

- The repo is imported into Vercel with the framework preset `nextjs` and build command `bun run build` (see `vercel.json`). Vercel installs dependencies with Bun because `packageManager` is set to `bun@1.3.13`.
- Builds use the standard serverless output; the standalone artifact is produced by the `postbuild` step but is not consumed by Vercel.
- Environment variables are configured in the Vercel project settings and are never committed. `PORT`/`HOSTNAME` are standalone-only and must not be set in Vercel.
- Runtime constraints to remember on Vercel:
  - The rate limiter and per-IP buckets are in-memory `Map`s; on serverless instances they bound per-instance traffic only. Do not rely on them as a global or security boundary.
  - The in-memory node graph is per browser tab and resets on reload; Vercel does not provide shared state.
  - `GEMINI_API_KEY` lives only in server-side route handlers (`app/api/gemini/chat/route.ts`); it is never exposed to client components.

### Standalone Node server (self-host)

- `bun run build` produces `.next/standalone` with browser assets copied in by `scripts/prepare-standalone.mjs`.
- Start with `bun run start` (`bun .next/standalone/server.js`). Use `PORT` and `HOSTNAME` to bind a specific address.
- Package the entire `.next/standalone` directory for Docker or VM deployment. Do not run `next start` against this configuration.

`GET /health` behaves identically on both targets: fast, non-cacheable, side-effect free, and independent of Gemini and browser state.

## Current Constraints

1. **No persistence** — The operational graph is client-side and in-memory. Reloading resets to `lib/ontology.ts`.
2. **No authentication** — The optional `HERMES_API_TOKEN` protects only the Gemini chat endpoint. There is no user identity or session management.
3. **No shared multi-user state** — Each browser tab maintains its own node hierarchy.
4. **Snapshot artifacts are ephemeral** — PNG data URLs stored on nodes in memory; not persisted.
5. **Gemini model allowlist is static** — Defined in `app/api/gemini/chat/route.ts` (`ALLOWED_MODELS`).
6. **Rate limiting is in-memory** — Per-IP buckets stored in a `Map`; not distributed.
7. **Health endpoint is shallow** — Does not verify database, Gemini connectivity, or browser state.
8. **Resource load is operator-supplied** — Not connected to real telemetry; marked as sample data in UI.
9. **Knowledge Space content is curated** — Non-sensitive, links to nodes by ID; no personal addresses or private identifiers.

## Projection Modes

Defined in `lib/projections.ts`:

- `geographic` — Map-based view with node positions
- `digital` — Radial/grid topology graph
- `physical` — Hardware rack visualization
- `ontology` — Type/metadata matrix
- `knowledge` — Curated discovery layer (lazy-loaded)

## Action Types (C2)

| Type | Payload | Description |
| --- | --- | --- |
| `SELECT_NODE` | `{ nodeId }` | Focus a node |
| `UPDATE_STATUS` | `{ nodeId, status }` | Change node status |
| `UPDATE_METRICS` | `{ nodeId, metrics }` | Update telemetry |
| `ADD_LOG` | `{ nodeId, log }` | Append log entry |
| `CREATE_NODE` | `{ parentId, id, label, type, status?, description?, metrics? }` | Provision new node |
| `DELETE_NODE` | `{ nodeId }` | Remove node + subtree |
| `TOGGLE_PIN` | `{ nodeId, pinned? }` | Pin/unpin node coordinates |
| `SET_RESOURCE_LOAD` | `{ nodeId, load }` | Set operator resource load (0-100) |
| `EXECUTE_DIAGNOSTIC` | `{ nodeId }` | Run integrity scan |

## API Contracts

### POST /api/gemini/chat

**Request:**

```json
{
  "messages": Array<{ role: "user" | "assistant", content: string }>,
  "currentNodeId"?: string,
  "nodesState"?: Record<string, unknown>,
  "model"?: string
}
```

**Constraints:**
- 1–50 messages
- Each message ≤ 10,000 chars
- Total message content ≤ 250,000 chars
- Serialized `nodesState` ≤ 250,000 chars
- Request body ≤ 900,000 bytes
- Model must be in `ALLOWED_MODELS`

**Response (200):**

```json
{
  "text": "string",
  "actions": Array<{ type: string, payload: Record<string, unknown> }>
}
```

**Error Responses:**
- `400` — Malformed JSON, invalid messages, unsupported model, oversized node state
- `401` — Missing/invalid `HERMES_API_TOKEN` (when configured)
- `413` — Request body exceeds size limit
- `429` — Rate limit exceeded (includes `Retry-After` header)
- `500` — Internal server error (Gemini call failed)

### GET /health

**Response (200):**

```json
{
  "ok": true,
  "service": "global-distribution-runtime",
  "status": "healthy",
  "timestamp": "ISO8601"
}
```

Headers: `Cache-Control: no-store`

## Component Boundaries

### app/page.tsx
- Composes the dashboard shell
- Owns projection mode, panel visibility (tree, inspector, terminal, command bar, key map, minimap)
- Manages global keyboard shortcuts
- Provides `C2Provider` to descendants

### components/c2/OperationSphere.tsx
- Renders the active projection component
- Receives `nodes`, `activeNodeId`, `onSelectNode` from context
- Does not mutate state directly

### components/c2/TreeNav.tsx
- Hierarchy tree with expand/collapse, search, selection
- Calls `selectNode` from context

### components/c2/TerminalChatbox.tsx
- Terminal UI: history, input, local commands, Gemini streaming
- Calls `/api/gemini/chat` and executes returned actions via `executeAction`

### components/c2/Inspector.tsx
- Node detail panel: metrics, health, logs, artifacts
- Reads from context, does not mutate

### components/c2/CommandBar.tsx
- Spotlight search: nodes, projections, actions
- Triggers `triggerSearchSelectionHalo` on node selection

### lib/c2Context.tsx (C2Provider)
- Single source of truth for client state
- Exposes mutation methods that validate via `lib/c2Actions.ts`
- Maintains `nodesRef`/`activeNodeIdRef` for synchronous reads in `executeAction`

## Validation Gate

Before merging changes:

```powershell
bun run test
bun run typecheck
bun run lint
bun audit
bun run build
```

The build must perform real type and lint validation. Do not reintroduce `ignoreBuildErrors` or `ignoreDuringBuilds`.

## UI Merge Guidance

When integrating another version of the project:

- Treat this repository as authoritative for `lib/`, `app/api/`, `tests/`, package scripts, security overrides, and standalone deployment behavior.
- Treat the donor project as authoritative only for explicitly selected presentation, styling, assets, and interaction improvements.
- Manually reconcile mixed logic/UI files such as `app/page.tsx`, `OperationSphere.tsx`, `Inspector.tsx`, `TreeNav.tsx`, and `TerminalChatbox.tsx`.
- Do not copy entire source folders over this repository.
- Do not copy generated folders or donor lockfiles.
- Integrate in layers: tokens and global CSS, shell, presentational components, panels, projection internals, then interactions.
- Run the validation gate after each meaningful layer.

## Definition of Done

A change is complete only when:

- Behavior matches the request.
- Architectural invariants remain intact.
- Tests, typecheck, lint, audit, and production build pass.
- Standalone browser assets are present under `.next/standalone/.next/static` after building.
- The homepage and any modified runtime path have been smoke-tested.
- Documentation is updated when commands, environment variables, actions, data contracts, or architecture change.