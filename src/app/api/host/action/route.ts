import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS, getPollState } from '@/lib/redis'
import { pusherServer, PUSHER_CHANNEL, PUSHER_EVENTS } from '@/lib/pusher'

type Action = 'open' | 'close' | 'reveal' | 'reset'

export async function POST(req: NextRequest) {
  const { password, action, questionId } = await req.json()

  if (password !== process.env.HOST_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!action || !questionId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  switch (action as Action) {
    case 'open':
      await Promise.all([
        redis.set(KEYS.activeQuestion, questionId),
        redis.set(KEYS.questionState(questionId), 'open'),
        redis.set(KEYS.vote1(questionId), 0),
        redis.set(KEYS.vote2(questionId), 0),
      ])
      break

    case 'close':
      await redis.set(KEYS.questionState(questionId), 'closed')
      break

    case 'reveal':
      await redis.set(KEYS.questionState(questionId), 'revealed')
      break

    case 'reset':
      await Promise.all([
        redis.set(KEYS.questionState(questionId), 'idle'),
        redis.set(KEYS.vote1(questionId), 0),
        redis.set(KEYS.vote2(questionId), 0),
      ])
      break

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const state = await getPollState()
  await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENTS.stateUpdate, state)

  return NextResponse.json({ ok: true, state })
}
