export default function Feedback({ status, explanation, questionType, correctAnswer }) {
  const banner =
    status === 'correct'
      ? { label: 'Correct', className: 'border-green-500/60 bg-green-50 text-green-900 dark:bg-green-500/10 dark:text-green-200' }
      : status === 'partial'
        ? { label: 'Partially correct', className: 'border-amber-500/60 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200' }
        : { label: 'Incorrect', className: 'border-red-500/60 bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-200' }

  const correctText =
    questionType === 'text' ? (correctAnswer?.[0] ? correctAnswer[0] : '') : correctAnswer?.join(', ') || ''

  return (
    <div className="mt-4 rounded-lg border px-4 py-3 text-sm">
      <div className={`inline-flex items-center gap-2 rounded-md border ${banner.className} px-3 py-2`}>
        <span className="font-semibold">{banner.label}</span>
      </div>

      <p className="mt-3 text-slate-700 dark:text-slate-200">{explanation}</p>

      {correctText ? (
        <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium">Correct answer:</span> {correctText}
        </div>
      ) : null}
    </div>
  )
}

