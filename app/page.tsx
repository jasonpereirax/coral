'use client'

import { useStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { makeProject } from '@/utils/factories'

export default function Home() {
  const projects = useStore(s => s.projects)
  const addProject = useStore(s => s.addProject)
  const openProject = useStore(s => s.openProject)
  const router = useRouter()

  const handleCreate = () => {
    const project = makeProject('Untitled Product')
    addProject(project)
    openProject(project.id)
    router.push(`/projects/brain?id=${project.id}`)
  }

  const handleOpen = (id: string) => {
    openProject(id)
    router.push(`/projects/brain?id=${id}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="text-center max-w-lg px-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8"
          style={{ background: 'var(--coral-gradient)', boxShadow: '0 4px 20px rgba(99,102,241,.25)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
            <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M12 12L20 7.5M12 12V21M12 12L4 7.5" stroke="white" strokeWidth="1.5" opacity=".4"/>
          </svg>
        </div>

        <h1 className="text-4xl font-bold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)' }}>Coral</h1>
        <p className="text-base mb-10" style={{ color: 'var(--color-text-2)', lineHeight: 1.6 }}>
          The product brain for AI-native teams.<br/>Built by your team, consumed by AI.
        </p>

        {projects.length > 0 && (
          <div className="mb-8 space-y-2">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => handleOpen(p.id)}
                className="w-full text-left px-4 py-3 rounded-xl transition-all cursor-pointer hover:translate-y-[-1px]"
                style={{ background: 'var(--color-white)', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}
              >
                <span className="mr-2">{p.icon}</span>
                <span className="font-medium">{p.name}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleCreate}
          className="px-8 py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer transition-all hover:shadow-xl"
          style={{ background: 'var(--coral-gradient)', boxShadow: '0 2px 12px rgba(99,102,241,.25)' }}
        >
          {projects.length > 0 ? 'New product brain' : 'Create your first product brain'}
        </button>
      </div>
    </main>
  )
}
