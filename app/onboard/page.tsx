'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const OnboardFlow = dynamic(() => import('@/components/onboard/OnboardFlow'), { ssr: false })

export default function OnboardPage() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])
  if (!hydrated) return <div className="min-h-screen" style={{ background: 'white' }} />
  return <OnboardFlow />
}
