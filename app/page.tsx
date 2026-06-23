'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { makeProject } from '@/utils/factories'
import { Trash2 } from 'lucide-react'

export default function Home() {
  const projects = useStore(s => s.projects)
  const addProject = useStore(s => s.addProject)
  const deleteProject = useStore(s => s.deleteProject)
  const openProject = useStore(s => s.openProject)
  const router = useRouter()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = () => {
    const projectName = name.trim() || 'Untitled Product'
    const project = makeProject(projectName)
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
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute rounded-full" style={{ width: 600, height: 600, background: '#6366F1', filter: 'blur(150px)', opacity: .04, top: '-10%', left: '20%' }} />
        <div className="absolute rounded-full" style={{ width: 400, height: 400, background: '#8B5CF6', filter: 'blur(150px)', opacity: .03, bottom: '0%', right: '15%' }} />
      </div>

      <div className="text-center max-w-lg px-6 relative z-10">
        {/* Logo */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', boxShadow: '0 4px 20px rgba(99,102,241,.25)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
            <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M12 12L20 7.5M12 12V21M12 12L4 7.5" stroke="white" strokeWidth="1.5" opacity=".4"/>
          </svg>
        </div>

        <h1 className="text-4xl font-bold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)' }}>Coral</h1>
        <p className="text-base mb-10" style={{ color: 'var(--color-text-2)', lineHeight: 1.6 }}>
          The product brain for AI-native teams.
        </p>

        {/* Existing projects */}
        {projects.length > 0 && (
          <div className="mb-8 space-y-2">
            {projects.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <button
                  onClick={() => handleOpen(p.id)}
                  className="flex-1 text-left px-4 py-3 rounded-xl transition-all cursor-pointer hover:translate-y-[-1px]"
                  style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,.06)', border: '1px solid rgba(0,0,0,.06)' }}
                >
                  <span className="mr-2">{p.icon}</span>
                  <span className="font-medium">{p.name}</span>
                </button>
                <button
                  onClick={() => deleteProject(p.id)}
                  className="p-2.5 rounded-lg cursor-pointer transition-all"
                  style={{ color: '#B8B8C8', background: 'white', border: '1px solid rgba(0,0,0,.06)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Create new */}
        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="px-8 py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer transition-all hover:shadow-xl"
            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', boxShadow: '0 2px 12px rgba(99,102,241,.25)' }}
          >
            {projects.length > 0 ? 'New product brain' : 'Create your first product brain'}
          </button>
        ) : (
          <div className="flex gap-2 max-w-sm mx-auto">
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Product name..."
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,.06)', border: '1px solid rgba(0,0,0,.06)' }}
            />
            <button
              onClick={handleCreate}
              className="px-5 py-3 rounded-xl text-white font-semibold text-sm cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', boxShadow: '0 2px 8px rgba(99,102,241,.2)' }}
            >
              Create
            </button>
          </div>
        )}

        <p className="text-xs mt-8" style={{ color: '#B8B8C8' }}>
          All data stored locally in your browser. No account needed.
        </p>
      </div>
    </main>
  )
}
