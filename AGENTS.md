# AGENTS.md

This file defines the working rules for humans and automated agents modifying the Hermes C2 repository. It applies to the entire project.

## Project Intent

Hermes C2 is a single-page command-and-control dashboard built with Next.js, React, and TypeScript. It visualizes an in-memory hierarchy of operational nodes through geographic, digital, physical, and ontology projections. A terminal can query or mutate that hierarchy through validated Gemini actions.

The current repository is the stability baseline for future UI integration. Preserve its state, validation, testing, security, and deployment behavior when importing visual work from another version.

## Source-of-Truth Boundaries

- `lib/ontology.ts` defines the node model and initial hierarchy.
- `lib/c2Context.tsx` owns live client state and exposes supported mutations.
- `lib/c2Actions.ts` contains pure validation and hierarchy mutation helpers.
- `app/api/gemini/chat/route.ts` is the only server-side Gemini boundary.
- `app/health/route.ts` is the shallow production liveness endpoint and must remain independent of Gemini and browser state.
- `lib/geminiResponse.ts` normalizes both online and offline terminal responses.
- `app/page.tsx` composes the dashboard and owns top-level panel/projection UI state.
- `components/c2/OperationSphere.tsx` selects and renders the four projection modes.
- `scripts/prepare-standalone.mjs` makes the standalone build deployable by copying browser assets.
- `tests/` protects the highest-risk state and AI-response invariants.

Read `ARCHITECTURE.md` before changing data flow, action handling, state ownership, or deployment behavior.

## Required Invariants

### Node Hierarchy

- Every non-root node must reference an existing `parentId`.
- A parent must include each direct child in `childrenIds`.
- Node IDs are sanitized, non-empty, and unique.
- The `earth` root node cannot be deleted.
- Deleting a node deletes its entire descendant subtree and repairs surviving parent links.
- If the active node is deleted, focus returns to `earth`.
- Use the pure functions in `lib/c2Actions.ts`; do not duplicate hierarchy mutation logic in components.

### AI Actions

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

### State Ownership

- Runtime node changes are intentionally client-side and in-memory.
- Components consume state through `useC2()` rather than importing and mutating initial ontology data.
- Keep `nodesRef` and `activeNodeIdRef` synchronized with React state so sequential AI actions operate on current values.
- Keep pure mutation logic outside React where it can be tested directly.

### UI and Performance

- Reuse design tokens from `app/globals.css` before introducing new hard-coded colors.
- Prefer sharp (90-degree) corners for panels and cards; reserve `rounded-full` for status indicators and small badges.
- Preserve keyboard accessibility and do not trigger single-key shortcuts while users are typing.
- Keep heavy closed-by-default panels dynamically imported in `app/page.tsx`. In particular, avoid moving Recharts or React Markdown back into the initial bundle.
- Projection components receive `NodeData`; they must not become alternate state stores.
- The default projection on app load is `geographic`. The projection selector dropdown in the top status bar is the single source of projection navigation; remove duplicate switchers from canvas overlays.
- Preserve the four projection IDs: `geographic`, `digital`, `physical`, and `ontology`. The `knowledge` projection is a fifth loaded only on demand.
- Keep the dashboard usable at common desktop widths and avoid breaking the existing responsive panel sizing.

### Build and Dependencies

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

## Development Workflow

1. Inspect the relevant component, its callers, and its data source before editing.
2. Make the smallest coherent change that preserves the boundaries above.
3. Add or update tests for mutations, validation, parsing, and regressions.
4. Run the complete validation gate.
5. For visual changes, run the app and verify all affected projections and overlays.

Required validation gate:

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

## Mature UI Rules

- Keep ProjectionMode sourced from lib/projections.ts; do not create local projection unions.
- Knowledge Space content must be curated, non-sensitive, and link to nodes by ID. Do not embed personal addresses, private identifiers, or claims presented as live operational facts.
- Treat resource load as explicitly supplied sample/operator telemetry unless a real telemetry adapter is introduced. It must remain separate from getNodeHealth.
- Use C2Provider methods for pinning, load updates, snapshots, and history so terminal actions retain validation.
- Preserve dynamic loading for heavy panels and retain coordinate-based SVG primitives. Do not reintroduce CSS calc(...) inside SVG path data.
- The inspector panel docks on the far-left canvas space and is pulled out with the slim left-edge tab; the hierarchy Tree docks on the far-right canvas space via the right-edge tab; the MiniMap stays fixed in the bottom-left. The top status bar is the single source for projection selection and snapshot capture (the Camera button sits immediately left of the centered projection dropdown). The active color accent is ops blue (#3b82f6); reset is folded into the brand logo, not a header button.
- The top status bar must not include a duplicate projection switcher, an opacity slider dropdown, the Inspector/Terminal/Tree toggles, or a standalone Reset button; these were removed. The Inspector opens from the left-edge shelf pull-tab, the Tree from the right-edge shelf pull-tab, and the Terminal from the bottom-center dock tab.
- The bottom-right telemetry widget is a single consolidated box containing the Traffic Monitor toggle, the spike-trigger, the active TARGET telemetry, and (in geographic projection) the GEO LOCKED name/address/sector row. Do not reintroduce separate top-left traffic monitor or bottom-left location badges.