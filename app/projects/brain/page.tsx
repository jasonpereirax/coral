'use client'

import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { Suspense, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const BrainCanvas = dynamic(() => import('@/components/brain/BrainCanvas'), { ssr: false })

function BrainContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const projects = useStore(s => s.projects)
  const project = projects.find(p => p.id === projectId)

  if (!hydrated) {
    return <div className="w-screen h-screen" style={{ background: '#EDEDF0' }} />
  }

  if (!project) {
    return (
      <div className="w-screen h-screen flex items-center justify-center" style={{ background: '#EDEDF0' }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: '#8E8EA0', fontFamily: 'var(--font-mono)' }}>Project not found</p>
          <a href="/" className="text-sm font-medium px-4 py-2 rounded-lg" style={{ color: '#6366F1', background: 'rgba(99,102,241,.06)' }}>← Back to home</a>
        </div>
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
