import { useMemo, useState } from 'react'

const TOPIC_SUGGESTIONS = [
  'IoT',
  'DSA',
  'JavaScript',
  'React',
  'Python',
  'Networking',
  'Cloud Computing',
  'Cybersecurity',
  'Machine Learning',
]

export default function Landing({ onStart, onChat }) {
  const [topicFromDropdown, setTopicFromDropdown] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [difficulty, setDifficulty] = useState('easy')
  const [questionType, setQuestionType] = useState('single')
  const [questionCountInput, setQuestionCountInput] = useState('20')

  const topic = useMemo(() => customTopic.trim() || topicFromDropdown.trim(), [customTopic, topicFromDropdown])

  const safeQuestionCount = useMemo(() => {
    const n = Number(questionCountInput)
    if (!Number.isFinite(n) || questionCountInput.trim() === '') return 20
    return Math.min(100, Math.max(1, Math.round(n)))
  }, [questionCountInput])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-10 text-left">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Quiz Master</h1>
        <p className="mt-2 text-sm text-slate-500">
          Pick a topic, difficulty, question type, and how many questions to answer (default 20). After a run, chat
          with a topic tutor or reopen a saved session below.
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
        <div>
          <label className="mb-1 block text-sm font-medium">Topic</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              className="w-full sm:w-48 sm:flex-none min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-800 dark:bg-black/20"
              value={topicFromDropdown}
              onChange={(e) => setTopicFromDropdown(e.target.value)}
            >
              <option value="">Choose a suggestion…</option>
              {TOPIC_SUGGESTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <input
              className="w-full sm:flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-800 dark:bg-black/20"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Or type your own topic…"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            {TOPIC_SUGGESTIONS.slice(0, 6).map((t) => (
              <button
                key={t}
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 dark:border-slate-800 dark:bg-black/20 dark:hover:bg-black/30"
                onClick={() => {
                  setTopicFromDropdown(t)
                  setCustomTopic('')
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Difficulty</label>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-800 dark:bg-black/20"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Number of questions</label>
            <input
              type="number"
              min={1}
              max={100}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-800 dark:bg-black/20"
              value={questionCountInput}
              onChange={(e) => setQuestionCountInput(e.target.value)}
              placeholder="20"
            />
            <p className="mt-1 text-xs text-slate-500">Default 20. Range 1–100.</p>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Question Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'single', label: 'Single' },
                { id: 'multi', label: 'Multi' },
                { id: 'text', label: 'Text' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setQuestionType(opt.id)}
                  className={[
                    'rounded-lg border px-2 py-2 text-xs font-medium transition',
                    questionType === opt.id
                      ? 'border-purple-500 bg-purple-50 text-purple-900 dark:border-purple-400 dark:bg-purple-500/10 dark:text-purple-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-black/20 dark:text-slate-200 dark:hover:bg-black/30',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onStart({ topic, difficulty, questionType, questionCount: safeQuestionCount })}
            disabled={!topic}
            className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Start Quiz
          </button>

          <button
            type="button"
            onClick={() => onChat({ topic })}
            disabled={!topic}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-black/20 dark:text-slate-100 dark:hover:bg-black/30"
          >
            Chat about Topic
          </button>
        </div>
      </div>
    </div>
  )
}

