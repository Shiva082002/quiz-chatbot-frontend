import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchQuizSessions } from '../lib/api'

const PAGE_SIZE = 5

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return String(iso)
  }
}

function typeLabel(t) {
  if (t === 'single') return 'Single'
  if (t === 'multi') return 'Multi'
  if (t === 'text') return 'Text'
  return t || '—'
}

export default function SessionHistory({ onOpenSession }) {
  const sectionRef = useRef(null)
  const skipScrollRef = useRef(true)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  /** Backend set this false when Mongo is configured but list failed (stale connection, Atlas blip, etc.) */
  const [queryFailed, setQueryFailed] = useState(false)
  const [mongoConfigured, setMongoConfigured] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setQueryFailed(false)
    try {
      const data = await fetchQuizSessions({ offset, limit: PAGE_SIZE })
      setSessions(data.sessions || [])
      setTotal(Number(data.total) || 0)
      setMongoConfigured(Boolean(data.mongoConfigured))
      if (data.mongoConfigured && data.querySucceeded === false) {
        setQueryFailed(true)
        setError(
          'Could not reach MongoDB this time (common on serverless). Tap Try again — the server will reconnect.',
        )
      }
    } catch (e) {
      setSessions([])
      setTotal(0)
      setMongoConfigured(false)
      setQueryFailed(true)
      setError(e?.message || 'Could not load sessions. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false
      return
    }
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [offset])

  const canPrev = offset > 0
  const canNext = offset + PAGE_SIZE < total

  function goPrev() {
    if (!canPrev) return
    setOffset((o) => Math.max(0, o - PAGE_SIZE))
  }

  function goNext() {
    if (!canNext) return
    setOffset((o) => o + PAGE_SIZE)
  }

  const pageStart = total === 0 ? 0 : offset + 1
  const pageEnd = Math.min(offset + sessions.length, total)

  return (
    <section
      ref={sectionRef}
      className="w-full max-w-3xl scroll-mt-4 rounded-xl border border-slate-200 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Saved sessions</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev || loading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-black/20 dark:text-slate-100 dark:hover:bg-black/30"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext || loading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-black/20 dark:text-slate-100 dark:hover:bg-black/30"
          >
            Next
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {!mongoConfigured && !loading && !error
          ? 'No MongoDB URL on the server — sessions are not stored.'
          : total > 0
            ? `Showing ${pageStart}–${pageEnd} of ${total} (newest first). Tap a row for full results.`
            : 'Sessions appear here after you finish a quiz (when MongoDB is configured).'}
      </p>

      {error ? (
        <div className="mt-3 space-y-2 rounded-lg border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <p>{error}</p>
          {queryFailed ? (
            <button
              type="button"
              onClick={() => load()}
              className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700"
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">Loading sessions…</p>
      ) : !error && sessions.length === 0 && mongoConfigured ? (
        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">No saved sessions yet.</p>
      ) : !loading && sessions.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {sessions.map((s) => {
            const n = Array.isArray(s.results) ? s.results.length : 0
            const scoreLine =
              s.questionType === 'text'
                ? 'Text (no score)'
                : s.totalScore != null && s.maxScore != null
                  ? `Score ${Number(s.totalScore).toFixed(2)} / ${s.maxScore}`
                  : n
                    ? `Score — / ${n}`
                    : '—'

            return (
              <li key={s._id}>
                <button
                  type="button"
                  onClick={() => onOpenSession(s)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm transition hover:border-purple-400/60 hover:bg-purple-50/80 dark:border-slate-700 dark:bg-black/20 dark:hover:border-purple-500/50 dark:hover:bg-purple-500/10"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-50">{s.topic || 'Quiz'}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatWhen(s.savedAt)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <span>{typeLabel(s.questionType)}</span>
                    <span className="capitalize">{s.difficulty || '—'}</span>
                    <span>
                      {n} answer{n === 1 ? '' : 's'}
                      {s.questionCount != null ? ` · asked for ${s.questionCount}` : ''}
                    </span>
                    <span>{scoreLine}</span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
