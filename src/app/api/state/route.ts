import { NextResponse } from 'next/server'
import { getPollState } from '@/lib/redis'

export async function GET() {
  const state = await getPollState()
  return NextResponse.json(state)
}
