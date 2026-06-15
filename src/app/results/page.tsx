'use client'

import { useEffect, useState, useCallback } from 'react'
import Pusher from 'pusher-js'
import { QUESTIONS } from '@/lib/questions'
import type { PollState } from '@/lib/redis'

export default function ResultsPage() {
  const [state, setState] = useState<PollState | null>(null)

  const fetchState = useCallback(async () => {
    const res = await fetch('/api/state')
    setState(await res.json())
  }, [])

  useEffect(() => {
    fetchState()

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    const channel = pusher.subscribe('intern-wrapped')
    channel.bind('state-update', (data: PollState) => setState(data))
    channel.bind('vote-update', (data: { questionId: number; votes1: number; votes2: number }) => {
      setState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          questions: {
            ...prev.questions,
            [data.questionId]: {
              ...prev.questions[data.questionId],
              votes1: data.votes1,
              votes2: data.votes2,
            },
          },
        }
      })
    })
    return () => { channel.unbind_all(); pusher.disconnect() }
  }, [fetchState])

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <p className="text-gray-400 text-xl">Laster resultater...</p>
      </div>
    )
  }

  const revealed = QUESTIONS.filter((q) => state.questions[q.id]?.status === 'revealed')
  const team1Wins = revealed.filter((q) => {
    const qs = state.questions[q.id]
    return (qs?.votes1 ?? 0) >= (qs?.votes2 ?? 0)
  }).length
  const team2Wins = revealed.length - team1Wins
  const overallWinner = team1Wins > team2Wins ? 1 : team2Wins > team1Wins ? 2 : 0

  return (
    <div className="min-h-screen bg-[#121212] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black tracking-tight mb-2">
            <span style={{ color: '#1db954' }}>Intern</span> Wrapped
          </h1>
          <p className="text-gray-400 text-lg">Resultater</p>
        </div>

        {/* Per-question results */}
        <div className="space-y-6 mb-12">
          {QUESTIONS.map((q) => {
            const qs = state.questions[q.id]
            const status = qs?.status ?? 'idle'
            const votes1 = qs?.votes1 ?? 0
            const votes2 = qs?.votes2 ?? 0
            const total = votes1 + votes2
            const pct1 = total === 0 ? 50 : Math.round((votes1 / total) * 100)
            const pct2 = 100 - pct1
            const winner = votes1 >= votes2 ? 1 : 2
            const isRevealed = status === 'revealed'

            return (
              <div
                key={q.id}
                className="rounded-2xl p-6 border"
                style={{
                  background: isRevealed ? `${q.accentColor}15` : '#1a1a2e',
                  borderColor: isRevealed ? q.accentColor : 'rgba(255,255,255,0.1)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Spørsmål {q.id}</p>
                    <h3 className="font-black text-xl">
                      {q.team1.label} {q.team1.emoji} vs {q.team2.label} {q.team2.emoji}
                    </h3>
                  </div>
                  {isRevealed && (
                    <span className="text-2xl">{winner === 1 ? q.team1.emoji : q.team2.emoji}</span>
                  )}
                </div>

                {isRevealed ? (
                  <div className="space-y-3">
                    <ResultBar
                      label={`${q.team1.label} ${q.team1.emoji}`}
                      pct={pct1}
                      votes={votes1}
                      color={q.team1.color}
                      isWinner={winner === 1}
                    />
                    <ResultBar
                      label={`${q.team2.label} ${q.team2.emoji}`}
                      pct={pct2}
                      votes={votes2}
                      color={q.team2.color}
                      isWinner={winner === 2}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Kontoret valgte{' '}
                      <span className="font-bold text-white">
                        {winner === 1 ? `${q.team1.label} — Team Intern 1` : `${q.team2.label} — Team Intern 2`}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">
                    {status === 'idle' ? 'Ikke startet ennå' : status === 'open' ? '🟢 Avstemning pågår...' : 'Venter på avsløring...'}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Final summary */}
        {revealed.length === 5 && overallWinner !== 0 && (
          <div
            className="rounded-3xl p-8 text-center"
            style={{
              background: 'linear-gradient(135deg, #1db95422, #1db95444)',
              border: '2px solid #1db954',
            }}
          >
            <p className="text-sm uppercase tracking-widest text-gray-400 mb-3">Kontorets dom</p>
            <div className="text-6xl mb-4">{overallWinner === 1 ? '🏆' : '🏆'}</div>
            <h2 className="text-4xl font-black mb-2">
              Kontoret er{' '}
              <span style={{ color: '#1db954' }}>
                Team Intern {overallWinner}
              </span>
              !
            </h2>
            <p className="text-gray-300 text-lg mt-2">
              {team1Wins} av 5 spørsmål gikk til Intern 1,{' '}
              {team2Wins} til Intern 2
            </p>
          </div>
        )}

        {revealed.length > 0 && revealed.length < 5 && (
          <div className="text-center text-gray-500 text-sm">
            {revealed.length} av 5 spørsmål avslørt — venter på resten...
          </div>
        )}
      </div>
    </div>
  )
}

function ResultBar({
  label,
  pct,
  votes,
  color,
  isWinner,
}: {
  label: string
  pct: number
  votes: number
  color: string
  isWinner: boolean
}) {
  return (
    <div className="rounded-xl p-3" style={isWinner ? { outline: `2px solid ${color}` } : {}}>
      <div className="flex justify-between items-center mb-1.5">
        <span className={`font-bold ${isWinner ? 'text-white' : 'text-gray-400'}`}>{label}</span>
        <span className="font-black text-xl" style={{ color: isWinner ? color : '#666' }}>
          {pct}%
        </span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: isWinner ? color : '#444' }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">{votes} stemmer</p>
    </div>
  )
}
