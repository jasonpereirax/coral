import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════
// Coral MCP Server Endpoint
// ═══════════════════════════════════════════════
// Since Coral stores data client-side (localStorage), this endpoint
// works in two modes:
//
// 1. GET /api/mcp — returns MCP server documentation + available tools
// 2. POST /api/mcp — accepts a product graph in the body and returns
//    structured context (used by the export feature and external tools
//    that POST the graph they received from the user's clipboard/file)
//
// For a fully hosted MCP experience with persistent storage, this would
// connect to a database. For now it operates on graphs passed to it.

const MCP_INFO = {
  name: 'coral-product-context',
  version: '0.1.0',
  description: 'Provides structured product architecture context for AI coding tools',
  tools: [
    {
      name: 'get_product_context',
      description: 'Get the full product architecture: journeys, screens, API contracts, and design system components',
    },
    {
      name: 'get_journey',
      description: 'Get a specific journey with all its screens and their context',
    },
    {
      name: 'get_screen_context',
      description: 'Get the full context for a specific screen: route, purpose, API contracts, components, states',
    },
    {
      name: 'get_api_contracts',
      description: 'Get all API endpoint contracts with request/response shapes',
    },
    {
      name: 'get_design_system',
      description: 'Get all design system components and where they are used',
    },
  ],
  usage: {
    claudeCode: 'Add this URL as an MCP server, or paste the exported CLAUDE.md into your project root',
    cursor: 'Paste the exported context into .cursorrules or reference it in your prompts',
  },
}

export async function GET() {
  return NextResponse.json(MCP_INFO)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { graph, query } = body

    if (!graph) {
      return NextResponse.json({ error: 'graph required in body' }, { status: 400 })
    }

    // If a specific query is provided, filter the response
    if (query?.type === 'journey' && query.name) {
      const journey = graph.journeys?.find(
        (j: { name: string }) => j.name.toLowerCase() === query.name.toLowerCase()
      )
      return NextResponse.json({ journey: journey || null })
    }

    if (query?.type === 'screen' && query.route) {
      for (const j of graph.journeys || []) {
        const screen = j.screens?.find(
          (s: { route: string }) => s.route === query.route
        )
        if (screen) return NextResponse.json({ screen, journey: j.name })
      }
      return NextResponse.json({ screen: null })
    }

    if (query?.type === 'apis') {
      return NextResponse.json({ endpoints: graph.apiLayer?.endpoints || [] })
    }

    if (query?.type === 'designSystem') {
      return NextResponse.json({ designSystem: graph.designSystem || { components: [] } })
    }

    // Default: return full context
    return NextResponse.json({ context: graph })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
