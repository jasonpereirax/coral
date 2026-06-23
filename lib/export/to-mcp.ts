import type { GraphNode, JourneyNode, DSNode, APINode, Connection } from '@/types'

export interface MCPContext {
  product: string
  framework: string
  styling: string
  journeys: MCPJourney[]
  designSystem: { components: { name: string; category: string; usedIn: string[] }[] }
  apiLayer: { endpoints: MCPEndpoint[] }
}

interface MCPJourney {
  name: string
  description: string
  screens: MCPScreen[]
}

interface MCPScreen {
  name: string
  route: string
  purpose: string
  userIntent: string
  requiresAuth: boolean
  states: string[]
  components: string[]
  apiContracts: MCPEndpoint[]
  isEntry: boolean
  isError: boolean
}

interface MCPEndpoint {
  method: string
  path: string
  description: string
  request: string
  response: string
}

export function buildMCPContext(
  productName: string,
  framework: string,
  styling: string,
  nodes: GraphNode[]
): MCPContext {
  const journeys = nodes.filter(n => n.type === 'journey') as JourneyNode[]
  const dsNodes = nodes.filter(n => n.type === 'ds') as DSNode[]
  const apiNodes = nodes.filter(n => n.type === 'api') as APINode[]

  const allEndpoints = apiNodes.flatMap(a => a.endpoints)

  return {
    product: productName,
    framework,
    styling,
    journeys: journeys.map(j => ({
      name: j.name,
      description: j.description,
      screens: j.screens.map(s => ({
        name: s.name,
        route: s.context.route,
        purpose: s.context.purpose,
        userIntent: s.context.userIntent,
        requiresAuth: s.context.requiresAuth,
        states: s.context.states,
        components: s.context.components,
        apiContracts: s.context.endpoints
          .map(ref => allEndpoints.find(e => e.id === ref.endpointId))
          .filter((e): e is APINode['endpoints'][0] => !!e)
          .map(e => ({
            method: e.method,
            path: e.path,
            description: e.description,
            request: e.requestShape,
            response: e.responseShape,
          })),
        isEntry: s.isEntry,
        isError: s.isError,
      })),
    })),
    designSystem: {
      components: dsNodes.flatMap(d => d.components.map(c => ({
        name: c.name,
        category: c.category,
        usedIn: c.usedIn,
      }))),
    },
    apiLayer: {
      endpoints: allEndpoints.map(e => ({
        method: e.method,
        path: e.path,
        description: e.description,
        request: e.requestShape,
        response: e.responseShape,
      })),
    },
  }
}
