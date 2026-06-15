import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const KEYS = {
  activeQuestion: 'poll:activeQuestion',
  questionState: (id: number) => `poll:question:${id}:state`,
  votes: (id: number) => `poll:question:${id}:votes`,
  vote1: (id: number) => `poll:question:${id}:v1`,
  vote2: (id: number) => `poll:question:${id}:v2`,
}

export type QuestionStatus = 'idle' | 'open' | 'closed' | 'revealed'

export interface PollState {
  activeQuestionId: number | null
  questions: {
    [id: number]: {
      status: QuestionStatus
      votes1: number
      votes2: number
    }
  }
}

export async function getPollState(): Promise<PollState> {
  const activeId = await redis.get<number>(KEYS.activeQuestion)

  const questionStates: PollState['questions'] = {}
  for (let i = 1; i <= 5; i++) {
    const [status, v1, v2] = await Promise.all([
      redis.get<QuestionStatus>(KEYS.questionState(i)),
      redis.get<number>(KEYS.vote1(i)),
      redis.get<number>(KEYS.vote2(i)),
    ])
    questionStates[i] = {
      status: status ?? 'idle',
      votes1: v1 ?? 0,
      votes2: v2 ?? 0,
    }
  }

  return { activeQuestionId: activeId, questions: questionStates }
}
