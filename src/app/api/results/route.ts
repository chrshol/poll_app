import { NextResponse } from 'next/server'
import { redis, KEYS } from '@/lib/redis'
import { QUESTIONS } from '@/lib/questions'

export async function GET() {
  const results = await Promise.all(
    QUESTIONS.map(async (q) => {
      const [v1, v2] = await Promise.all([
        redis.get<number>(KEYS.vote1(q.id)),
        redis.get<number>(KEYS.vote2(q.id)),
      ])
      return {
        id: q.id,
        votes1: v1 ?? 0,
        votes2: v2 ?? 0,
      }
    })
  )
  return NextResponse.json(results)
}
