import type { ExportedContext } from '@/types'

export function toMarkdown(ctx: ExportedContext): string {
  const l: string[] = []
  l.push(`# ${ctx.project.name} — Product Context`)
  l.push(`# Exported by Coral · ${ctx.project.settings.framework} + ${ctx.project.settings.styling}\n`)
  for (const j of ctx.journeys) {
    l.push(`## Journey: ${j.name}\n`)
    for (const s of j.screens) {
      l.push(`### ${s.name}`)
      l.push(`route: "${s.route}"`)
      l.push(`purpose: "${s.purpose}"`)
      if (s.states.length) l.push(`states: [${s.states.join(', ')}]`)
      if (s.endpoints.length) {
        l.push('api_contracts:')
        s.endpoints.forEach(e => {
          l.push(`  - ${e.method} ${e.path}`)
          if (e.requestShape) l.push(`    request: ${e.requestShape}`)
          if (e.responseShape) l.push(`    response: ${e.responseShape}`)
        })
      }
      if (s.components.length) l.push(`components: [${s.components.join(', ')}]`)
      l.push('')
    }
  }
  return l.join('\n')
}
