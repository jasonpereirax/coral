import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, devtools } from 'zustand/middleware'
import type {
  Project, ProjectId, NodeId, ScreenId, ConnectionId,
  GraphNode, JourneyNode, ScreenNode, Connection, ScreenContext,
  CanvasView, CanvasTransform, LayerType, XY,
} from '@/types'

export interface CoralStore {
  // Project
  projects: Project[]
  curProjectId: ProjectId | null
  addProject: (p: Project) => void
  updateProject: (id: ProjectId, patch: Partial<Project>) => void
  deleteProject: (id: ProjectId) => void
  openProject: (id: ProjectId) => void

  // Graph
  nodes: Record<ProjectId, GraphNode[]>
  connections: Record<ProjectId, Connection[]>
  addNode: (pid: ProjectId, node: GraphNode) => void
  updateNode: (pid: ProjectId, nid: NodeId, patch: Partial<GraphNode>) => void
  moveNode: (pid: ProjectId, nid: NodeId, pos: XY) => void
  deleteNode: (pid: ProjectId, nid: NodeId) => void

  // Screens
  addScreen: (pid: ProjectId, jid: NodeId, screen: ScreenNode) => void
  updateScreen: (pid: ProjectId, jid: NodeId, sid: ScreenId, patch: Partial<ScreenNode>) => void
  updateScreenCtx: (pid: ProjectId, jid: NodeId, sid: ScreenId, ctx: Partial<ScreenContext>) => void
  deleteScreen: (pid: ProjectId, jid: NodeId, sid: ScreenId) => void

  // Connections
  addConnection: (pid: ProjectId, conn: Connection) => void
  deleteConnection: (pid: ProjectId, cid: ConnectionId) => void

  // Selectors
  getJourneys: (pid: ProjectId) => JourneyNode[]

  // Canvas
  view: CanvasView
  curJourneyId: NodeId | null
  transform: CanvasTransform
  activeLayer: LayerType
  selNodeId: NodeId | null
  selScreenId: ScreenId | null
  selConnId: ConnectionId | null
  overlayOpen: boolean
  setView: (v: CanvasView) => void
  openJourney: (id: NodeId) => void
  goToBrain: () => void
  setTransform: (t: Partial<CanvasTransform>) => void
  setActiveLayer: (l: LayerType) => void
  selectNode: (id: NodeId | null) => void
  selectScreen: (id: ScreenId | null) => void
  selectConn: (id: ConnectionId | null) => void
  clearSelection: () => void
  toggleOverlay: () => void
}

export const useStore = create<CoralStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // ── Project ──
        projects: [],
        curProjectId: null,
        addProject: (p) => set(s => { s.projects.push(p) }),
        updateProject: (id, patch) => set(s => { const p = s.projects.find(x => x.id === id); if (p) Object.assign(p, patch) }),
        deleteProject: (id) => set(s => { s.projects = s.projects.filter(p => p.id !== id); if (s.curProjectId === id) s.curProjectId = null }),
        openProject: (id) => set({ curProjectId: id }),

        // ── Graph ──
        nodes: {},
        connections: {},
        addNode: (pid, node) => set(s => { if (!s.nodes[pid]) s.nodes[pid] = []; s.nodes[pid].push(node) }),
        updateNode: (pid, nid, patch) => set(s => { const n = s.nodes[pid]?.find(x => x.id === nid); if (n) Object.assign(n, patch) }),
        moveNode: (pid, nid, pos) => set(s => { const n = s.nodes[pid]?.find(x => x.id === nid); if (n) n.position = pos }),
        deleteNode: (pid, nid) => set(s => {
          if (s.nodes[pid]) s.nodes[pid] = s.nodes[pid].filter(n => n.id !== nid)
          if (s.connections[pid]) s.connections[pid] = s.connections[pid].filter(c => c.fromId !== nid && c.toId !== nid)
        }),

        // ── Screens ──
        addScreen: (pid, jid, screen) => set(s => {
          const j = s.nodes[pid]?.find(n => n.id === jid && n.type === 'journey') as JourneyNode | undefined
          if (j) { j.screens.push(screen); j.flowOrder.push(screen.id) }
        }),
        updateScreen: (pid, jid, sid, patch) => set(s => {
          const j = s.nodes[pid]?.find(n => n.id === jid && n.type === 'journey') as JourneyNode | undefined
          const sc = j?.screens.find(x => x.id === sid); if (sc) Object.assign(sc, patch)
        }),
        updateScreenCtx: (pid, jid, sid, ctx) => set(s => {
          const j = s.nodes[pid]?.find(n => n.id === jid && n.type === 'journey') as JourneyNode | undefined
          const sc = j?.screens.find(x => x.id === sid); if (sc) Object.assign(sc.context, ctx)
        }),
        deleteScreen: (pid, jid, sid) => set(s => {
          const j = s.nodes[pid]?.find(n => n.id === jid && n.type === 'journey') as JourneyNode | undefined
          if (j) { j.screens = j.screens.filter(x => x.id !== sid); j.flowOrder = j.flowOrder.filter(id => id !== sid) }
        }),

        // ── Connections ──
        addConnection: (pid, conn) => set(s => {
          if (!s.connections[pid]) s.connections[pid] = []
          if (!s.connections[pid].some(c => c.fromId === conn.fromId && c.toId === conn.toId)) s.connections[pid].push(conn)
        }),
        deleteConnection: (pid, cid) => set(s => { if (s.connections[pid]) s.connections[pid] = s.connections[pid].filter(c => c.id !== cid) }),

        // ── Selectors ──
        getJourneys: (pid) => (get().nodes[pid]?.filter(n => n.type === 'journey') ?? []) as JourneyNode[],

        // ── Canvas ──
        view: 'brain' as CanvasView,
        curJourneyId: null,
        transform: { x: 0, y: 0, scale: 1 },
        activeLayer: 'architecture' as LayerType,
        selNodeId: null, selScreenId: null, selConnId: null, overlayOpen: false,

        setView: (v) => set({ view: v }),
        openJourney: (id) => set({ view: 'journey' as CanvasView, curJourneyId: id, selNodeId: null, selScreenId: null, selConnId: null, overlayOpen: false }),
        goToBrain: () => set({ view: 'brain' as CanvasView, curJourneyId: null, selNodeId: null, selScreenId: null, selConnId: null, overlayOpen: false }),
        setTransform: (t) => set(s => { Object.assign(s.transform, t) }),
        setActiveLayer: (l) => set({ activeLayer: l }),
        selectNode: (id) => set({ selNodeId: id, selScreenId: null, selConnId: null, overlayOpen: id !== null }),
        selectScreen: (id) => set({ selNodeId: null, selScreenId: id, selConnId: null, overlayOpen: id !== null }),
        selectConn: (id) => set({ selNodeId: null, selScreenId: null, selConnId: id, overlayOpen: false }),
        clearSelection: () => set({ selNodeId: null, selScreenId: null, selConnId: null, overlayOpen: false }),
        toggleOverlay: () => set(s => ({ overlayOpen: !s.overlayOpen })),
      })),
      {
        name: 'coral-store',
        version: 1,
        partialize: (state) => ({
          projects: state.projects,
          curProjectId: state.curProjectId,
          nodes: state.nodes,
          connections: state.connections,
        }),
      }
    ),
    { name: 'Coral', enabled: process.env.NODE_ENV === 'development' }
  )
)
