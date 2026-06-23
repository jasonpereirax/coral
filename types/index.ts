// ═══ CORAL — Domain Types ═══
// Single source of truth. Never use `any`.

export type ProjectId    = string
export type NodeId       = string
export type ConnectionId = string
export type ScreenId     = string
export type EndpointId   = string
export type ComponentId  = string

export interface XY { x: number; y: number }

// ── PROJECT ──

export interface Project {
  id: ProjectId; name: string; description: string;
  icon: string; color: string; settings: ProjectSettings;
  createdAt: string; updatedAt: string;
}

export interface ProjectSettings {
  framework: Framework; language: 'typescript' | 'javascript';
  styling: 'tailwind' | 'css-modules' | 'styled-components' | 'vanilla';
  componentLib: string; outputDir: string;
}

export type Framework = 'nextjs' | 'react-vite' | 'remix' | 'astro' | 'nuxt' | 'sveltekit'

// ── GRAPH NODES ──

export type NodeType = 'journey' | 'ds' | 'api'

export interface BaseNode {
  id: NodeId; projectId: ProjectId; type: NodeType;
  name: string; position: XY; createdAt: string; updatedAt: string;
}

export interface JourneyNode extends BaseNode {
  type: 'journey'; description: string;
  screens: ScreenNode[]; flowOrder: ScreenId[];
  status: 'draft' | 'partial' | 'complete';
}

export interface DSNode extends BaseNode {
  type: 'ds'; components: ComponentDef[];
  figmaFileUrl?: string; figmaFileKey?: string;
  syncStatus: 'synced' | 'outdated' | 'disconnected';
  lastSyncAt?: string;
}

export interface ComponentDef {
  id: ComponentId; name: string;
  category: 'atoms' | 'molecules' | 'organisms' | 'templates' | 'other';
  variants: string[]; usedIn: ScreenId[];
}

export interface APINode extends BaseNode {
  type: 'api'; baseUrl: string; endpoints: APIEndpoint[];
}

export interface APIEndpoint {
  id: EndpointId;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'WS';
  path: string; description: string;
  requestShape: string; responseShape: string;
  usedBy: ScreenId[];
}

export type GraphNode = JourneyNode | DSNode | APINode

// ── SCREEN ──

export interface ScreenNode {
  id: ScreenId; journeyId: NodeId; name: string;
  position: XY; order: number; isEntry: boolean; isError: boolean;
  context: ScreenContext; visualSource: VisualSource | null;
  createdAt: string; updatedAt: string;
}

export interface ScreenContext {
  purpose: string; userIntent: string; route: string;
  requiresAuth: boolean; states: string[]; components: string[];
  endpoints: EndpointRef[]; notes: string; crossScreen: CrossScreenContext;
}

export interface EndpointRef { endpointId: EndpointId; purpose: string }

export interface CrossScreenContext {
  sharedComponents: string[];
  previousScreen: ScreenId | null;
  nextScreen: ScreenId | null;
  relatedScreens: ScreenId[];
}

export const EMPTY_CONTEXT: ScreenContext = {
  purpose: '', userIntent: '', route: '', requiresAuth: false,
  states: [], components: [], endpoints: [], notes: '',
  crossScreen: { sharedComponents: [], previousScreen: null, nextScreen: null, relatedScreens: [] },
}

export type VisualSourceType = 'figma' | 'upload' | 'description' | 'url'

export interface VisualSource {
  type: VisualSourceType;
  figmaUrl?: string; figmaNodeId?: string; figmaFileKey?: string;
  thumbnailUrl?: string; imageUrl?: string;
  description?: string; sourceUrl?: string;
}

// ── CONNECTIONS ──

export type ConnectionType = 'ds-journey' | 'api-journey' | 'api-screen' | 'screen-screen' | 'journey-journey'

export interface Connection {
  id: ConnectionId; projectId: ProjectId; type: ConnectionType;
  fromId: string; toId: string; label?: string; createdAt: string;
}

// ── LAYERS ──

export type LayerType = 'architecture' | 'apis' | 'components' | 'accessibility' | 'quality'

// ── MEMORY ──

export interface MemoryEntry {
  id: string; projectId: ProjectId; userName: string;
  action: string; entityType: NodeType | 'screen' | 'endpoint' | 'component';
  entityId: string; layer: LayerType; timestamp: string;
}

// ── EXPORT ──

export interface ExportedContext {
  project: Pick<Project, 'name' | 'settings'>;
  journeys: ExportedJourney[];
  apiContracts: APIEndpoint[];
  components: ComponentDef[];
}

export interface ExportedJourney { name: string; screens: ExportedScreen[] }
export interface ExportedScreen { name: string; route: string; purpose: string; states: string[]; endpoints: APIEndpoint[]; components: string[] }

// ── CANVAS (never persisted) ──

export interface CanvasTransform { x: number; y: number; scale: number }
export type CanvasView = 'brain' | 'journey'

// ── COMPLETENESS ──

export const COMPLETENESS_WEIGHTS = {
  purpose: 25, route: 15, states: 15, endpoints: 20, components: 15, visualSource: 10,
} as const
