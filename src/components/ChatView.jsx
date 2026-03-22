import { useEffect, useMemo, useRef, useState } from 'react'

import { sendChatMessage } from '../lib/api'

/** Suggested openers — gives an “empty state” feel a direction without dead air */
function topicStarters(topic) {
  const t = (topic || 'this topic').trim()
  return [
    `Explain a core idea in ${t} like I'm new to it.`,
    `What’s one common mistake people make when learning ${t}?`,
    `Give me a quick practice question about ${t}.`,
  ]
}

function TypingIndicator() {
  return (
    <div
      className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-black/10 dark:text-slate-400"
      role="status"
      aria-live="polite"
      aria-label="Assistant is typing"
    >
      <span className="sr-only">Assistant is thinking</span>
      <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
        Thinking
        <span className="inline-flex gap-0.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500" />
        </span>
      </span>
    </div>
  )
}

export default function ChatView({ topic, onExit }) {
  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      content: `Welcome — I’m your **${topic}** study partner. Ask definitions, “why” questions, or for examples. I’ll stay on-topic and explain in plain language.`,
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [lastFailedPayload, setLastFailedPayload] = useState(null)

  const listRef = useRef(null)
  const inputRef = useRef(null)

  const starters = useMemo(() => topicStarters(topic), [topic])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  function applyStarter(text) {
    if (sending) return
    setInput(text)
    inputRef.current?.focus()
  }

  async function sendWithText(trimmed, baseMessages = null) {
    if (!trimmed || sending) return

    const base = baseMessages ?? messages

    setError('')
    setLastFailedPayload(null)
    setSending(true)

    const historyForApi = base
    const nextMessages = [...base, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setInput('')

    try {
      const reply = await sendChatMessage({
        topic,
        message: trimmed,
        history: historyForApi,
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      const msg = e?.message || 'Something went wrong.'
      setError(msg)
      setLastFailedPayload({ trimmed, historyOnly: historyForApi })
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'I couldn’t reach the server just now. Check your connection or try again in a moment — use Retry send below or paste your message again.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  async function onSend() {
    const trimmed = input.trim()
    await sendWithText(trimmed)
  }

  async function retryLastSend() {
    if (!lastFailedPayload) return
    const { trimmed, historyOnly } = lastFailedPayload
    setError('')
    setLastFailedPayload(null)
    await sendWithText(trimmed, historyOnly)
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* First impression: what this screen is + who it’s for */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
            Topic tutor
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">Chat about your quiz topic</h2>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-200">{topic}</span>
            <span className="text-slate-500 dark:text-slate-400"> — ask follow-ups after a quiz or explore ideas.</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-black/20 dark:text-slate-100 dark:hover:bg-black/30"
        >
          Back to home
        </button>
      </div>

      <div
        ref={listRef}
        className="mt-5 max-h-[60vh] overflow-auto rounded-xl border border-slate-200 bg-white/50 p-4 shadow-sm dark:border-slate-800 dark:bg-black/10"
        aria-label="Chat messages"
      >
        <div className="flex flex-col gap-3" role="log" aria-live="polite" aria-relevant="additions">
          {messages.map((m, idx) => (
            <div
              key={`${m.role}-${idx}`}
              className={[
                'rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap',
                m.role === 'user'
                  ? 'ml-4 border-purple-200 bg-purple-50 text-slate-900 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-slate-100'
                  : 'mr-4 border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-black/10 dark:text-slate-100',
              ].join(' ')}
            >
              {m.role === 'assistant' ? (
                <div className="text-sm leading-relaxed">
                  {m.content.split('**').map((part, i) =>
                    i % 2 === 1 ? (
                      <strong key={i} className="font-semibold text-slate-900 dark:text-white">
                        {part}
                      </strong>
                    ) : (
                      <span key={i}>{part}</span>
                    ),
                  )}
                </div>
              ) : (
                m.content
              )}
            </div>
          ))}

          {/* Loading: conversation “feel” while waiting for the model */}
          {sending ? <TypingIndicator /> : null}
        </div>

        {/* Empty-state helpers: only show when it’s still just the welcome bubble */}
        {!sending && messages.length === 1 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-black/20">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Not sure where to start?</p>
            <div className="mt-2 flex flex-col gap-2">
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applyStarter(s)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 transition hover:border-purple-300 hover:bg-purple-50/80 dark:border-slate-700 dark:bg-black/30 dark:text-slate-200 dark:hover:border-purple-500/40 dark:hover:bg-purple-500/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Error: visible, actionable, not only inside the transcript */}
      {error ? (
        <div
          className="mt-3 rounded-lg border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
          role="alert"
        >
          <p className="font-medium">Couldn’t get a reply</p>
          <p className="mt-1 opacity-90">{error}</p>
          {lastFailedPayload ? (
            <button
              type="button"
              onClick={() => retryLastSend()}
              disabled={sending}
              className="mt-3 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
            >
              Retry send
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-800 dark:bg-black/20"
          placeholder="Ask something about this topic…"
          disabled={sending}
          aria-label="Message to tutor"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={sending || !input.trim()}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        Enter to send · Shift+Enter for a new line
      </p>
    </div>
  )
}
