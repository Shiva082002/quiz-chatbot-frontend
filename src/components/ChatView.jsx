import { useEffect, useMemo, useRef, useState } from 'react'

import { sendChatMessage } from '../lib/api'

export default function ChatView({ topic, onExit }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Ask me anything about "${topic}".`,
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const listRef = useRef(null)

  const chatHistory = useMemo(() => {
    return messages.filter((m) => m.role === 'user' || m.role === 'assistant')
  }, [messages])

  useEffect(() => {
    // Auto-scroll to the newest message.
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  async function onSend() {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    setError('')
    setSending(true)
    setInput('')

    const historyOnly = messages
    const nextMessages = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)

    try {
      const reply = await sendChatMessage({
        topic,
        message: trimmed,
        history: historyOnly,
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e?.message || 'Failed to send message.')
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I could not respond right now.' },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div className="text-left">
          <h2 className="text-2xl font-semibold">Topic Chat</h2>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Topic: <span className="font-medium">{topic}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-black/20 dark:text-slate-100 dark:hover:bg-black/30"
        >
          Exit
        </button>
      </div>

      <div
        ref={listRef}
        className="mt-5 max-h-[65vh] overflow-auto rounded-xl border border-slate-200 bg-white/50 p-4 shadow-sm dark:border-slate-800 dark:bg-black/10"
      >
        <div className="flex flex-col gap-3">
          {messages.map((m, idx) => (
            <div
              key={`${m.role}-${idx}`}
              className={[
                'rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap',
                m.role === 'user'
                  ? 'border-purple-200 bg-purple-50 text-slate-900 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-slate-100'
                  : 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-black/10 dark:text-slate-100',
              ].join(' ')}
            >
              {m.content}
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-500/60 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/10 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-800 dark:bg-black/20"
          placeholder="Ask something..."
          disabled={sending}
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
    </div>
  )
}

