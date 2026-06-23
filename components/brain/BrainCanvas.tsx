'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { useCanvasInteraction, type ConnDrag } from '@/hooks/useCanvasInteraction'
import { makeJourney, makeDS, makeAPI, makeScreen, makeConnection, makeMemory } from '@/utils/factories'
import { screenCompleteness } from '@/lib/graph/completeness'
import { toMarkdown } from '@/lib/export/to-markdown'
import { EMPTY_CONTEXT } from '@/types'
import type { Project, GraphNode, JourneyNode, DSNode, APINode, ScreenNode, ScreenContext, LayerType, NodeId, ScreenId, EndpointRef, ExportedContext } from '@/types'
import {
  Layers, Zap, Layout, Shield, Accessibility, BarChart3, Plus, X, Copy, FileJson, FileText, Flag,
  Search, ChevronRight, Check, AlertTriangle, Pencil, Trash2, Link
} from 'lucide-react'

// ═══════════════════════════════════════
// BRAIN CANVAS — Full Product Brain UI
// ═══════════════════════════════════════

interface BrainCanvasProps {
  project: Project
}

export default function BrainCanvas({ project }: BrainCanvasProps) {
  const pid = project.id
  const nodesRaw = useStore(s => s.nodes[pid])
  const connsRaw = useStore(s => s.connections[pid])
  const nodes = nodesRaw ?? []
  const connections = connsRaw ?? []
  const transform = useStore(s => s.transform)
  const activeLayer = useStore(s => s.activeLayer)
  const setActiveLayer = useStore(s => s.setActiveLayer)
  const selNodeId = useStore(s => s.selNodeId)
  const selectNode = useStore(s => s.selectNode)
  const overlayOpen = useStore(s => s.overlayOpen)
  const addNode = useStore(s => s.addNode)
  const deleteNode = useStore(s => s.deleteNode)
  const addScreen = useStore(s => s.addScreen)
  const updateScreen = useStore(s => s.updateScreen)
  const updateScreenCtx = useStore(s => s.updateScreenCtx)
  const deleteScreen = useStore(s => s.deleteScreen)
  const addConnection = useStore(s => s.addConnection)
  const updateNode = useStore(s => s.updateNode)

  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [connectMode, setConnectMode] = useState<{ fromId: NodeId; fromType: string } | null>(null)
  const [editingScreen, setEditingScreen] = useState<ScreenId | null>(null)
  const [exported, setExported] = useState(false)

  const canvas = useCanvasInteraction(pid)
  const { connDrag } = canvas
  const selectedNode = useMemo(() => nodes.find(n => n.id === selNodeId), [nodes, selNodeId])

  // ── Listen for connection drag completion ──
  useEffect(() => {
    const handler = (e: Event) => {
      const { fromId, toId } = (e as CustomEvent).detail
      const fromNode = nodes.find(n => n.id === fromId)
      const toNode = nodes.find(n => n.id === toId)
      if (!fromNode || !toNode) return

      // Determine connection type based on node types
      let connType: 'ds-journey' | 'api-journey' | 'journey-journey' | null = null
      if (fromNode.type === 'ds' && toNode.type === 'journey') connType = 'ds-journey'
      else if (fromNode.type === 'api' && toNode.type === 'journey') connType = 'api-journey'
      else if (fromNode.type === 'journey' && toNode.type === 'ds') connType = 'ds-journey'
      else if (fromNode.type === 'journey' && toNode.type === 'api') connType = 'api-journey'
      else if (fromNode.type === 'journey' && toNode.type === 'journey') connType = 'journey-journey'
      // Swap from/to so DS/API is always "from"
      if (connType === 'ds-journey' && fromNode.type === 'journey') {
        addConnection(pid, makeConnection(pid, connType, toId, fromId))
      } else if (connType === 'api-journey' && fromNode.type === 'journey') {
        addConnection(pid, makeConnection(pid, connType, toId, fromId))
      } else if (connType) {
        addConnection(pid, makeConnection(pid, connType, fromId, toId))
      }
    }
    window.addEventListener('coral-connect', handler)
    return () => window.removeEventListener('coral-connect', handler)
  }, [nodes, pid, addConnection])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if user is typing in an input
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        if (selNodeId) {
          deleteNode(pid, selNodeId)
          selectNode(null)
        }
      }
      if (e.key === 'Escape') {
        setConnectMode(null)
        selectNode(null)
        setAddMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selNodeId, pid, deleteNode, selectNode])

  // ── Delete node handler ──
  const handleDeleteNode = useCallback((nodeId: NodeId) => {
    deleteNode(pid, nodeId)
    if (selNodeId === nodeId) selectNode(null)
  }, [pid, deleteNode, selNodeId, selectNode])

  // ── Computed health ──
  const journeys = useMemo(() => nodes.filter(n => n.type === 'journey') as JourneyNode[], [nodes])
  const totalScreens = useMemo(() => journeys.reduce((a, j) => a + j.screens.length, 0), [journeys])
  const contextPct = useMemo(() => {
    if (totalScreens === 0) return 0
    const total = journeys.reduce((a, j) =>
      a + j.screens.reduce((b, s) => b + screenCompleteness(s.context, s.visualSource), 0), 0)
    return Math.round(total / totalScreens)
  }, [journeys, totalScreens])
  const apiCount = useMemo(() => {
    const apis = nodes.filter(n => n.type === 'api') as APINode[]
    return apis.reduce((a, n) => a + n.endpoints.length, 0)
  }, [nodes])
  const dsCount = useMemo(() => {
    const dss = nodes.filter(n => n.type === 'ds') as DSNode[]
    return dss.reduce((a, n) => a + n.components.length, 0)
  }, [nodes])

  // ── Add node handlers ──
  const handleAddNode = (type: 'journey' | 'ds' | 'api') => {
    const cx = (-transform.x + 400) / transform.scale
    const cy = (-transform.y + 300) / transform.scale
    const offset = nodes.length * 30
    if (type === 'journey') addNode(pid, makeJourney(pid, `Journey ${journeys.length + 1}`, { x: cx + offset, y: cy }))
    else if (type === 'ds') addNode(pid, makeDS(pid, 'Design System', { x: cx + offset, y: cy }))
    else addNode(pid, makeAPI(pid, 'API Layer', { x: cx + offset, y: cy }))
    setAddMenuOpen(false)
  }

  // ── Connect handler ──
  const handleConnect = (toId: NodeId) => {
    if (!connectMode) return
    const fromNode = nodes.find(n => n.id === connectMode.fromId)
    const toNode = nodes.find(n => n.id === toId)
    if (!fromNode || !toNode) return
    const connType = fromNode.type === 'ds' ? 'ds-journey' as const : 'api-journey' as const
    addConnection(pid, makeConnection(pid, connType, connectMode.fromId, toId))
    setConnectMode(null)
  }

  // ── Export handler ──
  const handleExport = (format: 'clipboard' | 'json' | 'markdown') => {
    const ctx: ExportedContext = {
      project: { name: project.name, settings: project.settings },
      journeys: journeys.map(j => ({
        name: j.name,
        screens: j.screens.map(s => ({
          name: s.name, route: s.context.route, purpose: s.context.purpose,
          states: s.context.states,
          endpoints: s.context.endpoints.map(ref => {
            const apiNodes = nodes.filter(n => n.type === 'api') as APINode[]
            const ep = apiNodes.flatMap(a => a.endpoints).find(e => e.id === ref.endpointId)
            return ep || { id: ref.endpointId, method: 'GET' as const, path: '', description: ref.purpose, requestShape: '', responseShape: '', usedBy: [] }
          }),
          components: s.context.components,
        })),
      })),
      apiContracts: (nodes.filter(n => n.type === 'api') as APINode[]).flatMap(a => a.endpoints),
      components: (nodes.filter(n => n.type === 'ds') as DSNode[]).flatMap(d => d.components),
    }

    let text = ''
    if (format === 'markdown') text = toMarkdown(ctx)
    else text = JSON.stringify(ctx, null, 2)

    navigator.clipboard.writeText(text).then(() => {
      setExported(true)
      setTimeout(() => setExported(false), 2000)
    })
  }

  // ── Layer config ──
  const layers: { id: LayerType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'architecture', label: 'Architecture', icon: <Layers size={17} />, color: '#6366F1' },
    { id: 'apis', label: 'APIs', icon: <Zap size={17} />, color: '#10B981' },
    { id: 'components', label: 'Components', icon: <Layout size={17} />, color: '#A855F7' },
    { id: 'accessibility', label: 'A11y', icon: <Accessibility size={17} />, color: '#F59E0B' },
    { id: 'quality', label: 'Quality', icon: <BarChart3 size={17} />, color: '#3B82F6' },
  ]

  return (
    <div className="w-screen h-screen relative overflow-hidden select-none" style={{ background: '#EDEDF0' }}>
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute rounded-full" style={{ width: 700, height: 700, background: '#6366F1', filter: 'blur(150px)', opacity: .04, top: '-15%', left: '15%' }} />
        <div className="absolute rounded-full" style={{ width: 500, height: 500, background: '#A855F7', filter: 'blur(150px)', opacity: .04, bottom: '-10%', right: '10%' }} />
      </div>

      {/* ══════ TOP BAR ══════ */}
      <div className="fixed top-3 left-3 right-3 z-50 flex items-center gap-2 h-12 px-4 rounded-xl" style={{ background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(24px) saturate(180%)', border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }} data-no-pan>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5"><path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round"/></svg>
        </div>
        <span className="font-bold text-sm shrink-0" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-.02em' }}>Coral</span>
        <span className="mx-2 h-5 w-px shrink-0" style={{ background: 'rgba(0,0,0,.09)' }} />
        <span className="text-xs truncate" style={{ color: '#8E8EA0' }}>
          <strong style={{ color: '#1A1A2E' }}>{project.name}</strong> · Product Brain
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setAddMenuOpen(!addMenuOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
          style={{ background: addMenuOpen ? 'rgba(99,102,241,.1)' : 'transparent', color: addMenuOpen ? '#6366F1' : '#5C5C72', border: '1px solid rgba(0,0,0,.09)' }}
        >
          <Plus size={14} /> Add Node
        </button>
        <button
          onClick={() => handleExport('markdown')}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer transition-all"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', boxShadow: '0 2px 8px rgba(99,102,241,.25)' }}
        >
          <Flag size={13} /> {exported ? 'Copied!' : 'Export'}
        </button>
      </div>

      {/* ── Add Node Dropdown ── */}
      {addMenuOpen && (
        <div className="fixed top-16 right-32 z-50 p-2 rounded-xl" style={{ background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,.12)', border: '1px solid rgba(0,0,0,.06)', minWidth: 200 }} data-no-pan>
          {[
            { type: 'journey' as const, label: 'Journey', desc: 'User journey or feature flow', icon: <Layers size={16} />, color: '#6366F1' },
            { type: 'ds' as const, label: 'Design System', desc: 'Component library', icon: <Layout size={16} />, color: '#A855F7' },
            { type: 'api' as const, label: 'API Layer', desc: 'Backend endpoints', icon: <Zap size={16} />, color: '#10B981' },
          ].map(item => (
            <button
              key={item.type}
              onClick={() => handleAddNode(item.type)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer hover:bg-gray-50"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}10`, color: item.color }}>{item.icon}</div>
              <div>
                <div className="text-sm font-medium" style={{ color: '#1A1A2E' }}>{item.label}</div>
                <div className="text-xs" style={{ color: '#8E8EA0' }}>{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ══════ SIDEBAR ══════ */}
      <div className="fixed left-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1 p-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }} data-no-pan>
        {layers.map(l => (
          <button
            key={l.id}
            onClick={() => setActiveLayer(l.id)}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all relative cursor-pointer"
            style={{
              background: activeLayer === l.id ? `${l.color}10` : 'transparent',
              color: activeLayer === l.id ? l.color : '#8E8EA0',
            }}
            title={l.label}
          >
            {activeLayer === l.id && <span className="absolute left-[-7px] w-[3px] h-3.5 rounded-r-sm" style={{ background: `linear-gradient(to bottom, #6366F1, #8B5CF6)` }} />}
            {l.icon}
          </button>
        ))}
      </div>

      {/* ══════ HEALTH PILLS ══════ */}
      <div className="fixed top-16 left-16 z-40 flex gap-1.5" data-no-pan>
        {[
          { label: 'Context', value: `${contextPct}%`, color: '#6366F1' },
          { label: 'APIs', value: `${apiCount}`, color: '#10B981' },
          { label: 'DS', value: `${dsCount}`, color: '#A855F7' },
        ].map(h => (
          <div key={h.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(14px)', border: '1px solid rgba(0,0,0,.06)', color: '#5C5C72', boxShadow: '0 1px 2px rgba(0,0,0,.04)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: h.color, boxShadow: `0 0 6px ${h.color}` }} />
            {h.label}
            <span className="font-semibold" style={{ fontFamily: 'var(--font-mono)', color: h.color }}>{h.value}</span>
          </div>
        ))}
      </div>

      {/* ══════ CANVAS ══════ */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{ zIndex: 1, touchAction: 'none' }}
        onPointerDown={canvas.onPointerDown}
        onPointerMove={canvas.onPointerMove}
        onPointerUp={canvas.onPointerUp}
        onWheel={canvas.onWheel}
      >
        <div style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0' }}>

          {/* ── SVG CONNECTIONS ── */}
          <svg className="absolute inset-0" style={{ width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
            <defs>
              <linearGradient id="gDS" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A855F7"/>
                <stop offset="100%" stopColor="#6366F1"/>
              </linearGradient>
              <linearGradient id="gAPI" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981"/>
                <stop offset="100%" stopColor="#06B6D4"/>
              </linearGradient>
              <linearGradient id="gJJ" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366F1"/>
                <stop offset="100%" stopColor="#3B82F6"/>
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            {connections.map(conn => {
              const from = nodes.find(n => n.id === conn.fromId)
              const to = nodes.find(n => n.id === conn.toId)
              if (!from || !to) return null

              // Calculate edge points
              const fromW = from.type === 'journey' ? 260 : 200
              const toW = to.type === 'journey' ? 260 : 200
              const fromH = from.type === 'api' ? 140 : 110
              const toH = to.type === 'api' ? 140 : 110

              const x1 = from.position.x + fromW  // right edge
              const y1 = from.position.y + fromH / 2
              const x2 = to.position.x             // left edge
              const y2 = to.position.y + toH / 2

              // Bezier control points — smooth horizontal curve
              const dx = Math.abs(x2 - x1)
              const cpOffset = Math.max(80, dx * 0.4)

              const gradId = conn.type === 'ds-journey' ? 'gDS' : conn.type === 'api-journey' ? 'gAPI' : 'gJJ'

              return (
                <g key={conn.id}>
                  {/* Glow layer */}
                  <path
                    d={`M${x1},${y1} C${x1 + cpOffset},${y1} ${x2 - cpOffset},${y2} ${x2},${y2}`}
                    fill="none"
                    stroke={`url(#${gradId})`}
                    strokeWidth={4}
                    opacity={0.06}
                    filter="url(#glow)"
                  />
                  {/* Main line */}
                  <path
                    d={`M${x1},${y1} C${x1 + cpOffset},${y1} ${x2 - cpOffset},${y2} ${x2},${y2}`}
                    fill="none"
                    stroke={`url(#${gradId})`}
                    strokeWidth={2}
                    opacity={0.35}
                    strokeLinecap="round"
                  />
                  {/* Source dot */}
                  <circle cx={x1} cy={y1} r={3} fill={conn.type === 'ds-journey' ? '#A855F7' : '#10B981'} opacity={0.5} />
                  {/* Target dot */}
                  <circle cx={x2} cy={y2} r={3} fill="#6366F1" opacity={0.5} />
                </g>
              )
            })}
          </svg>

          {/* ── TEMP CONNECTION LINE (during drag) ── */}
          {connDrag && (
            <svg className="fixed inset-0 w-screen h-screen" style={{ zIndex: 100, pointerEvents: 'none' }}>
              <defs>
                <linearGradient id="gDrag" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366F1"/>
                  <stop offset="100%" stopColor="#8B5CF6"/>
                </linearGradient>
              </defs>
              {(() => {
                const dx = Math.abs(connDrag.toX - connDrag.fromX)
                const cpOff = Math.max(60, dx * 0.4)
                return (
                  <>
                    <path
                      d={`M${connDrag.fromX},${connDrag.fromY} C${connDrag.fromX + cpOff},${connDrag.fromY} ${connDrag.toX - cpOff},${connDrag.toY} ${connDrag.toX},${connDrag.toY}`}
                      fill="none"
                      stroke="url(#gDrag)"
                      strokeWidth={2.5}
                      strokeDasharray="8 4"
                      opacity={0.6}
                      strokeLinecap="round"
                    />
                    <circle cx={connDrag.fromX} cy={connDrag.fromY} r={4} fill="#6366F1" opacity={0.6} />
                    <circle cx={connDrag.toX} cy={connDrag.toY} r={6} fill="#8B5CF6" opacity={0.3} />
                    <circle cx={connDrag.toX} cy={connDrag.toY} r={3} fill="#8B5CF6" opacity={0.6} />
                  </>
                )
              })()}
            </svg>
          )}

          {/* ── NODES ── */}
          {nodes.map(node => (
            <div
              key={node.id}
              data-node-id={node.id}
              data-node-x={node.position.x}
              data-node-y={node.position.y}
              className="absolute"
              style={{
                left: node.position.x,
                top: node.position.y,
                zIndex: selNodeId === node.id ? 20 : 10,
                animation: selNodeId === node.id ? 'node-float 4s ease-in-out infinite' : undefined,
              }}
            >
              <NodeCard
                node={node}
                selected={selNodeId === node.id}
                connectMode={connectMode}
                onConnect={() => {
                  if (connectMode) handleConnect(node.id)
                  else setConnectMode({ fromId: node.id, fromType: node.type })
                }}
                onDelete={() => handleDeleteNode(node.id)}
                onSelect={() => selectNode(node.id)}
              />
            </div>
          ))}

          {/* ── Empty state ── */}
          {nodes.length === 0 && (
            <div className="absolute flex flex-col items-center justify-center" style={{ left: 200, top: 200, width: 400 }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.1)' }}>
                <Plus size={28} style={{ color: '#6366F1' }} />
              </div>
              <p className="text-lg font-semibold mb-2 text-center" style={{ fontFamily: 'var(--font-display)', color: '#1A1A2E' }}>Start building your product brain</p>
              <p className="text-sm text-center mb-6" style={{ color: '#8E8EA0' }}>Add a Journey, Design System, or API Layer to begin mapping your product architecture.</p>
              <button onClick={() => setAddMenuOpen(true)} className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', boxShadow: '0 2px 12px rgba(99,102,241,.25)' }}>
                <Plus size={14} className="inline mr-1.5 -mt-0.5" /> Add your first node
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════ FAB — Add Node ══════ */}
      <div className="fixed bottom-4 left-16 z-40" data-no-pan>
        <div className="relative">
          <button
            onClick={() => setAddMenuOpen(!addMenuOpen)}
            className="w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all hover:scale-105"
            style={{
              background: addMenuOpen ? 'white' : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
              color: addMenuOpen ? '#6366F1' : 'white',
              boxShadow: addMenuOpen ? '0 4px 16px rgba(0,0,0,.1)' : '0 4px 20px rgba(99,102,241,.3)',
              border: addMenuOpen ? '1px solid rgba(0,0,0,.06)' : 'none',
            }}
          >
            <Plus size={22} style={{ transform: addMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }} />
          </button>
          {addMenuOpen && (
            <div className="absolute bottom-14 left-0 p-2 rounded-xl" style={{ background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,.12)', border: '1px solid rgba(0,0,0,.06)', minWidth: 220 }}>
              {[
                { type: 'journey' as const, label: 'Journey', desc: 'User journey or feature flow', icon: <Layers size={16} />, color: '#6366F1' },
                { type: 'ds' as const, label: 'Design System', desc: 'Component library', icon: <Layout size={16} />, color: '#A855F7' },
                { type: 'api' as const, label: 'API Layer', desc: 'Backend endpoints', icon: <Zap size={16} />, color: '#10B981' },
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => handleAddNode(item.type)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer hover:bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}10`, color: item.color }}>{item.icon}</div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#1A1A2E' }}>{item.label}</div>
                    <div className="text-xs" style={{ color: '#8E8EA0' }}>{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════ CONNECT MODE BANNER ══════ */}
      {connectMode && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: 'white', boxShadow: '0 4px 16px rgba(0,0,0,.1)', border: '1px solid rgba(0,0,0,.06)' }} data-no-pan>
          <Link size={14} style={{ color: '#6366F1' }} />
          <span className="text-sm" style={{ color: '#5C5C72' }}>Click a <strong style={{ color: '#1A1A2E' }}>Journey</strong> node to connect</span>
          <button onClick={() => setConnectMode(null)} className="ml-2 px-2 py-1 rounded-md text-xs cursor-pointer" style={{ background: 'rgba(0,0,0,.04)', color: '#8E8EA0' }}>Cancel</button>
        </div>
      )}

      {/* ══════ EXPORT DOCK ══════ */}
      {nodes.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex gap-1 p-1.5 rounded-2xl" style={{ background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(24px) saturate(180%)', border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 8px 32px rgba(0,0,0,.08)' }} data-no-pan>
          {[
            { label: 'Clipboard', icon: <Copy size={13} />, format: 'clipboard' as const },
            { label: 'CLAUDE.md', icon: <FileText size={13} />, format: 'markdown' as const, primary: true },
            { label: 'JSON', icon: <FileJson size={13} />, format: 'json' as const },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={() => handleExport(btn.format)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer"
              style={btn.primary
                ? { background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: 'white', boxShadow: '0 2px 6px rgba(99,102,241,.2)' }
                : { background: 'transparent', color: '#5C5C72' }
              }
            >
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>
      )}

      {/* ══════ CONTEXT OVERLAY ══════ */}
      {overlayOpen && selectedNode && (
        <ContextPanel
          node={selectedNode}
          projectId={pid}
          onClose={() => selectNode(null)}
          editingScreen={editingScreen}
          setEditingScreen={setEditingScreen}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════
// NODE CARD
// ═══════════════════════════════════════

function NodeCard({ node, selected, connectMode, onConnect, onDelete, onSelect }: {
  node: GraphNode; selected: boolean; connectMode: { fromId: string; fromType: string } | null; onConnect: () => void; onDelete: () => void; onSelect: () => void
}) {
  const isConnectTarget = connectMode && connectMode.fromId !== node.id && node.type === 'journey'
  const colors = { journey: '#6366F1', ds: '#A855F7', api: '#10B981' }
  const labels = { journey: 'JOURNEY', ds: 'DESIGN SYSTEM', api: 'API LAYER' }
  const color = colors[node.type]

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isConnectTarget) {
      onConnect()
    } else {
      onSelect()
    }
  }

  return (
    <div
      onClick={handleClick}
      className="rounded-2xl transition-all relative overflow-hidden group cursor-pointer"
      style={{
        width: node.type === 'journey' ? 260 : 200,
        padding: '16px 18px',
        background: 'white',
        boxShadow: selected
          ? `0 0 0 2px ${color}20, 0 8px 32px rgba(0,0,0,.08)`
          : '0 2px 8px rgba(0,0,0,.06)',
        cursor: isConnectTarget ? 'pointer' : 'grab',
        border: isConnectTarget ? `2px dashed ${color}` : '1px solid rgba(0,0,0,.06)',
      }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] transition-opacity" style={{
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
        opacity: selected ? 1 : 0,
      }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-[9px] font-medium uppercase tracking-wider mb-0.5" style={{ fontFamily: 'var(--font-mono)', color }}>{labels[node.type]}</div>
          <div className="text-[15px] font-semibold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-.02em' }}>{node.name}</div>
        </div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}0A`, color }}>
          {node.type === 'journey' ? <Layers size={15} /> : node.type === 'ds' ? <Layout size={15} /> : <Zap size={15} />}
        </div>
      </div>

      {/* Journey-specific */}
      {node.type === 'journey' && (
        <>
          <div className="flex gap-1 my-2">
            {(node as JourneyNode).screens.map((s, i) => (
              <div key={s.id} className="h-4 rounded" style={{
                width: 24,
                background: screenCompleteness(s.context, s.visualSource) > 0 ? `${color}0D` : '#F4F4F6',
                border: `1px solid ${i === 0 ? '#10B98140' : screenCompleteness(s.context, s.visualSource) > 0 ? `${color}25` : 'rgba(0,0,0,.06)'}`,
              }} />
            ))}
            {(node as JourneyNode).screens.length === 0 && (
              <span className="text-[10px]" style={{ color: '#B8B8C8' }}>No screens yet</span>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            {(() => {
              const j = node as JourneyNode
              const filled = j.screens.filter(s => screenCompleteness(s.context, s.visualSource) > 0).length
              return (
                <>
                  <Badge color={filled === j.screens.length && j.screens.length > 0 ? '#10B981' : '#F59E0B'} label={`${filled}/${j.screens.length}`} />
                  {j.screens.length > 0 && <Badge color="#6366F1" label={`${Math.round(j.screens.reduce((a, s) => a + screenCompleteness(s.context, s.visualSource), 0) / j.screens.length)}%`} />}
                </>
              )
            })()}
          </div>
        </>
      )}

      {/* DS-specific */}
      {node.type === 'ds' && (
        <div className="text-xs mt-1" style={{ color: '#8E8EA0' }}>
          {(node as DSNode).components.length} components
        </div>
      )}

      {/* API-specific */}
      {node.type === 'api' && (
        <div className="mt-2 space-y-1">
          {(node as APINode).endpoints.slice(0, 3).map(ep => (
            <div key={ep.id} className="flex items-center gap-1.5 text-[10px]" style={{ fontFamily: 'var(--font-mono)', color: '#5C5C72' }}>
              <span className="text-[8px] font-bold px-1 py-px rounded" style={{
                background: ep.method === 'GET' ? '#10B98115' : ep.method === 'POST' ? '#3B82F615' : '#F59E0B15',
                color: ep.method === 'GET' ? '#10B981' : ep.method === 'POST' ? '#3B82F6' : '#F59E0B',
              }}>{ep.method}</span>
              <span className="truncate">{ep.path}</span>
            </div>
          ))}
          {(node as APINode).endpoints.length > 3 && (
            <div className="text-[10px]" style={{ color: '#B8B8C8' }}>+ {(node as APINode).endpoints.length - 3} more</div>
          )}
          {(node as APINode).endpoints.length === 0 && (
            <div className="text-[10px]" style={{ color: '#B8B8C8' }}>No endpoints yet</div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5 mt-2">
        {!connectMode && (node.type === 'ds' || node.type === 'api') && (
          <button
            onClick={(e) => { e.stopPropagation(); onConnect() }}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md cursor-pointer transition-all hover:bg-gray-100"
            style={{ background: 'rgba(0,0,0,.03)', color: '#8E8EA0' }}
          >
            <Link size={10} /> Connect
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md cursor-pointer transition-all opacity-0 group-hover:opacity-100 hover:bg-red-50"
          style={{ color: '#F43F5E' }}
        >
          <Trash2 size={10} /> Delete
        </button>
      </div>

      {/* Connection handle — drag from here to connect */}
      <div
        data-conn-handle
        className="absolute top-1/2 -translate-y-1/2 rounded-full cursor-crosshair transition-all opacity-0 group-hover:opacity-100 hover:scale-150"
        style={{
          right: -5,
          width: 10,
          height: 10,
          background: color,
          border: '2px solid white',
          boxShadow: `0 0 0 1px ${color}40, 0 2px 4px rgba(0,0,0,.15)`,
        }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 rounded-full transition-all opacity-0 group-hover:opacity-30"
        style={{
          left: -5,
          width: 10,
          height: 10,
          background: '#D1D5DB',
          border: '2px solid white',
          boxShadow: '0 1px 3px rgba(0,0,0,.1)',
        }}
      />
    </div>
  )
}

// ═══════════════════════════════════════
// CONTEXT PANEL (Overlay)
// ═══════════════════════════════════════

function ContextPanel({ node, projectId, onClose, editingScreen, setEditingScreen }: {
  node: GraphNode; projectId: string; onClose: () => void;
  editingScreen: ScreenId | null; setEditingScreen: (id: ScreenId | null) => void
}) {
  const addScreen = useStore(s => s.addScreen)
  const updateScreenCtx = useStore(s => s.updateScreenCtx)
  const deleteScreen = useStore(s => s.deleteScreen)
  const updateNode = useStore(s => s.updateNode)
  const deleteNode = useStore(s => s.deleteNode)
  const addConnection = useStore(s => s.addConnection)
  const deleteConnection = useStore(s => s.deleteConnection)
  const nodesRaw = useStore(s => s.nodes[projectId])
  const connsRaw = useStore(s => s.connections[projectId])
  const allNodes = nodesRaw ?? []
  const allConns = connsRaw ?? []
  const colors = { journey: '#6366F1', ds: '#A855F7', api: '#10B981' }
  const color = colors[node.type]

  // Find connections for this node
  const nodeConns = allConns.filter(c => c.fromId === node.id || c.toId === node.id)
  const connectedIds = nodeConns.map(c => c.fromId === node.id ? c.toId : c.fromId)
  const journeys = allNodes.filter(n => n.type === 'journey') as JourneyNode[]
  const unconnectedJourneys = journeys.filter(j => !connectedIds.includes(j.id))

  const handleConnectTo = (journeyId: NodeId) => {
    const connType = node.type === 'ds' ? 'ds-journey' as const : 'api-journey' as const
    addConnection(projectId, makeConnection(projectId, connType, node.id, journeyId))
  }

  return (
    <div className="fixed right-4 top-16 bottom-20 z-50 w-[360px] flex flex-col rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 16px 48px rgba(0,0,0,.10)', border: '1px solid rgba(0,0,0,.06)' }} data-no-pan>
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-3 border-b" style={{ borderColor: 'rgba(0,0,0,.06)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}0A`, color }}>
          {node.type === 'journey' ? <Layers size={15} /> : node.type === 'ds' ? <Layout size={15} /> : <Zap size={15} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-medium uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)', color }}>{node.type}</div>
          <input
            className="text-base font-semibold w-full bg-transparent outline-none"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-.02em' }}
            defaultValue={node.name}
            onBlur={e => updateNode(projectId, node.id, { name: e.target.value } as Partial<GraphNode>)}
          />
        </div>
        <button onClick={() => { deleteNode(projectId, node.id); onClose() }} className="p-1 rounded-md cursor-pointer hover:bg-red-50" style={{ color: '#F43F5E' }} title="Delete node"><Trash2 size={14} /></button>
        <button onClick={onClose} className="p-1 rounded-md cursor-pointer" style={{ color: '#8E8EA0' }}><X size={16} /></button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* ── JOURNEY CONTENT ── */}
        {node.type === 'journey' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)', color: '#8E8EA0' }}>Screens</span>
                <button
                  onClick={() => {
                    const j = node as JourneyNode
                    const s = makeScreen(node.id, `Screen ${j.screens.length + 1}`, j.screens.length)
                    addScreen(projectId, node.id, s)
                    setEditingScreen(s.id)
                  }}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md cursor-pointer" style={{ color: '#6366F1', background: 'rgba(99,102,241,.06)' }}
                >
                  + Add Screen
                </button>
              </div>

              {(node as JourneyNode).screens.map(screen => (
                <div key={screen.id}>
                  <button
                    onClick={() => setEditingScreen(editingScreen === screen.id ? null : screen.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all mb-1 cursor-pointer"
                    style={{ background: editingScreen === screen.id ? '#F4F4F6' : 'transparent', border: '1px solid rgba(0,0,0,.04)' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{
                      background: screenCompleteness(screen.context, screen.visualSource) > 50 ? '#10B981' : screenCompleteness(screen.context, screen.visualSource) > 0 ? '#F59E0B' : '#B8B8C8',
                    }} />
                    <span className="text-sm font-medium flex-1">{screen.name}</span>
                    <span className="text-[10px] font-mono" style={{ color: '#8E8EA0' }}>{screenCompleteness(screen.context, screen.visualSource)}%</span>
                    <ChevronRight size={12} style={{ color: '#B8B8C8', transform: editingScreen === screen.id ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
                  </button>

                  {/* ── SCREEN EDITOR ── */}
                  {editingScreen === screen.id && (
                    <ScreenEditor
                      screen={screen}
                      projectId={projectId}
                      journeyId={node.id}
                    />
                  )}
                </div>
              ))}

              {(node as JourneyNode).screens.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: '#B8B8C8' }}>No screens yet. Add one to start building context.</p>
              )}
            </div>
          </>
        )}

        {/* ── DS CONTENT ── */}
        {node.type === 'ds' && (
          <DSEditor node={node as DSNode} projectId={projectId} />
        )}

        {/* ── API CONTENT ── */}
        {node.type === 'api' && (
          <APIEditor node={node as APINode} projectId={projectId} />
        )}

        {/* ── CONNECTIONS (DS & API nodes) ── */}
        {(node.type === 'ds' || node.type === 'api') && (
          <div className="mt-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-mono)', color: '#8E8EA0' }}>
              Connected Journeys ({nodeConns.length})
            </div>

            {/* Existing connections */}
            {nodeConns.map(conn => {
              const targetId = conn.fromId === node.id ? conn.toId : conn.fromId
              const target = allNodes.find(n => n.id === targetId)
              if (!target) return null
              return (
                <div key={conn.id} className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1" style={{ background: '#F4F4F6' }}>
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(99,102,241,.08)', color: '#6366F1' }}>
                    <Layers size={11} />
                  </div>
                  <span className="text-sm font-medium flex-1">{target.name}</span>
                  <button
                    onClick={() => deleteConnection(projectId, conn.id)}
                    className="cursor-pointer p-1 rounded hover:bg-red-50"
                    style={{ color: '#B8B8C8' }}
                    title="Remove connection"
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            })}

            {/* Connect to new journey */}
            {unconnectedJourneys.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] mb-1.5" style={{ color: '#8E8EA0' }}>Connect to:</div>
                <div className="space-y-1">
                  {unconnectedJourneys.map(j => (
                    <button
                      key={j.id}
                      onClick={() => handleConnectTo(j.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left cursor-pointer transition-all hover:bg-gray-50"
                      style={{ border: '1px dashed rgba(0,0,0,.1)' }}
                    >
                      <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(99,102,241,.05)', color: '#6366F1' }}>
                        <Link size={10} />
                      </div>
                      <span className="text-sm" style={{ color: '#5C5C72' }}>{j.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {nodeConns.length === 0 && unconnectedJourneys.length === 0 && (
              <p className="text-xs py-3 text-center" style={{ color: '#B8B8C8' }}>Add a Journey node first to connect.</p>
            )}
          </div>
        )}

        {/* ── CONNECTIONS (Journey nodes — connect DS/API to this journey) ── */}
        {node.type === 'journey' && (
          <div className="mt-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-mono)', color: '#8E8EA0' }}>
              Connections ({nodeConns.length})
            </div>

            {/* Existing connections */}
            {nodeConns.map(conn => {
              const sourceId = conn.fromId === node.id ? conn.toId : conn.fromId
              const source = allNodes.find(n => n.id === sourceId)
              if (!source) return null
              const srcColor = source.type === 'ds' ? '#A855F7' : '#10B981'
              return (
                <div key={conn.id} className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1" style={{ background: '#F4F4F6' }}>
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `${srcColor}10`, color: srcColor }}>
                    {source.type === 'ds' ? <Layout size={11} /> : <Zap size={11} />}
                  </div>
                  <span className="text-sm font-medium flex-1">{source.name}</span>
                  <span className="text-[9px] uppercase font-mono" style={{ color: srcColor }}>{source.type}</span>
                  <button
                    onClick={() => deleteConnection(projectId, conn.id)}
                    className="cursor-pointer p-1 rounded hover:bg-red-50"
                    style={{ color: '#B8B8C8' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            })}

            {/* Connect DS/API nodes to this Journey */}
            {(() => {
              const dsAndApiNodes = allNodes.filter(n => n.type === 'ds' || n.type === 'api')
              const unconnected = dsAndApiNodes.filter(n => !connectedIds.includes(n.id))
              if (unconnected.length === 0 && nodeConns.length === 0) {
                return <p className="text-xs py-3 text-center" style={{ color: '#B8B8C8' }}>Add a Design System or API node to connect.</p>
              }
              if (unconnected.length === 0) return null
              return (
                <div className="mt-2">
                  <div className="text-[10px] mb-1.5" style={{ color: '#8E8EA0' }}>Connect to this journey:</div>
                  <div className="space-y-1">
                    {unconnected.map(n => {
                      const nColor = n.type === 'ds' ? '#A855F7' : '#10B981'
                      return (
                        <button
                          key={n.id}
                          onClick={() => {
                            const connType = n.type === 'ds' ? 'ds-journey' as const : 'api-journey' as const
                            addConnection(projectId, makeConnection(projectId, connType, n.id, node.id))
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left cursor-pointer transition-all hover:bg-gray-50"
                          style={{ border: '1px dashed rgba(0,0,0,.1)' }}
                        >
                          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `${nColor}08`, color: nColor }}>
                            {n.type === 'ds' ? <Layout size={10} /> : <Zap size={10} />}
                          </div>
                          <span className="text-sm" style={{ color: '#5C5C72' }}>{n.name}</span>
                          <span className="text-[9px] uppercase font-mono ml-auto" style={{ color: nColor }}>{n.type === 'ds' ? 'DS' : 'API'}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// SCREEN EDITOR
// ═══════════════════════════════════════

function ScreenEditor({ screen, projectId, journeyId }: { screen: ScreenNode; projectId: string; journeyId: NodeId }) {
  const updateScreenCtx = useStore(s => s.updateScreenCtx)
  const deleteScreen = useStore(s => s.deleteScreen)

  const update = (field: keyof ScreenContext, value: string | boolean | string[]) => {
    updateScreenCtx(projectId, journeyId, screen.id, { [field]: value })
  }

  return (
    <div className="ml-5 mb-3 space-y-3 pl-3" style={{ borderLeft: '2px solid rgba(99,102,241,.1)' }}>
      <Field label="Route" value={screen.context.route} mono onChange={v => update('route', v)} placeholder="/onboarding/welcome" />
      <Field label="Purpose" value={screen.context.purpose} onChange={v => update('purpose', v)} placeholder="What this screen does..." multiline />
      <Field label="User Intent" value={screen.context.userIntent} onChange={v => update('userIntent', v)} placeholder="What the user wants to accomplish" />

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'var(--font-mono)', color: '#8E8EA0' }}>States</label>
        <TagInput
          tags={screen.context.states}
          onChange={v => update('states', v)}
          placeholder="loading, error, empty..."
        />
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'var(--font-mono)', color: '#8E8EA0' }}>Components from DS</label>
        <TagInput
          tags={screen.context.components}
          onChange={v => update('components', v)}
          placeholder="Button, Input, Card..."
        />
      </div>

      <Field label="Notes" value={screen.context.notes} onChange={v => update('notes', v)} placeholder="Architecture notes..." multiline />

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#5C5C72' }}>
          <input
            type="checkbox"
            checked={screen.context.requiresAuth}
            onChange={e => update('requiresAuth', e.target.checked)}
            className="rounded"
          />
          Requires auth
        </label>
        <button
          onClick={() => deleteScreen(projectId, journeyId, screen.id)}
          className="text-[10px] px-2 py-1 rounded-md cursor-pointer" style={{ color: '#F43F5E', background: '#F43F5E08' }}
        >
          <Trash2 size={10} className="inline mr-1" />Delete
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// DS EDITOR
// ═══════════════════════════════════════

function DSEditor({ node, projectId }: { node: DSNode; projectId: string }) {
  const updateNode = useStore(s => s.updateNode)
  const [newComp, setNewComp] = useState('')

  const addComponent = () => {
    if (!newComp.trim()) return
    const comp = { id: crypto.randomUUID(), name: newComp.trim(), category: 'atoms' as const, variants: [], usedIn: [] }
    updateNode(projectId, node.id, { components: [...node.components, comp] } as Partial<GraphNode>)
    setNewComp('')
  }

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)', color: '#8E8EA0' }}>Components ({node.components.length})</div>
      {node.components.map(c => (
        <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#F4F4F6' }}>
          <div className="w-5 h-5 rounded flex items-center justify-center text-[9px]" style={{ background: '#A855F710', color: '#A855F7' }}>◈</div>
          <span className="text-sm font-medium flex-1">{c.name}</span>
          <button
            onClick={() => updateNode(projectId, node.id, { components: node.components.filter(x => x.id !== c.id) } as Partial<GraphNode>)}
            className="cursor-pointer" style={{ color: '#B8B8C8' }}
          ><X size={12} /></button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={newComp}
          onChange={e => setNewComp(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addComponent()}
          placeholder="Add component..."
          className="flex-1 text-sm px-3 py-2 rounded-lg outline-none"
          style={{ background: '#F4F4F6' }}
        />
        <button onClick={addComponent} className="px-3 py-2 rounded-lg text-xs font-medium cursor-pointer" style={{ background: '#A855F710', color: '#A855F7' }}>Add</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// API EDITOR
// ═══════════════════════════════════════

function APIEditor({ node, projectId }: { node: APINode; projectId: string }) {
  const updateNode = useStore(s => s.updateNode)
  const [adding, setAdding] = useState(false)
  const [method, setMethod] = useState('GET')
  const [path, setPath] = useState('')
  const [reqShape, setReqShape] = useState('')
  const [resShape, setResShape] = useState('')

  const addEndpoint = () => {
    if (!path.trim()) return
    const ep = { id: crypto.randomUUID(), method: method as 'GET', path: path.trim(), description: '', requestShape: reqShape, responseShape: resShape, usedBy: [] }
    updateNode(projectId, node.id, { endpoints: [...node.endpoints, ep] } as Partial<GraphNode>)
    setPath(''); setReqShape(''); setResShape(''); setAdding(false)
  }

  return (
    <div className="space-y-3">
      <Field label="Base URL" value={node.baseUrl} mono onChange={v => updateNode(projectId, node.id, { baseUrl: v } as Partial<GraphNode>)} placeholder="https://api.example.com/v1" />

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)', color: '#8E8EA0' }}>Endpoints ({node.endpoints.length})</span>
        <button onClick={() => setAdding(!adding)} className="text-[10px] font-medium px-2 py-0.5 rounded-md cursor-pointer" style={{ color: '#10B981', background: '#10B98110' }}>+ Add</button>
      </div>

      {node.endpoints.map(ep => (
        <div key={ep.id} className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(0,0,0,.06)' }}>
          <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#F4F4F6' }}>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
              background: ep.method === 'GET' ? '#10B98115' : '#3B82F615',
              color: ep.method === 'GET' ? '#10B981' : '#3B82F6',
              fontFamily: 'var(--font-mono)',
            }}>{ep.method}</span>
            <span className="text-xs font-mono flex-1">{ep.path}</span>
            <button onClick={() => updateNode(projectId, node.id, { endpoints: node.endpoints.filter(x => x.id !== ep.id) } as Partial<GraphNode>)} className="cursor-pointer" style={{ color: '#B8B8C8' }}><X size={12} /></button>
          </div>
          {(ep.requestShape || ep.responseShape) && (
            <div className="px-3 py-2 space-y-1 text-[10px]" style={{ fontFamily: 'var(--font-mono)', color: '#5C5C72' }}>
              {ep.requestShape && <div><span style={{ color: '#8E8EA0' }}>req</span> {ep.requestShape}</div>}
              {ep.responseShape && <div><span style={{ color: '#8E8EA0' }}>res</span> {ep.responseShape}</div>}
            </div>
          )}
        </div>
      ))}

      {adding && (
        <div className="space-y-2 p-3 rounded-lg" style={{ background: '#F4F4F6' }}>
          <div className="flex gap-2">
            <select value={method} onChange={e => setMethod(e.target.value)} className="text-xs px-2 py-1.5 rounded-md bg-white outline-none" style={{ fontFamily: 'var(--font-mono)' }}>
              {['GET','POST','PUT','PATCH','DELETE','WS'].map(m => <option key={m}>{m}</option>)}
            </select>
            <input value={path} onChange={e => setPath(e.target.value)} placeholder="/api/endpoint" className="flex-1 text-xs px-2 py-1.5 rounded-md bg-white outline-none font-mono" />
          </div>
          <input value={reqShape} onChange={e => setReqShape(e.target.value)} placeholder="Request shape: { name: string }" className="w-full text-[11px] px-2 py-1.5 rounded-md bg-white outline-none font-mono" />
          <input value={resShape} onChange={e => setResShape(e.target.value)} placeholder="Response shape: { id: string }" className="w-full text-[11px] px-2 py-1.5 rounded-md bg-white outline-none font-mono" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="text-xs px-3 py-1 rounded-md cursor-pointer" style={{ color: '#8E8EA0' }}>Cancel</button>
            <button onClick={addEndpoint} className="text-xs px-3 py-1 rounded-md cursor-pointer text-white" style={{ background: '#10B981' }}>Add</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════

function Field({ label, value, onChange, placeholder, mono, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; multiline?: boolean
}) {
  const shared = {
    className: `w-full text-[13px] px-3 py-2 rounded-lg outline-none transition-shadow focus:shadow-sm ${mono ? 'font-mono text-[11px]' : ''}`,
    style: { background: '#F4F4F6' } as React.CSSProperties,
    defaultValue: value,
    placeholder,
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.target.value !== value) onChange(e.target.value)
    },
  }

  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'var(--font-mono)', color: '#8E8EA0' }}>{label}</label>
      {multiline ? <textarea {...shared} rows={2} /> : <input {...shared} />}
    </div>
  )
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('')

  const add = () => {
    const val = input.trim()
    if (val && !tags.includes(val)) { onChange([...tags, val]); setInput('') }
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 rounded-lg min-h-[36px]" style={{ background: '#F4F4F6' }}>
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full cursor-pointer" style={{ background: 'rgba(99,102,241,.08)', color: '#6366F1', fontFamily: 'var(--font-mono)' }} onClick={() => onChange(tags.filter(x => x !== t))}>
          {t} <X size={8} />
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        onBlur={add}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] text-xs bg-transparent outline-none"
      />
    </div>
  )
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span className="text-[9px] font-medium px-2 py-0.5 rounded-full" style={{ fontFamily: 'var(--font-mono)', background: `${color}0A`, color }}>
      {label}
    </span>
  )
}
