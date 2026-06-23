import { uid, timestamp } from './helpers'
import { EMPTY_CONTEXT } from '@/types'
import type {
  Project, ProjectId, JourneyNode, DSNode, APINode,
  NodeId, ScreenNode, Connection, ConnectionType,
  MemoryEntry, LayerType, NodeType, XY,
} from '@/types'

export function makeProject(name: string, description = ''): Project {
  const now = timestamp()
  return {
    id: uid(), name, description, icon: '🪸', color: '#6366F1',
    settings: { framework: 'nextjs', language: 'typescript', styling: 'tailwind', componentLib: 'shadcn-ui', outputDir: 'src/app' },
    createdAt: now, updatedAt: now,
  }
}

export function makeJourney(projectId: ProjectId, name: string, pos: XY = { x: 0, y: 0 }): JourneyNode {
  const now = timestamp()
  return { id: uid(), projectId, type: 'journey', name, description: '', screens: [], flowOrder: [], status: 'draft', position: pos, createdAt: now, updatedAt: now }
}

export function makeDS(projectId: ProjectId, name: string, pos: XY = { x: 0, y: 0 }): DSNode {
  const now = timestamp()
  return { id: uid(), projectId, type: 'ds', name, components: [], syncStatus: 'disconnected', position: pos, createdAt: now, updatedAt: now }
}

export function makeAPI(projectId: ProjectId, name: string, pos: XY = { x: 0, y: 0 }): APINode {
  const now = timestamp()
  return { id: uid(), projectId, type: 'api', name, baseUrl: '', endpoints: [], position: pos, createdAt: now, updatedAt: now }
}

export function makeScreen(journeyId: NodeId, name: string, order = 0, pos: XY = { x: 0, y: 0 }): ScreenNode {
  const now = timestamp()
  return {
    id: uid(), journeyId, name, position: pos, order,
    isEntry: order === 0, isError: false,
    context: { ...EMPTY_CONTEXT, crossScreen: { ...EMPTY_CONTEXT.crossScreen } },
    visualSource: null, createdAt: now, updatedAt: now,
  }
}

export function makeConnection(projectId: ProjectId, type: ConnectionType, fromId: string, toId: string, label?: string): Connection {
  return { id: uid(), projectId, type, fromId, toId, label, createdAt: timestamp() }
}

export function makeMemory(projectId: ProjectId, userName: string, action: string, entityType: NodeType | 'screen' | 'endpoint' | 'component', entityId: string, layer: LayerType): MemoryEntry {
  return { id: uid(), projectId, userName, action, entityType, entityId, layer, timestamp: timestamp() }
}
