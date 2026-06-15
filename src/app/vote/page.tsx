'use client'

import { useEffect, useState, useCallback } from 'react'
import Pusher from 'pusher-js'
import { QUESTIONS } from '@/lib/questions'
import type { PollState } from '@/lib/redis'

const STORAGE_KEY = 'intern-wrapped-votes'

function getVoted(): Record<number, number> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveVote(questionId: number, choice: number) {
  const existing = getVoted()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, [questionId]: choice }))
}

export default function VotePage() {
  const [state, setState] = useState<PollState | null>(null)
  const [voted, setVoted] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)

  const fetchState = useCallback(async () => {
    const res = await fetch('/api/state')
    const data = await res.json()
    setState(data)
  }, [])

  useEffect(() => {
    setVoted(getVoted())
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

    return () => {
      channel.unbind_all()
      pusher.disconnect()
    }
  }, [fetchState])

  async function handleVote(questionId: number, choice: number) {
    if (voted[questionId] || loading) return
    setLoading(true)
    try {
      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, choice }),
      })
      saveVote(questionId, choice)
      setVoted((prev) => ({ ...prev, [questionId]: choice }))
    } finally {
      setLoading(false)
    }
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🎧</div>
          <p className="text-gray-400 text-xl font-semibold">Laster...</p>
        </div>
      </div>
    )
  }

  const activeId = state.activeQuestionId
  const activeQ = activeId ? QUESTIONS.find((q) => q.id === activeId) : null
  const activeQState = activeId ? state.questions[activeId] : null

  if (!activeId || !activeQ || !activeQState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] px-6 text-center">
        <div className="text-8xl mb-6">🎤</div>
        <h1 className="text-4xl font-black tracking-tight mb-3">Intern Wrapped</h1>
        <p className="text-gray-400 text-lg">Venter på at hosten starter en runde...</p>
      </div>
    )
  }

  const hasVoted = !!voted[activeId]
  const status = activeQState.status
  const total = activeQState.votes1 + activeQState.votes2
  const pct1 = total === 0 ? 50 : Math.round((activeQState.votes1 / total) * 100)
  const pct2 = 100 - pct1
  const winner = activeQState.votes1 >= activeQState.votes2 ? 1 : 2

  if (status === 'revealed') {
    const winnerData = winner === 1 ? activeQ.team1 : activeQ.team2
    const winnerIntern = winner === 1 ? 'Intern 1' : 'Intern 2'

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: `linear-gradient(135deg, #121212 0%, ${activeQ.accentColor}22 100%)` }}
      >
        <div className="w-full max-w-sm animate-[slideUp_0.6s_ease-out_forwards]">
          <p className="text-sm uppercase tracking-widest text-gray-400 mb-2">Spørsmål {activeId}/5</p>
          <h2 className="text-2xl font-black mb-8">
            {activeQ.team1.label} {activeQ.team1.emoji} vs {activeQ.team2.label} {activeQ.team2.emoji}
          </h2>

          <div className="space-y-4 mb-8">
            <VoteBar label={`${activeQ.team1.label} ${activeQ.team1.emoji}`} pct={pct1} votes={activeQState.votes1} color={activeQ.team1.color} isWinner={winner === 1} />
            <VoteBar label={`${activeQ.team2.label} ${activeQ.team2.emoji}`} pct={pct2} votes={activeQState.votes2} color={activeQ.team2.color} isWinner={winner === 2} />
          </div>

          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: `${activeQ.accentColor}33`, border: `2px solid ${activeQ.accentColor}` }}
          >
            <p className="text-sm text-gray-300 mb-1">Kontoret er mest lik</p>
            <p className="text-3xl font-black">
              {winnerData.emoji} {winnerIntern}!
            </p>
            <p className="text-gray-300 mt-1">Team {winnerData.label}</p>
          </div>
        </div>
      </div>
    )
  }

  if (hasVoted || status === 'closed') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: `linear-gradient(135deg, #121212 0%, ${activeQ.accentColor}22 100%)` }}
      >
        <div className="text-7xl mb-6 animate-bounce">
          {hasVoted ? (voted[activeId] === 1 ? activeQ.team1.emoji : activeQ.team2.emoji) : '⏳'}
        </div>
        <h2 className="text-3xl font-black mb-3">
          {hasVoted ? 'Stemmen er registrert!' : 'Avstemning lukket'}
        </h2>
        {hasVoted && (
          <p className="text-gray-400 text-lg mb-2">
            Du stemte på{' '}
            <span className="text-white font-bold">
              {voted[activeId] === 1
                ? `${activeQ.team1.label} ${activeQ.team1.emoji}`
                : `${activeQ.team2.label} ${activeQ.team2.emoji}`}
            </span>
          </p>
        )}
        <p className="text-gray-500">Venter på at hosten avslører resultater...</p>
        <div className="mt-6 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#1db954] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: `linear-gradient(135deg, #121212 0%, ${activeQ.accentColor}22 100%)` }}
    >
      <div className="w-full max-w-sm">
        <p className="text-sm uppercase tracking-widest text-gray-400 text-center mb-2">
          Spørsmål {activeId}/5
        </p>
        <h2 className="text-2xl font-black text-center mb-10">Hva er du?</h2>

        <div className="space-y-4">
          <button
            onClick={() => handleVote(activeId, 1)}
            disabled={loading}
            className="w-full rounded-3xl p-8 text-center font-black text-2xl transition-all duration-200 active:scale-95 hover:scale-105 disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${activeQ.team1.color}cc, ${activeQ.team1.color})`,
              boxShadow: `0 8px 32px ${activeQ.team1.color}44`,
            }}
          >
            <div className="text-5xl mb-2">{activeQ.team1.emoji}</div>
            {activeQ.team1.label}
          </button>

          <div className="text-center text-gray-500 font-bold text-sm tracking-widest">VS</div>

          <button
            onClick={() => handleVote(activeId, 2)}
            disabled={loading}
            className="w-full rounded-3xl p-8 text-center font-black text-2xl transition-all duration-200 active:scale-95 hover:scale-105 disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${activeQ.team2.color}cc, ${activeQ.team2.color})`,
              boxShadow: `0 8px 32px ${activeQ.team2.color}44`,
            }}
          >
            <div className="text-5xl mb-2">{activeQ.team2.emoji}</div>
            {activeQ.team2.label}
          </button>
        </div>
      </div>
    </div>
  )
}

function VoteBar({
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
    <div className="rounded-xl p-4" style={isWinner ? { outline: `2px solid ${color}`, background: `${color}22` } : { background: '#ffffff11' }}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-lg">{label}</span>
        <span className="font-black text-2xl" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="text-sm text-gray-400 mt-1">{votes} stemmer</p>
    </div>
  )
}
