import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS } from '@/lib/redis'
import { pusherServer, PUSHER_CHANNEL, PUSHER_EVENTS } from '@/lib/pusher'

export async function POST(req: NextRequest) {
  const { questionId, choice } = await req.json()

  if (!questionId || (choice !== 1 && choice !== 2)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const status = await redis.get<string>(KEYS.questionState(questionId))
  if (status !== 'open') {
    return NextResponse.json({ error: 'Voting is not open' }, { status: 403 })
  }

  const voteKey = choice === 1 ? KEYS.vote1(questionId) : KEYS.vote2(questionId)
  await redis.incr(voteKey)

  const [votes1, votes2] = await Promise.all([
    redis.get<number>(KEYS.vote1(questionId)),
    redis.get<number>(KEYS.vote2(questionId)),
  ])

  await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENTS.voteUpdate, {
    questionId,
    votes1: votes1 ?? 0,
    votes2: votes2 ?? 0,
  })

  return NextResponse.json({ ok: true })
}
