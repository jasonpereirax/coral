import type { ScreenContext, VisualSource } from '@/types'
import { COMPLETENESS_WEIGHTS as W } from '@/types'

export function screenCompleteness(ctx: ScreenContext, vs: VisualSource | null): number {
  let score = 0
  if (ctx.purpose.trim()) score += W.purpose
  if (ctx.route.trim()) score += W.route
  if (ctx.states.length > 0) score += W.states
  if (ctx.endpoints.length > 0) score += W.endpoints
  if (ctx.components.length > 0) score += W.components
  if (vs !== null) score += W.visualSource
  return score
}
