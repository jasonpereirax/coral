'use client'

import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { Suspense } from 'react'
import BrainCanvas from '@/components/brain/BrainCanvas'

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

  return <BrainCanvas project={project} />
}

export default function BrainPage() {
  return (
    <Suspense fallback={<div className="w-screen h-screen" style={{ background: '#EDEDF0' }} />}>
      <BrainContent />
    </Suspense>
  )
}
