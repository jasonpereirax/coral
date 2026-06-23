import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are a product architecture assistant for Coral, a tool that maps digital products as graphs.

Given a product description, generate a structured product graph. Output ONLY valid JSON (no markdown, no backticks, no preamble) with this exact shape:

{
  "journeys": [
    {
      "name": "Journey name (e.g. Onboarding, Checkout)",
      "description": "Brief description",
      "screens": [
        {
          "name": "Screen name",
          "route": "/path/to/screen",
          "purpose": "What this screen does (1-2 sentences)",
          "userIntent": "What the user wants here",
          "states": ["loading", "loaded", "error", "empty"],
          "components": ["Component1", "Component2"]
        }
      ]
    }
  ],
  "apiEndpoints": [
    {
      "method": "GET|POST|PUT|PATCH|DELETE|WS",
      "path": "/api/resource",
      "description": "What it does",
      "requestShape": "{ field: type }",
      "responseShape": "{ field: type }"
    }
  ],
  "components": [
    { "name": "ComponentName", "category": "atoms|molecules|organisms" }
  ]
}

Rules:
- Generate 2-5 journeys based on the product
- Each journey has 2-6 screens
- Mark the first screen of each journey as the entry point (it will be auto-marked)
- Generate realistic API endpoints with proper request/response shapes
- Suggest 6-15 design system components
- Use the product's domain language (e.g. for food delivery: Restaurant, Menu, Cart, Order)
- Routes should follow Next.js conventions
- Keep it realistic and production-oriented`

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json()

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'no_api_key' }, { status: 503 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Product description: ${description}` }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: 'ai_error', detail: err }, { status: 502 })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''

    // Parse JSON (strip any accidental markdown fences)
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let graph
    try {
      graph = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'parse_error', raw: clean }, { status: 502 })
    }

    return NextResponse.json({ graph })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
