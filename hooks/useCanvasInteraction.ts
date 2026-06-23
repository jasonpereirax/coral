'use client'

import { useCallback, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import type { ProjectId, NodeId, XY } from '@/types'

const DRAG_THRESHOLD = 4
const MIN_SCALE = 0.25
const MAX_SCALE = 2
const ZOOM_SPEED = 0.001

export interface ConnDrag {
  fromId: NodeId
  fromX: number
  fromY: number
  toX: number
  toY: number
}

export function useCanvasInteraction(projectId: ProjectId | null) {
  const moveNode = useStore(s => s.moveNode)
  const selectNode = useStore(s => s.selectNode)
  const clearSelection = useStore(s => s.clearSelection)
  const transform = useStore(s => s.transform)
  const setTransform = useStore(s => s.setTransform)

  const [connDrag, setConnDrag] = useState<ConnDrag | null>(null)

  const stateRef = useRef<{
    mode: 'idle' | 'pan' | 'drag' | 'conn'
    startX: number
    startY: number
    startTx: number
    startTy: number
    dragNodeId: string | null
    dragStartNodePos: XY | null
    connFromId: string | null
    connFromX: number
    connFromY: number
    moved: boolean
  }>({
    mode: 'idle', startX: 0, startY: 0, startTx: 0, startTy: 0,
    dragNodeId: null, dragStartNodePos: null,
    connFromId: null, connFromX: 0, connFromY: 0, moved: false,
  })

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('select') || target.closest('[data-no-pan]')) return

    const s = stateRef.current
    s.startX = e.clientX
    s.startY = e.clientY
    s.moved = false

    // Connection handle
    const handleEl = target.closest('[data-conn-handle]') as HTMLElement | null
    if (handleEl) {
      const nodeEl = handleEl.closest('[data-node-id]') as HTMLElement | null
      if (nodeEl) {
        s.mode = 'conn'
        s.connFromId = nodeEl.dataset.nodeId!
        const rect = handleEl.getBoundingClientRect()
        s.connFromX = rect.left + rect.width / 2
        s.connFromY = rect.top + rect.height / 2
        setConnDrag({ fromId: s.connFromId, fromX: s.connFromX, fromY: s.connFromY, toX: s.connFromX, toY: s.connFromY })
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        e.preventDefault()
        return
      }
    }

    // Node drag
    const nodeEl = target.closest('[data-node-id]') as HTMLElement | null
    if (nodeEl && projectId) {
      s.mode = 'drag'
      s.dragNodeId = nodeEl.dataset.nodeId!
      s.dragStartNodePos = { x: parseFloat(nodeEl.dataset.nodeX || '0'), y: parseFloat(nodeEl.dataset.nodeY || '0') }
      return
    }

    // Pan
    s.mode = 'pan'
    s.startTx = transform.x
    s.startTy = transform.y
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [projectId, transform.x, transform.y])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current
    if (s.mode === 'idle') return
    const dx = e.clientX - s.startX
    const dy = e.clientY - s.startY
    if (!s.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return
    s.moved = true

    if (s.mode === 'pan') {
      setTransform({ x: s.startTx + dx, y: s.startTy + dy })
    } else if (s.mode === 'drag' && s.dragNodeId && s.dragStartNodePos && projectId) {
      moveNode(projectId, s.dragNodeId, {
        x: s.dragStartNodePos.x + dx / transform.scale,
        y: s.dragStartNodePos.y + dy / transform.scale,
      })
    } else if (s.mode === 'conn') {
      setConnDrag(prev => prev ? { ...prev, toX: e.clientX, toY: e.clientY } : null)
    }
  }, [projectId, transform.scale, moveNode, setTransform])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current

    if (s.mode === 'pan' && !s.moved) clearSelection()

    if (s.mode === 'conn' && s.moved && s.connFromId) {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const targetNode = el?.closest?.('[data-node-id]') as HTMLElement | null
      if (targetNode && targetNode.dataset.nodeId !== s.connFromId) {
        window.dispatchEvent(new CustomEvent('coral-connect', { detail: { fromId: s.connFromId, toId: targetNode.dataset.nodeId! } }))
      }
    }

    setConnDrag(null)
    if (s.mode === 'pan' || s.mode === 'conn') {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
    }
    s.mode = 'idle'
    s.dragNodeId = null
    s.dragStartNodePos = null
    s.connFromId = null
  }, [clearSelection])

  const onWheel = useCallback((e: React.WheelEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const oldScale = transform.scale
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale + (-e.deltaY * ZOOM_SPEED)))
    const wx = (mx - transform.x) / oldScale
    const wy = (my - transform.y) / oldScale
    setTransform({ scale: newScale, x: mx - wx * newScale, y: my - wy * newScale })
  }, [transform, setTransform])

  return { onPointerDown, onPointerMove, onPointerUp, onWheel, connDrag }
}
