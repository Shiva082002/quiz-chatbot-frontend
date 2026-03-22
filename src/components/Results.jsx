function statusBadgeClasses(status) {
  if (status === 'correct') {
    return 'border-green-500/60 bg-green-50 text-green-900 dark:border-green-400/60 dark:bg-green-500/10 dark:text-green-200'
  }
  if (status === 'partial') {
    return 'border-amber-500/60 bg-amber-50 text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/10 dark:text-amber-200'
  }
  if (status === 'incorrect') {
    return 'border-red-500/60 bg-red-50 text-red-900 dark:border-red-400/60 dark:bg-red-500/10 dark:text-red-200'
  }
  return 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200'
}

function statusLabel(status) {
  if (status === 'correct') return 'Correct'
  if (status === 'partial') return 'Partially correct'
  if (status === 'incorrect') return 'Incorrect'
  return '—'
}

function optionRowClass(kind) {
  const base = 'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm'
  if (kind === 'sel-ok') return `${base} border-green-500/70 bg-green-50 dark:border-green-400/60 dark:bg-green-500/10`
  if (kind === 'sel-bad') return `${base} border-red-500/70 bg-red-50 dark:border-red-400/60 dark:bg-red-500/10`
  if (kind === 'missed') return `${base} border-amber-500/70 bg-amber-50 dark:border-amber-400/60 dark:bg-amber-500/10`
  return `${base} border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-black/20`
}

function classifyOption(opt, selectedSet, correctSet) {
  const sel = selectedSet.has(opt)
  const cor = correctSet.has(opt)
  if (sel && cor) return 'sel-ok'
  if (sel && !cor) return 'sel-bad'
  if (!sel && cor) return 'missed'
  return 'neutral'
}

export default function Results({
  questionMode,
  totalScore,
  maxScore,
  quizReview,
  onRestart,
  onChat,
  fromHistory = false,
  onBackFromHistory,
}) {
  const isTextMode = questionMode === 'text'
  const safeScore = typeof totalScore === 'number' && Number.isFinite(totalScore) ? totalScore : 0
  const pct = !isTextMode && maxScore > 0 ? Math.round((safeScore / maxScore) * 100) : null
  const accuracyLabel = pct != null ? `${pct}%` : '—'

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-10">
      <div className="w-full rounded-xl border border-slate-200 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
        <h2 className="text-center text-2xl font-semibold">Quiz Results</h2>
        {fromHistory ? (
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            Saved session — same review as when you finished
          </p>
        ) : null}

        {!isTextMode ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-black/20">
              <div className="text-sm text-slate-500">Score</div>
              <div className="mt-1 text-3xl font-semibold">
                {safeScore.toFixed(2)} / {maxScore}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-black/20">
              <div className="text-sm text-slate-500">Accuracy</div>
              <div className="mt-1 text-3xl font-semibold">{accuracyLabel}</div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
            Text mode: review your answers below (no score).
          </p>
        )}

        <div
          className={[
            'mt-6 grid gap-3',
            fromHistory && onBackFromHistory ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
          ].join(' ')}
        >
          {fromHistory && onBackFromHistory ? (
            <button
              type="button"
              onClick={onBackFromHistory}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-black/20 dark:text-slate-100 dark:hover:bg-black/30"
            >
              Back to home
            </button>
          ) : null}

          <button
            type="button"
            onClick={onRestart}
            className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            Start Again
          </button>

          <button
            type="button"
            onClick={onChat}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-black/20 dark:text-slate-100 dark:hover:bg-black/30"
            disabled={!onChat}
          >
            Chat about Topic
          </button>
        </div>
      </div>

      <div className="w-full">
        <h3 className="text-left text-sm font-semibold text-slate-700 dark:text-slate-200">Question review</h3>

        <div className="mt-3 flex max-h-[52vh] flex-col gap-3 overflow-auto pr-1">
          {quizReview && quizReview.length > 0 ? (
            quizReview.map((item, idx) => {
              const isText = item.questionType === 'text'
              const selected = new Set(item.userAnswer?.selected || [])
              const correct = new Set(item.correctAnswer || [])

              return (
                <div
                  key={`${item.question}-${idx}`}
                  className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-black/20"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400">Q{idx + 1}</div>

                  {!isText ? (
                    <div className="mt-2 inline-flex">
                      <span
                        className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusBadgeClasses(item.status)}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </div>
                  ) : null}

                  <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">{item.question}</div>

                  {!isText && item.options?.length ? (
                    <div className="mt-3 grid gap-2">
                      {item.options.map((opt) => {
                        const kind = classifyOption(opt, selected, correct)
                        return (
                          <div key={opt} className={optionRowClass(kind)}>
                            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" />
                            <div className="flex-1">
                              <div className="text-slate-900 dark:text-slate-100">{opt}</div>
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {kind === 'sel-ok'
                                  ? 'You selected this — correct.'
                                  : kind === 'sel-bad'
                                    ? 'You selected this — incorrect.'
                                    : kind === 'missed'
                                      ? 'Correct option (you did not select it).'
                                      : 'Not selected.'}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}

                  {isText ? (
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-black/30">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Your answer</div>
                        <div className="mt-1 text-slate-900 dark:text-slate-100">{item.userAnswer?.text || '—'}</div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-black/30">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Correct answer</div>
                        <div className="mt-1 text-slate-900 dark:text-slate-100">
                          {item.correctAnswer?.length ? item.correctAnswer.join(', ') : '—'}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {!isText ? (
                    <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-medium">Correct answer(s):</span>{' '}
                      {item.correctAnswer?.length ? item.correctAnswer.join(', ') : '—'}
                    </div>
                  ) : null}

                  {item.explanation ? (
                    <p className="mt-3 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">{item.explanation}</p>
                  ) : null}
                </div>
              )
            })
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-black/20 dark:text-slate-300">
              No answers to review yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
