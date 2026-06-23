'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { makeProject, makeJourney, makeDS, makeAPI, makeScreen } from '@/utils/factories'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { JourneyNode, DSNode, APINode } from '@/types'

const EXAMPLES = [
  { label: 'Fintech', text: 'App fintech com onboarding, pagamentos via Pix e configurações de perfil' },
  { label: 'Food Delivery', text: 'App de delivery de comida com busca de restaurantes, cardápio, carrinho, checkout via Pix e tracking de pedido' },
  { label: 'SaaS', text: 'SaaS de gestão de projetos com dashboard, kanban board, relatórios e configurações de time' },
  { label: 'E-commerce', text: 'E-commerce com catálogo de produtos, carrinho, checkout e acompanhamento de pedidos' },
]

const STEPS = [
  'Identifying user journeys',
  'Mapping screens and flows',
  'Suggesting API contracts',
  'Mapping design system components',
  'Building the graph',
]

export default function OnboardFlow() {
  const router = useRouter()
  const addProject = useStore(s => s.addProject)
  const openProject = useStore(s => s.openProject)
  const addNode = useStore(s => s.addNode)
  const addScreen = useStore(s => s.addScreen)

  const [input, setInput] = useState('')
  const [building, setBuilding] = useState(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleBuild = async () => {
    const desc = input.trim()
    if (!desc) return

    setBuilding(true)
    setError(null)
    setStep(0)

    // Animate steps while waiting
    const stepInterval = setInterval(() => {
      setStep(s => Math.min(s + 1, STEPS.length - 1))
    }, 900)

    try {
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc }),
      })

      clearInterval(stepInterval)

      if (res.status === 503) {
        // No API key — create empty project and let user build manually
        setError('AI onboarding is not configured (no API key). Creating an empty project instead.')
        setTimeout(() => createEmptyProject(desc), 1500)
        return
      }

      if (!res.ok) {
        setError('Something went wrong building the graph. Creating an empty project.')
        setTimeout(() => createEmptyProject(desc), 1500)
        return
      }

      const { graph } = await res.json()
      setStep(STEPS.length - 1)
      setTimeout(() => buildFromGraph(desc, graph), 400)
    } catch {
      clearInterval(stepInterval)
      setError('Connection error. Creating an empty project.')
      setTimeout(() => createEmptyProject(desc), 1500)
    }
  }

  const createEmptyProject = (name: string) => {
    const project = makeProject(name.slice(0, 40))
    addProject(project)
    openProject(project.id)
    router.push(`/projects/brain?id=${project.id}`)
  }

  const buildFromGraph = (desc: string, graph: {
    journeys?: { name: string; description?: string; screens?: { name: string; route?: string; purpose?: string; userIntent?: string; states?: string[]; components?: string[] }[] }[]
    apiEndpoints?: { method: string; path: string; description?: string; requestShape?: string; responseShape?: string }[]
    components?: { name: string; category?: string }[]
  }) => {
    const project = makeProject(desc.slice(0, 40))
    addProject(project)
    openProject(project.id)
    const pid = project.id

    // DS node
    if (graph.components && graph.components.length > 0) {
      const ds = makeDS(pid, 'Design System', { x: 80, y: 280 })
      ds.components = graph.components.map(c => ({
        id: crypto.randomUUID(),
        name: c.name,
        category: (c.category as 'atoms') || 'atoms',
        variants: [],
        usedIn: [],
      }))
      addNode(pid, ds)
    }

    // API node
    if (graph.apiEndpoints && graph.apiEndpoints.length > 0) {
      const api = makeAPI(pid, 'API Layer', { x: 80, y: 480 })
      api.endpoints = graph.apiEndpoints.map(e => ({
        id: crypto.randomUUID(),
        method: (e.method as 'GET') || 'GET',
        path: e.path,
        description: e.description || '',
        requestShape: e.requestShape || '',
        responseShape: e.responseShape || '',
        usedBy: [],
      }))
      addNode(pid, api)
    }

    // Journey nodes
    if (graph.journeys) {
      graph.journeys.forEach((j, i) => {
        const journey = makeJourney(pid, j.name, { x: 440, y: 160 + i * 200 })
        journey.description = j.description || ''
        addNode(pid, journey)

        if (j.screens) {
          j.screens.forEach((sc, si) => {
            const screen = makeScreen(journey.id, sc.name, si)
            screen.context.route = sc.route || ''
            screen.context.purpose = sc.purpose || ''
            screen.context.userIntent = sc.userIntent || ''
            screen.context.states = sc.states || []
            screen.context.components = sc.components || []
            addScreen(pid, journey.id, screen)
          })
        }
      })
    }

    router.push(`/projects/brain?id=${pid}`)
  }

  // ── Building state ──
  if (building) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'white' }}>
        <div className="text-center max-w-md px-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-8" style={{ background: '#F4F4F6', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" stroke="#1A1A2E" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M12 12L20 7.5M12 12V21M12 12L4 7.5" stroke="#1A1A2E" strokeWidth="1.5" opacity=".3"/>
            </svg>
          </div>

          <h2 className="text-xl font-semibold mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>Building your product brain</h2>
          <p className="text-sm mb-8" style={{ color: '#8E8EA0' }}>Analyzing the description and mapping the architecture</p>

          <div className="h-[3px] rounded-full mb-7 overflow-hidden" style={{ background: '#F4F4F6' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: 'linear-gradient(90deg,#6366F1,#8B5CF6)' }} />
          </div>

          <div className="text-left space-y-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all" style={{
                color: i < step ? '#10B981' : i === step ? '#6366F1' : '#D1D5DB',
                background: i === step ? 'rgba(99,102,241,.06)' : 'transparent',
              }}>
                <span className="w-5 text-center">{i < step ? '✓' : i === step ? '●' : '○'}</span>
                {s}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-xs mt-6 px-4 py-2 rounded-lg" style={{ color: '#F59E0B', background: 'rgba(245,158,11,.06)' }}>{error}</p>
          )}
        </div>
      </div>
    )
  }

  // ── Input state ──
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'white' }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute rounded-full" style={{ width: 800, height: 600, background: '#6366F1', filter: 'blur(150px)', opacity: .03, top: '-20%', left: '50%', transform: 'translateX(-50%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-xl text-center">
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/></svg>
          </div>
          <span className="font-bold text-base" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-.03em' }}>Coral</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
          <span style={{ color: '#8E8EA0', fontWeight: 300 }}>Describe your product.</span><br/>
          We build the memory.
        </h1>
        <p className="text-base mb-10" style={{ color: '#5C5C72', lineHeight: 1.6 }}>
          The visual source of truth for your digital product.<br/>Journeys, screens, APIs and components — together.
        </p>

        <div className="relative">
          <textarea
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleBuild() }}
            rows={3}
            placeholder="An app for food delivery with restaurant search, menu, cart, Pix checkout and real-time order tracking..."
            className="w-full text-[15px] px-5 py-4 pr-14 rounded-2xl outline-none resize-none transition-shadow focus:shadow-lg"
            style={{ background: '#F4F4F6', lineHeight: 1.5, boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}
          />
          <button
            onClick={handleBuild}
            disabled={!input.trim()}
            className="absolute right-3 top-4 w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', boxShadow: '0 2px 6px rgba(99,102,241,.2)' }}
          >
            <ArrowRight size={16} color="white" />
          </button>
        </div>

        <div className="flex gap-2 mt-4 justify-center flex-wrap">
          {EXAMPLES.map(ex => (
            <button
              key={ex.label}
              onClick={() => setInput(ex.text)}
              className="text-[13px] font-medium px-4 py-2 rounded-full cursor-pointer transition-all hover:shadow-sm"
              style={{ background: '#F4F4F6', color: '#5C5C72' }}
            >
              {ex.label}
            </button>
          ))}
        </div>

        <p className="text-xs mt-8" style={{ color: '#B8B8C8' }}>
          <Sparkles size={11} className="inline mr-1 -mt-0.5" />
          AI builds the initial graph · Everything is editable after · ⌘+Enter to build
        </p>
      </div>
    </div>
  )
}
