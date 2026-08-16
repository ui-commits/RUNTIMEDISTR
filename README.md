# Hermes C2 — Command & Control Dashboard

Hermes C2 is an interactive command-and-control dashboard for exploring and operating a hierarchical infrastructure ontology. It combines geographic intelligence, digital topology, physical hardware, and ontology projections with a Gemini-powered terminal capable of validated navigation, diagnostics, and in-memory node mutations.

## Features

- **Five synchronized projections** over one node graph:
  - Geographic intelligence (default on load)
  - Digital topology
  - Physical hardware rack
  - Ontology matrix
- **Drill-down hierarchy** from global operations to regions, facilities, runtime services, and execution nodes.
- **Searchable command palette** for nodes, projections, and system actions.
- **Telemetry inspector** (left canvas panel) with metrics, health, logs, and snapshot artifacts.
- **Hierarchy tree navigation** (left canvas panel).
- **Natural-language Gemini terminal** with validated structured actions.
- **Local CLI commands** and a useful no-key/offline terminal mode.
- **Canvas-generated PNG snapshot artifacts** attached to node metadata.
- **Health rings, data-flow paths, time synchronization, keyboard controls, and responsive overlays**.
- **Sharp 90-degree panels**, consistent design tokens, and a subtle animated grid background.

## Technology

- Next.js 15 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Motion for animations
- Recharts for inspector telemetry
- React Markdown for terminal responses
- Google Gen AI SDK
- Bun test runner

## Requirements

- Bun 1.3.13 or newer
- Optional: Node.js 20 and npm 10 if you prefer npm-compatible install/audit workflows
- Optional: a Gemini API key for online AI responses

## Quick Start

Install dependencies:

```powershell
bun install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env.local
```

Set your Gemini key in `.env.local` if you want online AI behavior:

```dotenv
GEMINI_API_KEY="your-key-here"
```

Start the development server:

```powershell
bun run dev
```

Open http://localhost:3000.

The application still works without a Gemini key. The terminal returns an offline response and does not propose mutations.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | No | Enables server-side Gemini terminal responses. Without it, the API uses the offline fallback. |
| `HERMES_API_TOKEN` | No | Optional bearer token for `/api/gemini/chat` authentication. If set, requests must include `Authorization: Bearer <token>`. |
| `HERMES_CHAT_RATE_LIMIT_PER_MINUTE` | No | Max requests per minute to `/api/gemini/chat` per IP. Defaults to 30. |
| `HERMES_GEMINI_TIMEOUT_MS` | No | Server-side timeout for Gemini API calls in milliseconds. Defaults to 20000. |
| `PORT` | No | Port used by the standalone server; defaults to the Next.js server default. |
| `HOSTNAME` | No | Bind address used by the standalone server. |

Environment files are ignored by Git except for `.env.example`. Never commit API keys.

## Commands

| Command | Description |
| --- | --- |
| `bun run dev` | Start the Next.js development server. |
| `bun run test` | Run the node mutation, health, and Gemini-response unit tests. |
| `bun run typecheck` | Run TypeScript without emitting files. |
| `bun run lint` | Lint the entire project. |
| `bun audit` | Audit the Bun/npm-compatible dependency graph. |
| `bun run build` | Create the optimized standalone build and package browser assets. |
| `bun run start` | Start `.next/standalone/server.js` after a build. |

The app also exposes `GET /health` for production liveness checks. It returns a non-cacheable JSON response and does not touch Gemini, browser state, or the ontology.

Run the complete quality gate before merging changes:

```powershell
bun run test
bun run typecheck
bun run lint
bun audit
bun run build
```

## Using the Dashboard

### Keyboard Shortcuts

Single-key shortcuts are disabled while typing in an input, textarea, or editable element.

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + K` or `/` | Open command palette. |
| `?` | Open the shortcut guide. |
| `1` or `G` | Switch to Geographic projection. |
| `2` or `D` | Switch to Digital projection. |
| `3` or `P` | Switch to Physical projection. |
| `4` or `O` | Switch to Ontology projection. |
| `T` | Toggle the hierarchy tree. |
| `I` | Toggle the inspector. |
| `C` or backtick | Toggle the terminal. |
| `S` | Capture a snapshot artifact. |
| `R` | Reset the in-memory ontology. |
| `Escape` | Close menus and global modals. |

### Top Status Bar

The top status bar contains the brand, active target indicator, quick-jump location presets (Portland with an airplane icon, 515 NE Holladay with a house icon, and Global Earth with a globe icon), snapshot capture, a projection selector dropdown, and panel toggles (Tree, Inspector, Terminal, Reset). The projection selector dropdown is the single source of projection navigation; the earlier bottom-right projection switcher has been removed to avoid duplication.

The UI overlay opacity slider has been removed from the top bar; overlay opacity is now managed programmatically by C2 actions and the active projection.

### Canvas Layout

- The **Inspector** panel docks on the far-left canvas space; toggle with `I`.
- The **MiniMap** is always visible in the bottom-right corner of the canvas.
- The **TreeNav** overlays the left side when open (toggle with `T`).
- The **Terminal Chatbox** appears at the bottom center of the canvas (toggle with `C` or backtick).
- Double-clicking the digital canvas background toggles radial/grid organization. Zoom controls are constrained to the supported visualization range.

### Terminal Commands

The terminal accepts natural-language prompts and these local commands:

| Command | Action |
| --- | --- |
| `/help` | Display terminal command help. |
| `/nodes` | List the current node hierarchy. |
| `/select <nodeId>` | Focus an existing node without calling Gemini. |
| `/clear` or `/cls` | Clear terminal output. |

Examples of natural-language prompts:

```text
Take EMEA Command offline for maintenance
Inspect latency bottlenecks across the network
Add a cache_layer module under repos
Run a diagnostic on Primary Workstation
Jump focus to Eastern Seaboard Grid
```

Gemini responses can propose only the supported C2 actions. The browser validates every action again before changing state.

## Gemini API

The terminal calls:

```text
POST /api/gemini/chat
```

Request example:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Run a diagnostic on pdx"
    }
  ],
  "currentNodeId": "pdx",
  "nodesState": {},
  "model": "gemini-3.7-flash"
}
```

Response shape:

```json
{
  "text": "Diagnostic response",
  "actions": [
    {
      "type": "EXECUTE_DIAGNOSTIC",
      "payload": {
        "nodeId": "pdx"
      }
    }
  ]
}
```

The route accepts 1 to 50 messages, limits each message to 10,000 characters, and limits serialized node state to 250,000 characters. Unsupported models and malformed input are rejected before contacting Gemini.

Supported action types are `SELECT_NODE`, `UPDATE_STATUS`, `UPDATE_METRICS`, `ADD_LOG`, `CREATE_NODE`, `DELETE_NODE`, `TOGGLE_PIN`, `SET_RESOURCE_LOAD`, and `EXECUTE_DIAGNOSTIC`.

## Health Check

Production deployments can use:

```text
GET /health
```

Expected response:

```json
{
  "ok": true,
  "service": "hermes-c2",
  "status": "healthy",
  "timestamp": "2026-08-16T00:00:00.000Z"
}
```

The response includes `Cache-Control: no-store` and is intentionally shallow: it confirms that the Next.js server can execute route handlers without requiring a Gemini key or any browser-owned runtime state.

## Project Structure

```text
app/
  api/gemini/chat/       Validated server-side Gemini route
  health/route.ts        Shallow production liveness endpoint
  globals.css            Tailwind theme and shared design tokens
  layout.tsx             Fonts and application metadata
  page.tsx               Dashboard composition and global shortcuts
components/c2/           Dashboard panels and projection UI
hooks/                   Shared client hooks
lib/
  ontology.ts            Node types and initial hierarchy
  c2Context.tsx          Shared in-memory state and action execution
  c2Actions.ts           Pure validation and mutation helpers
  gemini.ts              Server-side Gemini client singleton
  geminiResponse.ts      Online/offline response normalization
  health.ts              Derived health presentation
scripts/
  prepare-standalone.mjs Standalone browser-asset packaging
tests/                   Node and Gemini response regression tests
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for data flow, state ownership, component boundaries, API contracts, and current constraints.

See [AGENTS.md](AGENTS.md) for contribution rules, architectural invariants, validation requirements, dependency handling, and UI merge guidance.

## Production Build

Build the application:

```powershell
bun run build
```

The build produces `.next/standalone` and then copies generated browser assets into that artifact. Start it with:

```powershell
bun run start
```

To select a port and host in PowerShell:

```powershell
$env:PORT = "3000"
$env:HOSTNAME = "127.0.0.1"
bun run start
```

For deployment, package the contents of `.next/standalone` after `bun run build`. Do not run `next start` against this configuration; the project uses the generated standalone server.

## Deployment

### GitHub

The canonical source lives in the public `ui-commits/RUNTIMEDISTR` repository. Push workflow:

```powershell
git remote add origin https://github.com/ui-commits/RUNTIMEDISTR.git
git push -u origin main
```

Git ignores `node_modules/`, `.next/`, environment files, logs, and coverage. Only `.env.example` is committed as a documented template. Never push real API keys or tokens.

### Vercel (recommended)

This project is Vercel-ready:

1. Import the GitHub repository at https://vercel.com/new from your Vercel account.
2. Vercel auto-detects the Next.js framework and the `packageManager: bun@1.3.13` field to install with Bun.
3. The `vercel.json` build command runs the full lifecycle (`bun run build`), including the standalone packaging postbuild.
4. Add the environment variables below under **Settings → Environment Variables**. All are optional; the app runs fully offline without `GEMINI_API_KEY`.

| Variable | Clipboard value |
| --- | --- |
| `GEMINI_API_KEY` | Gemini API key (keep private) |
| `HERMES_API_TOKEN` | Optional bearer token for `/api/gemini/chat` |
| `HERMES_CHAT_RATE_LIMIT_PER_MINUTE` | Optional, defaults to `30` |
| `HERMES_GEMINI_TIMEOUT_MS` | Optional, defaults to `20000` |

Notes specific to Vercel:

- `PORT` and `HOSTNAME` are for the standalone Node server and are ignored by Vercel; do not set them there.
- Serverless deployments may split the in-memory rate limiter across instances; the limiter bounds per-instance traffic only. See [ARCHITECTURE.md](ARCHITECTURE.md) constraints.
- `GET /health` stays fast and non-cacheable and works without Gemini or browser state.
- Deploy from the CLI with `vercel --prod` after linking the project, or push to the connected GitHub branch.

## State and Persistence

The operational graph is currently client-side and in-memory:

- Reloading resets nodes to `lib/ontology.ts`.
- Terminal mutations are session-local.
- Snapshot artifacts are PNG data URLs stored on nodes in memory.
- There is no authentication, database, or shared multi-user state yet.

These boundaries are intentional and documented so persistence can later be introduced without mixing storage logic into projection components.

## Dependency Policy

Bun is the active package manager for this checkout. Security overrides for PostCSS and Sharp in `package.json` are intentional. When dependencies change, synchronize `bun.lock`, keep `package-lock.json` compatible when npm is used, run a complete audit, and produce a successful standalone build.

Do not commit `node_modules`, `.next`, TypeScript build caches, environment files, logs, or coverage output.

## Documentation Maintenance

Update the documentation whenever you change:

- Commands or environment variables
- Node/action contracts
- State ownership or persistence
- Projection behavior
- Keyboard shortcuts
- Gemini models or API limits
- Build and deployment behavior
- Dependency or lockfile policy

## Mature UI Integration

The dashboard includes a fifth **Knowledge Space** projection: a curated, non-sensitive discovery layer that links records back to live ontology nodes. It is loaded only when requested, preserving the base dashboard's initial-load behavior.

The digital projection also provides:

- An interactive minimap with active-node, connectivity-health, resource-pressure, and pinned-node indicators.
- A search-selection halo when a node is chosen through Spotlight Search.
- Bounded recent-navigation history.
- Layout snapshots that persist the active node, projection, digital layout, and zoom for the browser session.
- Inspector controls for node pinning and operator-provided resource-load telemetry.

Resource load is deliberately separate from connectivity health. It is marked as operator-controlled sample telemetry in the UI and does not fabricate a live monitoring feed.