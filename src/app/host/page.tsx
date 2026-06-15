'use client'

import { useEffect, useState, useCallback } from 'react'
import Pusher from 'pusher-js'
import { QUESTIONS } from '@/lib/questions'
import type { PollState, QuestionStatus } from '@/lib/redis'

export default function HostPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState('')
  const [state, setState] = useState<PollState | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const fetchState = useCallback(async () => {
    const res = await fetch('/api/state')
    setState(await res.json())
  }, [])

  useEffect(() => {
    if (!authed) return
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
  }, [authed, fetchState])

  async function doAction(action: string, questionId: number) {
    const key = `${action}-${questionId}`
    setLoading(key)
    try {
      const res = await fetch('/api/host/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action, questionId }),
      })
      if (!res.ok) { setError('Handling feilet'); return }
      const data = await res.json()
      setState(data.state)
    } finally {
      setLoading(null)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212] px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎛️</div>
            <h1 className="text-3xl font-black">Host Panel</h1>
            <p className="text-gray-400 mt-2">Intern Wrapped</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (password) { setAuthed(true); setError('') }
              else setError('Skriv inn passord')
            }}
            className="space-y-4"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passord"
              className="w-full bg-[#1a1a2e] border border-white/20 rounded-xl px-4 py-4 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-[#1db954]"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full bg-[#1db954] text-black font-black text-lg py-4 rounded-xl hover:bg-[#1ed760] transition-colors"
            >
              Logg inn
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <p className="text-gray-400">Laster...</p>
      </div>
    )
  }

  const totalVotesPerQ = QUESTIONS.map((q) => {
    const qs = state.questions[q.id]
    return (qs?.votes1 ?? 0) + (qs?.votes2 ?? 0)
  })

  return (
    <div className="min-h-screen bg-[#121212] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">🎛️ Host Panel</h1>
            <p className="text-gray-400 text-sm mt-1">Intern Wrapped</p>
          </div>
          <a href="/results" target="_blank" className="text-sm text-[#1db954] hover:underline font-semibold">
            Resultater ↗
          </a>
        </div>

        <div className="space-y-4">
          {QUESTIONS.map((q) => {
            const qs = state.questions[q.id]
            const status: QuestionStatus = qs?.status ?? 'idle'
            const votes1 = qs?.votes1 ?? 0
            const votes2 = qs?.votes2 ?? 0
            const total = votes1 + votes2
            const pct1 = total === 0 ? 0 : Math.round((votes1 / total) * 100)
            const pct2 = 100 - pct1
            const isActive = state.activeQuestionId === q.id

            return (
              <div
                key={q.id}
                className="rounded-2xl p-5 border"
                style={{
                  background: isActive ? `${q.accentColor}15` : '#1a1a2e',
                  borderColor: isActive ? q.accentColor : 'rgba(255,255,255,0.1)',
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">
                      Spørsmål {q.id}
                    </span>
                    <h3 className="font-black text-lg">
                      {q.team1.label} {q.team1.emoji} vs {q.team2.label} {q.team2.emoji}
                    </h3>
                  </div>
                  <StatusBadge status={status} />
                </div>

                {total > 0 && (
                  <div className="mb-4 space-y-2">
                    <MiniBar label={`${q.team1.label} ${q.team1.emoji}`} pct={pct1} votes={votes1} color={q.team1.color} />
                    <MiniBar label={`${q.team2.label} ${q.team2.emoji}`} pct={pct2} votes={votes2} color={q.team2.color} />
                    <p className="text-xs text-gray-500">{total} stemmer totalt</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {status === 'idle' && (
                    <ActionBtn
                      label="Åpne avstemning"
                      color="#1db954"
                      onClick={() => doAction('open', q.id)}
                      disabled={!!loading}
                    />
                  )}
                  {status === 'open' && (
                    <ActionBtn
                      label="Lukk avstemning"
                      color="#FF6B35"
                      onClick={() => doAction('close', q.id)}
                      disabled={!!loading}
                    />
                  )}
                  {status === 'closed' && (
                    <ActionBtn
                      label="Avslør resultater"
                      color="#1db954"
                      onClick={() => doAction('reveal', q.id)}
                      disabled={!!loading}
                    />
                  )}
                  {(status === 'closed' || status === 'revealed') && (
                    <ActionBtn
                      label="Nullstill"
                      color="#666"
                      onClick={() => doAction('reset', q.id)}
                      disabled={!!loading}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    idle: { label: 'Ikke startet', color: '#666' },
    open: { label: '🟢 Åpen', color: '#1db954' },
    closed: { label: '🔴 Lukket', color: '#FF6B35' },
    revealed: { label: '✅ Avslørt', color: '#AB47BC' },
  }
  const s = map[status] ?? map.idle
  return (
    <span
      className="text-xs font-bold px-3 py-1 rounded-full"
      style={{ background: `${s.color}22`, color: s.color }}
    >
      {s.label}
    </span>
  )
}

function MiniBar({ label, pct, votes, color }: { label: string; pct: number; votes: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="font-bold" style={{ color }}>{pct}% ({votes})</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function ActionBtn({
  label,
  color,
  onClick,
  disabled,
}: {
  label: string
  color: string
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-sm font-bold px-4 py-2 rounded-lg transition-all hover:opacity-90 disabled:opacity-40"
      style={{ background: color, color: color === '#1db954' ? '#000' : '#fff' }}
    >
      {label}
    </button>
  )
}
