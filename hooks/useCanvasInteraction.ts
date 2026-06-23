'use client'

import { useCallback, useRef } from 'react'
import { useStore } from '@/lib/store'
import type { ProjectId, XY } from '@/types'

const DRAG_THRESHOLD = 4
const MIN_SCALE = 0.25
const MAX_SCALE = 2
const ZOOM_SPEED = 0.001

export function useCanvasInteraction(projectId: ProjectId | null) {
  const moveNode = useStore(s => s.moveNode)
  const selectNode = useStore(s => s.selectNode)
  const clearSelection = useStore(s => s.clearSelection)
  const transform = useStore(s => s.transform)
  const setTransform = useStore(s => s.setTransform)

  const stateRef = useRef<{
    mode: 'idle' | 'pan' | 'drag'
    startX: number
    startY: number
    startTx: number
    startTy: number
    dragNodeId: string | null
    dragStartNodePos: XY | null
    moved: boolean
  }>({
    mode: 'idle', startX: 0, startY: 0, startTx: 0, startTy: 0,
    dragNodeId: null, dragStartNodePos: null, moved: false,
  })

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement

    // Don't interfere with buttons, inputs, or elements marked as no-pan
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('select') || target.closest('[data-no-pan]')) return

    const nodeEl = target.closest('[data-node-id]') as HTMLElement | null
    const s = stateRef.current

    s.startX = e.clientX
    s.startY = e.clientY
    s.moved = false

    if (nodeEl && projectId) {
      // Node drag — DON'T capture pointer so click events still fire on children
      s.mode = 'drag'
      s.dragNodeId = nodeEl.dataset.nodeId!
      const nodeX = parseFloat(nodeEl.dataset.nodeX || '0')
      const nodeY = parseFloat(nodeEl.dataset.nodeY || '0')
      s.dragStartNodePos = { x: nodeX, y: nodeY }
    } else {
      // Pan — capture pointer for smooth panning
      s.mode = 'pan'
      s.startTx = transform.x
      s.startTy = transform.y
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
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
      const scale = transform.scale
      moveNode(projectId, s.dragNodeId, {
        x: s.dragStartNodePos.x + dx / scale,
        y: s.dragStartNodePos.y + dy / scale,
      })
    }
  }, [projectId, transform.scale, moveNode, setTransform])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current

    if (!s.moved && s.mode === 'pan') {
      // Clicked on background without moving — clear selection
      clearSelection()
    }
    // Note: node click/select is handled by NodeCard's onClick, not here
    // This prevents the hook from interfering with node buttons

    if (s.mode === 'pan') {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
    }

    s.mode = 'idle'
    s.dragNodeId = null
    s.dragStartNodePos = null
  }, [clearSelection])

  const onWheel = useCallback((e: React.WheelEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const oldScale = transform.scale
    const delta = -e.deltaY * ZOOM_SPEED
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale + delta))

    const wx = (mx - transform.x) / oldScale
    const wy = (my - transform.y) / oldScale

    setTransform({
      scale: newScale,
      x: mx - wx * newScale,
      y: my - wy * newScale,
    })
  }, [transform, setTransform])

  return { onPointerDown, onPointerMove, onPointerUp, onWheel }
}
