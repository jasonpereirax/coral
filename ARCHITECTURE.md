# Coral — Architecture Document

> **The product brain for AI-native teams.**
> Built by your team, consumed by AI.

Version: 0.1.0 · Created: 2026-06-23

---

## 1. Vision

Coral is the visual, collaborative, structured source of truth for digital product architecture. It replaces the scattered markdown files, Notion docs, and Obsidian notes that teams use to maintain context across AI coding sessions.

Core loop: **Describe → Map → Enrich → Export → Build**

1. User describes their product (or imports from Figma)
2. AI builds initial product graph (journeys, screens, APIs, components)
3. Team enriches the graph in layers (design, API contracts, accessibility)
4. Context is exported to any AI tool (Claude Code, Cursor, Lovable) via MCP Server, clipboard, JSON, or CLAUDE.md
5. AI generates code that already knows the product architecture

Coral does NOT generate code. It generates **context** — the structured knowledge that makes any AI tool generate better code.

---

## 2. What Carries Over from Flowbridge

### Keep (proven patterns)
- Next.js 15 App Router architecture
- TypeScript strict mode, single-source types
- Zustand + Immer for canvas state management
- Canvas interaction patterns (pan, zoom, drag, pointer capture)
- SVG Bezier connector rendering
- Supabase for auth + database
- Tailwind CSS for styling
- localStorage persistence pattern (free tier)

### Remove (no longer relevant)
- `/api/generate` route and Claude API dependency
- `useGenerate` hook and SSE streaming
- `prompt-builder.ts` (generation prompts)
- Figma fidelity engine (`extract.ts`, `mcp.ts`, `images.ts`)
- Preview build-free (`/api/preview`)
- GeneratedFile type and generation history
- Any UI centered on "generate code" as primary action

### Transform
- MacroNode type system → expanded node types (Journey, Screen, DS, API, Component)
- ScreenContext → enriched with cross-screen context, states, visual source options
- Connection model → multi-type connections (not just DS→Journey)
- RightPanel → contextual overlay system (no fixed panel)
- Ibar verticals → Layer system (Architecture, APIs, Components, A11y, Quality)

---

## 3. Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 15 (App Router) | Server Components for dashboard. Client for canvas. |
| Language | TypeScript (strict) | All domain types in `types/index.ts` |
| State | Zustand 5 + Immer | Canvas state. Persist to localStorage (free tier) |
| Styling | Tailwind CSS v4 | New project = latest Tailwind. Design tokens as CSS vars |
| Auth/DB | Supabase SSR | Enabled from day 1. Auth + Postgres + Realtime |
| Icons | Lucide React | Consistent, tree-shakeable |
| Fonts | Space Grotesk (display) + DM Sans (body) + JetBrains Mono (code) | New brand identity |
| Canvas | Custom SVG + DOM | Same proven approach from Flowbridge |

### Deliberate exclusions
- **No Claude API / Anthropic SDK** — Coral doesn't generate code
- **No Figma SDK as hard dependency** — Figma is one optional visual source
- **No Express / custom server** — Route Handlers only

---

## 4. Data Model

### 4.1 Core Entities

```typescript
// ═══ PRIMITIVES ═══
type ProjectId    = string
type NodeId       = string
type ConnectionId = string
type ScreenId     = string
type EndpointId   = string
type ComponentId  = string
type LayerId      = string
type UserId       = string

// ═══ PROJECT ═══
interface Project {
  id:          ProjectId
  ownerId:     UserId
  name:        string
  description: string
  icon:        string          // emoji or icon key
  color:       string          // brand color hex
  settings:    ProjectSettings
  createdAt:   string
  updatedAt:   string
}

interface ProjectSettings {
  framework:   'nextjs' | 'react-vite' | 'remix' | 'astro' | 'nuxt' | 'sveltekit'
  language:    'typescript' | 'javascript'
  styling:     'tailwind' | 'css-modules' | 'styled-components' | 'vanilla'
  componentLib: string         // 'shadcn-ui', 'radix', 'chakra', etc.
  outputDir:   string          // 'src/app', 'src/pages', etc.
}
```

### 4.2 Graph Nodes

The graph has 4 first-class node types. All share a base interface.

```typescript
type NodeType = 'journey' | 'screen' | 'ds' | 'api'

interface BaseNode {
  id:        NodeId
  projectId: ProjectId
  type:      NodeType
  name:      string
  position:  XY
  createdAt: string
  updatedAt: string
}

// ═══ JOURNEY NODE ═══
interface JourneyNode extends BaseNode {
  type:        'journey'
  description: string
  screens:     ScreenNode[]      // embedded
  flowOrder:   ScreenId[]        // ordered sequence
  status:      'draft' | 'partial' | 'complete'
}

// ═══ SCREEN NODE ═══
// Screens live inside Journeys but are first-class entities in the graph
interface ScreenNode {
  id:          ScreenId
  journeyId:   NodeId
  name:        string
  position:    XY
  order:       number
  isEntry:     boolean
  isError:     boolean
  context:     ScreenContext
  visualSource: VisualSource | null
  createdAt:   string
  updatedAt:   string
}

// ═══ DESIGN SYSTEM NODE ═══
interface DSNode extends BaseNode {
  type:        'ds'
  components:  ComponentDef[]
  figmaFileUrl?: string
  figmaFileKey?: string
  syncStatus:  'synced' | 'outdated' | 'disconnected'
  lastSyncAt?: string
}

interface ComponentDef {
  id:          ComponentId
  name:        string          // 'MenuItem', 'CartDrawer'
  category:    string          // 'atoms', 'molecules', 'organisms'
  variants:    string[]        // ['default', 'unavailable', 'promo']
  usedIn:      ScreenId[]      // traceability: which screens use this
}

// ═══ API NODE ═══
interface APINode extends BaseNode {
  type:        'api'
  baseUrl:     string          // 'https://api.gofood.com/v1'
  endpoints:   APIEndpoint[]
}

interface APIEndpoint {
  id:          EndpointId
  method:      'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'WS'
  path:        string          // '/restaurants/:id/menu'
  description: string
  requestShape:  string        // '{ restaurantId, itemId, quantity }'
  responseShape: string        // '{ cartId, items, subtotal }'
  usedBy:      ScreenId[]      // traceability: which screens consume this
}
```

### 4.3 Screen Context (the core value)

```typescript
interface ScreenContext {
  purpose:       string        // what this screen does
  userIntent:    string        // what the user wants to accomplish
  route:         string        // '/restaurant/:restaurantId/menu'
  requiresAuth:  boolean
  states:        string[]      // ['loading', 'loaded', 'error', 'empty']
  components:    string[]      // component names from DS
  endpoints:     EndpointRef[] // references to API endpoints
  notes:         string        // architecture notes
  crossScreen:   CrossScreenContext
}

interface EndpointRef {
  endpointId: EndpointId
  purpose:    string           // why this screen uses this endpoint
}

interface CrossScreenContext {
  sharedComponents:  string[]     // components used in other screens too
  previousScreen:    ScreenId | null
  nextScreen:        ScreenId | null
  relatedScreens:    ScreenId[]   // screens in other journeys that share context
}

interface VisualSource {
  type:    'figma' | 'upload' | 'description' | 'url'
  // Figma
  figmaUrl?:      string
  figmaNodeId?:   string
  figmaFileKey?:  string
  thumbnailUrl?:  string
  // Upload
  imageUrl?:      string
  // Description
  description?:   string
  // URL (screenshot of existing app)
  sourceUrl?:     string
}

const EMPTY_CONTEXT: ScreenContext = {
  purpose: '', userIntent: '', route: '', requiresAuth: false,
  states: [], components: [], endpoints: [], notes: '',
  crossScreen: {
    sharedComponents: [], previousScreen: null,
    nextScreen: null, relatedScreens: []
  }
}
```

### 4.4 Connections

```typescript
type ConnectionType =
  | 'ds-journey'       // DS provides components to Journey
  | 'api-journey'      // API serves endpoints to Journey
  | 'api-screen'       // specific endpoint → specific screen
  | 'screen-screen'    // flow sequence within journey
  | 'journey-journey'  // cross-journey reference (shared components)

interface Connection {
  id:        ConnectionId
  projectId: ProjectId
  type:      ConnectionType
  fromId:    NodeId | ScreenId | EndpointId
  toId:      NodeId | ScreenId
  label?:    string
}
```

### 4.5 Product Memory

```typescript
interface MemoryEntry {
  id:        string
  projectId: ProjectId
  userId:    UserId | 'ai'
  action:    string           // 'added context for Welcome screen'
  entityType: NodeType | 'screen' | 'endpoint' | 'component'
  entityId:  string
  layer:     LayerType
  timestamp: string
}

type LayerType = 'architecture' | 'apis' | 'components' | 'accessibility' | 'quality'
```

### 4.6 Context Export

```typescript
interface ExportConfig {
  scope:    'project' | 'journey' | 'screen'
  scopeId:  string
  format:   'mcp' | 'json' | 'markdown' | 'clipboard'
  layers:   LayerType[]       // which layers to include
}

// The export engine reads the graph and produces structured context
// for consumption by AI tools
interface ExportedContext {
  project:      Pick<Project, 'name' | 'settings'>
  journeys:     ExportedJourney[]
  apiContracts: ExportedEndpoint[]
  components:   ExportedComponent[]
  crossScreenContext: Record<ScreenId, CrossScreenContext>
}
```

### 4.7 Completeness Scoring

```typescript
// Recalibrated for Coral — no more Figma weight
// Context quality is what matters
const COMPLETENESS_WEIGHTS = {
  purpose:     25,  // what the screen does
  route:       15,  // URL route
  states:      15,  // loading, error, empty, etc.
  endpoints:   20,  // API contracts linked
  components:  15,  // DS components mapped
  visualSource: 10, // any visual reference (optional)
}
// Total: 100
```

---

## 5. Project Structure

```
coral/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx            # OAuth (GitHub, Google)
│   ├── (dashboard)/
│   │   ├── page.tsx                  # Project list (Server Component)
│   │   └── layout.tsx                # Auth guard
│   ├── projects/[id]/
│   │   └── brain/page.tsx            # The Product Brain canvas
│   ├── api/
│   │   ├── onboard/route.ts          # AI graph creation from description
│   │   ├── suggest/route.ts          # AI suggestions for context enrichment
│   │   ├── export/route.ts           # Context export (JSON, markdown)
│   │   ├── mcp/route.ts              # MCP Server endpoint
│   │   └── figma/route.ts            # Figma REST proxy (optional)
│   ├── auth/callback/route.ts
│   └── layout.tsx                    # Root: fonts, providers
├── components/
│   ├── brain/                        # The Product Brain canvas
│   │   ├── BrainCanvas.tsx           # Main canvas component
│   │   ├── NeuralLayer.tsx           # SVG connection rendering
│   │   └── ContextOverlay.tsx        # Floating contextual panel
│   ├── nodes/
│   │   ├── JourneyNode.tsx
│   │   ├── DSNode.tsx
│   │   ├── APINode.tsx
│   │   └── ScreenDots.tsx            # Mini screen indicators inside Journey
│   ├── layers/
│   │   ├── LayerTabs.tsx             # Architecture | APIs | Components | A11y
│   │   └── LayerBadges.tsx           # Contextual badges per active layer
│   ├── export/
│   │   ├── ExportDock.tsx            # Floating bottom bar
│   │   └── ExportPreview.tsx         # Shows what will be exported
│   ├── memory/
│   │   └── MemoryTimeline.tsx        # Product memory floating panel
│   ├── onboard/
│   │   ├── DescribeStep.tsx          # "Describe your product"
│   │   └── BuildingStep.tsx          # AI building animation
│   ├── chrome/
│   │   ├── TopBar.tsx                # Floating top bar
│   │   ├── Sidebar.tsx               # Left icon strip (layers)
│   │   └── HealthPills.tsx           # Context %, APIs, DS count
│   └── ui/                           # Shared primitives
│       ├── Button.tsx
│       ├── Badge.tsx
│       ├── Input.tsx
│       └── Tooltip.tsx
├── hooks/
│   ├── useCanvasInteraction.ts       # Pan, zoom, drag, connect (from Flowbridge)
│   ├── useGraph.ts                   # Graph traversal, neighbor lookup
│   ├── useExport.ts                  # Context export logic
│   ├── useLayers.ts                  # Active layer state + badge computation
│   └── useAuth.ts                    # Supabase auth
├── lib/
│   ├── store/
│   │   ├── index.ts                  # Zustand store
│   │   ├── slices/                   # Modular slices
│   │   │   ├── project.ts
│   │   │   ├── graph.ts              # nodes, connections, screens
│   │   │   ├── canvas.ts             # view, transform, selection
│   │   │   ├── layers.ts             # active layer, badges
│   │   │   └── memory.ts             # product memory entries
│   │   └── selectors.ts              # Derived state (completeness, health)
│   ├── export/
│   │   ├── to-markdown.ts            # Graph → CLAUDE.md format
│   │   ├── to-json.ts                # Graph → structured JSON
│   │   ├── to-clipboard.ts           # Graph → formatted clipboard
│   │   └── to-mcp.ts                 # Graph → MCP Server response format
│   ├── graph/
│   │   ├── traversal.ts              # Find connected nodes, shared components
│   │   ├── completeness.ts           # Score calculation
│   │   └── impact.ts                 # "If X changes, what's affected?"
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── ai/
│       └── onboard.ts                # AI-assisted graph creation
├── types/
│   └── index.ts                      # ALL domain types (single source of truth)
├── utils/
│   ├── cn.ts                         # classname util
│   ├── id.ts                         # uid generation
│   └── factories.ts                  # makeJourney, makeScreen, etc.
├── styles/
│   └── tokens.css                    # Design tokens (Coral brand)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── public/
│   └── coral-icon.svg
├── CLAUDE.md                         # Context file for Claude Code
├── .cursorrules                      # Context file for Cursor
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## 6. Milestone Roadmap

### M0 — Scaffold (Week 1)
- [ ] Create repo, install dependencies
- [ ] Configure Next.js 15 + TypeScript + Tailwind v4
- [ ] Set up Supabase project (auth + initial schema)
- [ ] Create types/index.ts with full domain model
- [ ] Set up Zustand store with slices
- [ ] CLAUDE.md + .cursorrules for AI-assisted development
- [ ] Deploy empty shell to Vercel
- **Ship:** Repo exists, builds, deploys, has auth working

### M1 — Product Brain Canvas (Weeks 2-3)
- [ ] Port canvas interaction from Flowbridge (pan, zoom, drag)
- [ ] Implement node rendering (Journey, DS, API)
- [ ] Implement neural connections (SVG Bezier with gradients)
- [ ] Screen dots inside Journey nodes
- [ ] Node selection with glow effect
- [ ] Layer tabs (Architecture, APIs, Components, A11y)
- [ ] Health pills (context %, API count, DS count)
- [ ] Connection hover glow animation
- **Ship:** Interactive product graph with nodes and connections

### M2 — Context Overlay + Enrichment (Weeks 3-4)
- [ ] Contextual overlay system (replaces RightPanel)
- [ ] Screen context editor (purpose, route, states, user intent)
- [ ] API contract editor (method, path, request/response shape)
- [ ] Component mapping (link DS components to screens)
- [ ] Visual Source selector (Figma | Upload | Describe)
- [ ] Completeness scoring with visual ring
- [ ] Cross-screen context (shared components, flow sequence)
- **Ship:** Full context enrichment workflow

### M3 — Context Export (Week 5)
- [ ] Export to clipboard (formatted markdown)
- [ ] Export to JSON (structured)
- [ ] Export to CLAUDE.md format
- [ ] Export dock UI (floating bottom bar)
- [ ] Scoped export (project / journey / screen level)
- **Ship:** Users can export context to AI tools

### M4 — AI Onboarding (Week 6)
- [ ] "Describe your product" input screen
- [ ] AI graph builder (Claude API, one-time use for onboarding)
- [ ] Animated building sequence
- [ ] Generated graph review + edit
- **Ship:** Zero-friction onboarding, no blank canvas

### M5 — MCP Server (Weeks 7-8)
- [ ] MCP Server endpoint (`/api/mcp`)
- [ ] Tool definitions: `get_product_context`, `get_journey`, `get_screen`, `get_api_contracts`
- [ ] Scoped context retrieval (AI asks for what it needs)
- [ ] Connection documentation for Claude Code + Cursor
- **Ship:** AI tools can query product context directly

### M6 — Collaboration + Memory (Weeks 8-10)
- [ ] Supabase Realtime for multi-user canvas
- [ ] Product Memory timeline (who changed what, when)
- [ ] AI suggestions (proactive context enrichment)
- [ ] User avatars and presence indicators
- **Ship:** Teams can work together on the product brain

### M7 — Governance Layer (Weeks 10-12)
- [ ] DS component traceability (where is each component used?)
- [ ] Change impact analysis ("if Button changes, 12 screens affected")
- [ ] Sync status tracking (DS ↔ Figma)
- [ ] Governance dashboard
- **Ship:** Design System governance with traceability

---

## 7. Database Schema (Supabase)

```sql
-- Core tables
create table projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users(id),
  name        text not null,
  description text default '',
  icon        text default '🪸',
  color       text default '#6366F1',
  settings    jsonb not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table nodes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  type        text not null check (type in ('journey', 'ds', 'api')),
  name        text not null,
  data        jsonb not null default '{}',  -- type-specific data
  position_x  float not null default 0,
  position_y  float not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table screens (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references projects(id) on delete cascade,
  journey_id    uuid references nodes(id) on delete cascade,
  name          text not null,
  "order"       int not null default 0,
  is_entry      boolean default false,
  is_error      boolean default false,
  context       jsonb not null default '{}',
  visual_source jsonb,
  position_x    float not null default 0,
  position_y    float not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table connections (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  type        text not null,
  from_id     uuid not null,
  to_id       uuid not null,
  label       text,
  created_at  timestamptz default now()
);

create table memory_entries (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  user_id     uuid references auth.users(id),
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  layer       text not null,
  created_at  timestamptz default now()
);

-- RLS
alter table projects enable row level security;
alter table nodes enable row level security;
alter table screens enable row level security;
alter table connections enable row level security;
alter table memory_entries enable row level security;

-- Policies (owner-based for now, team-based in M6)
create policy "Users can CRUD their own projects"
  on projects for all using (owner_id = auth.uid());

create policy "Users can CRUD nodes in their projects"
  on nodes for all using (
    project_id in (select id from projects where owner_id = auth.uid())
  );

create policy "Users can CRUD screens in their projects"
  on screens for all using (
    project_id in (select id from projects where owner_id = auth.uid())
  );

create policy "Users can CRUD connections in their projects"
  on connections for all using (
    project_id in (select id from projects where owner_id = auth.uid())
  );

create policy "Users can read memory in their projects"
  on memory_entries for select using (
    project_id in (select id from projects where owner_id = auth.uid())
  );

-- Indexes
create index idx_nodes_project on nodes(project_id);
create index idx_screens_journey on screens(journey_id);
create index idx_connections_project on connections(project_id);
create index idx_memory_project on memory_entries(project_id, created_at desc);

-- Realtime
alter publication supabase_realtime add table nodes;
alter publication supabase_realtime add table screens;
alter publication supabase_realtime add table connections;
```

---

## 8. CLAUDE.md Template (for the Coral repo)

```markdown
# Coral — Product Brain for AI-Native Teams

## What is this
Coral is a visual, collaborative source of truth for digital product architecture.
Users map journeys, screens, API contracts, and design system components as an
interconnected graph. The graph is exported as structured context for AI coding tools.

## Stack
- Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4
- Zustand + Immer (canvas state), Supabase (auth + DB + Realtime)
- Space Grotesk + DM Sans + JetBrains Mono

## Rules
- All types in types/index.ts — never use `any`
- Canvas state ONLY via Zustand store — never useState for graph data
- API keys in app/api/ Route Handlers only — never client-side
- Run `npm run typecheck` before finishing any task
- Node components (JourneyNode, DSNode, APINode) are visual only — no pointer handlers
- useCanvasInteraction is the single owner of all pointer events

## Key files
- types/index.ts — domain model (single source of truth)
- lib/store/ — Zustand store with slices
- lib/export/ — context export engines (markdown, JSON, MCP)
- lib/graph/ — traversal, completeness scoring, impact analysis
- components/brain/ — main canvas, neural connections, overlays
- components/nodes/ — visual node components
- app/api/mcp/ — MCP Server endpoint

## Architecture
- Graph-first: everything is a node or connection
- No code generation — Coral exports context, not code
- Figma is optional (one of 4 visual sources)
- Layers: Architecture, APIs, Components, A11y, Quality
- Export formats: MCP Server, clipboard, JSON, CLAUDE.md
```

---

## 9. Design Tokens (Coral Brand)

```css
:root {
  /* Background */
  --bg: #F4F4F6;
  --canvas: #EDEDF0;
  --white: #FFFFFF;

  /* Glass */
  --glass: rgba(255, 255, 255, 0.82);
  --glass-strong: rgba(255, 255, 255, 0.94);

  /* Borders */
  --border: rgba(0, 0, 0, 0.06);
  --border-2: rgba(0, 0, 0, 0.09);
  --border-3: rgba(0, 0, 0, 0.13);

  /* Text */
  --text-1: #1A1A2E;
  --text-2: #5C5C72;
  --text-3: #8E8EA0;
  --text-4: #B8B8C8;

  /* Brand */
  --coral-indigo: #6366F1;
  --coral-violet: #8B5CF6;
  --coral-gradient: linear-gradient(135deg, #6366F1, #8B5CF6);

  /* Semantic */
  --blue: #3B82F6;
  --emerald: #10B981;
  --amber: #F59E0B;
  --rose: #F43F5E;
  --purple: #A855F7;
  --cyan: #06B6D4;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(0,0,0,.04);
  --shadow-sm: 0 1px 4px rgba(0,0,0,.05), 0 1px 2px rgba(0,0,0,.03);
  --shadow: 0 2px 8px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,.07), 0 2px 4px rgba(0,0,0,.04);
  --shadow-lg: 0 8px 32px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.04);

  /* Typography */
  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

---

## 10. Key Architectural Decisions

**Why no code generation:**
Code generation is commoditized. Claude Code, Cursor, Lovable, Bolt — all generate code. None generate structured product context. Coral occupies the empty space.

**Why Figma is optional:**
Dependency on Figma made Flowbridge derivative. Coral's graph must exist before, after, and independently of any design tool. Figma is one of four visual sources (Figma, upload, description, URL).

**Why contextual overlays instead of panels:**
Traditional panel layouts (sidebar + canvas + right panel) make the canvas secondary. In Coral, the graph IS the product. Information appears contextually anchored to the node being interacted with, keeping the graph as protagonist.

**Why MCP Server as primary export:**
MCP is the emerging standard for tool-to-tool context passing. A dedicated MCP endpoint means Claude Code can query the product brain directly — "give me the context for the Checkout screen" — instead of receiving a dumped markdown file.

**Why Zustand slices:**
Flowbridge's monolithic store grew unwieldy. Coral uses modular slices (project, graph, canvas, layers, memory) that compose into a single store but can be reasoned about independently.

**Why Supabase from day 1:**
Flowbridge wired Supabase but never enabled it, creating technical debt. Coral enables it from the start — free tier stores in localStorage, paid tier syncs to Supabase. Same code path, different persistence layer.
