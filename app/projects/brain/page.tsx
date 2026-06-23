'use client'

import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { Suspense } from 'react'

function BrainContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id')
  const projects = useStore(s => s.projects)
  const project = projects.find(p => p.id === projectId)

  if (!project) {
    return (
      <div className="w-screen h-screen flex items-center justify-center" style={{ background: 'var(--color-canvas)' }}>
        <p style={{ color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Project not found</p>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen relative overflow-hidden" style={{ background: 'var(--color-canvas)' }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute rounded-full" style={{ width: 700, height: 700, background: '#6366F1', filter: 'blur(150px)', opacity: .04, top: '-15%', left: '15%' }} />
        <div className="absolute rounded-full" style={{ width: 500, height: 500, background: '#A855F7', filter: 'blur(150px)', opacity: .04, bottom: '-10%', right: '10%' }} />
      </div>

      {/* Top bar */}
      <div className="fixed top-3 left-3 right-3 z-50 flex items-center gap-2 h-12 px-4 rounded-xl" style={{ background: 'var(--glass-strong)', backdropFilter: 'blur(24px) saturate(180%)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--coral-gradient)' }}>
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
            <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-.02em' }}>Coral</span>
        <span className="mx-2 h-5 w-px" style={{ background: 'var(--border-2)' }} />
        <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>
          <strong style={{ color: 'var(--color-text-1)' }}>{project.name}</strong> · Product Brain
        </span>
      </div>

      {/* Canvas placeholder */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 1 }}>
        <div className="text-center">
          <p className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {project.icon} {project.name}
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-3)' }}>
            Canvas ready. Start building the product brain.
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-4)', fontFamily: 'var(--font-mono)' }}>
            BrainCanvas → components/brain/BrainCanvas.tsx
          </p>
        </div>
      </div>
    </div>
  )
}

export default function BrainPage() {
  return (
    <Suspense fallback={<div className="w-screen h-screen" style={{ background: 'var(--color-canvas)' }} />}>
      <BrainContent />
    </Suspense>
  )
}
