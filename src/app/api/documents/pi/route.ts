import { NextResponse } from 'next/server'

// Document generation is handled client-side via src/lib/generatePI.ts
// This route is a placeholder for future server-side generation if needed.
export async function POST() {
  return NextResponse.json({ message: 'Use client-side generation via generatePI()' }, { status: 200 })
}
