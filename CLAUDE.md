# Coral — Product Brain for AI-Native Teams

## What is this
Coral is a visual, collaborative source of truth for digital product architecture.
Users map journeys, screens, API contracts, and design system components as an
interconnected graph. The graph is exported as structured context for AI coding tools.
Coral does NOT generate code. It generates context.

## Stack
- Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4
- Zustand 5 + Immer (canvas state, localStorage persistence)
- Space Grotesk + DM Sans + JetBrains Mono
- No backend — pure client-side with localStorage

## Rules
1. All types in `types/index.ts` — never use `any`
2. Canvas state ONLY via Zustand store — never useState for graph data
3. Run `npm run typecheck` before finishing any task
4. Node components are visual only — no pointer handlers
5. Do not add npm packages without checking if functionality already exists
6. Do not break localStorage persistence in `lib/store/index.ts`

## Key files
- `types/index.ts` — domain model (single source of truth)
- `lib/store/index.ts` — Zustand store (monolithic, all state + actions)
- `lib/export/to-markdown.ts` — context export to CLAUDE.md format
- `lib/graph/completeness.ts` — screen completeness scoring
- `utils/factories.ts` — entity creation helpers (makeProject, makeJourney, etc.)

## Architecture
- Graph-first: nodes (journey, ds, api) + connections
- No code generation — Coral exports context, not code
- Figma is optional (one of 4 visual sources)
- Layers: Architecture, APIs, Components, A11y, Quality
- Export: MCP Server, clipboard, JSON, CLAUDE.md
- UI: contextual overlays anchored to nodes, not fixed panels
