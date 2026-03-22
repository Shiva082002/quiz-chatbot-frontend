import { useEffect, useMemo, useRef, useState } from 'react'

import { generateBatchQuestions } from '../lib/api'

const QUESTION_TIME_SECONDS = 30
const BATCH_SIZE = 5

function clampType(type) {
  if (type === 'single' || type === 'multi' || type === 'text') return type
  return 'single'
}

function scoreMultiJaccard(selectedArr, correctArr) {
  const selected = new Set(selectedArr || [])
  const correct = new Set(correctArr || [])
  const union = new Set([...selected, ...correct])

  if (union.size === 0) {
    return { scoreAwarded: 0, status: 'incorrect' }
  }

  const intersectionCount = [...selected].filter((x) => correct.has(x)).length
  const scoreAwarded = intersectionCount / union.size
  const status = scoreAwarded === 1 ? 'correct' : scoreAwarded > 0 ? 'partial' : 'incorrect'
  return { scoreAwarded, status }
}

function computeMcqResult({ question, questionType, selectedOptions }) {
  const correctAnswer = question.correctAnswer || []

  if (questionType === 'single') {
    const selected = selectedOptions || []
    const expected = correctAnswer[0]
    const isCorrect = selected.length === 1 && selected[0] === expected
    return {
      status: isCorrect ? 'correct' : 'incorrect',
      scoreAwarded: isCorrect ? 1 : 0,
      correctAnswer,
      explanation: question.explanation || 'Explanation not available.',
    }
  }

  if (questionType === 'multi') {
    const { scoreAwarded, status } = scoreMultiJaccard(selectedOptions || [], correctAnswer)
    return {
      status,
      scoreAwarded,
      correctAnswer,
      explanation: question.explanation || 'Explanation not available.',
    }
  }

  return {
    status: 'incorrect',
    scoreAwarded: 0,
    correctAnswer,
    explanation: question.explanation || 'Explanation not available.',
  }
}

const GENERIC_ERROR = 'Something went wrong. Please try again.'

export default function QuizViewBatched({ topic, difficulty, questionType, questionCount = 20, onFinish }) {
  const type = clampType(questionType)

  const totalQuestions = useMemo(() => {
    const n = Number(questionCount)
    if (!Number.isFinite(n)) return 20
    return Math.min(100, Math.max(1, Math.round(n)))
  }, [questionCount])

  const [questionNumber, setQuestionNumber] = useState(1)
  const [currentQuestion, setCurrentQuestion] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [selectedOptions, setSelectedOptions] = useState([])
  const [textAnswer, setTextAnswer] = useState('')

  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS)
  const [uiLocked, setUiLocked] = useState(false)

  const stoppedRef = useRef(false)
  const submitLockedRef = useRef(false)
  const scoreRef = useRef(0)
  const historyRef = useRef([])

  const questionsRef = useRef([])
  const cursorRef = useRef(0)
  const prefetchPromiseRef = useRef(null)
  const rootRef = useRef(null)
  const resultsLogRef = useRef([])

  const canSubmit = useMemo(() => {
    if (!currentQuestion) return false
    if (type === 'text') return textAnswer.trim().length > 0
    if (type === 'single') return selectedOptions.length === 1
    return selectedOptions.length > 0
  }, [currentQuestion, selectedOptions, textAnswer, type])

  function optionClass({ selected }) {
    const base =
      'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-purple-500'
    const interactive = selected
      ? 'border-purple-500/60 bg-purple-50 dark:bg-purple-500/10'
      : 'border-slate-200 bg-white/70 hover:bg-white dark:border-slate-800 dark:bg-black/20 dark:hover:bg-black/30'
    return `${base} ${interactive}`
  }

  async function fetchMoreQuestionsIfNeeded() {
    if (stoppedRef.current) return

    const remaining = totalQuestions - questionsRef.current.length
    if (remaining <= 0) return

    const count = Math.min(BATCH_SIZE, remaining)

    if (prefetchPromiseRef.current) return prefetchPromiseRef.current

    const doFetch = async () => {
      const respQuestions = await generateBatchQuestions({
        topic,
        difficulty,
        type,
        count,
        history: historyRef.current,
      })
      questionsRef.current = [...questionsRef.current, ...respQuestions]
    }

    prefetchPromiseRef.current = doFetch()
    try {
      await prefetchPromiseRef.current
    } finally {
      prefetchPromiseRef.current = null
    }
  }

  function resetForQuestion() {
    setSelectedOptions([])
    setTextAnswer('')
    submitLockedRef.current = false
    setUiLocked(false)
    setTimeLeft(QUESTION_TIME_SECONDS)
    setError('')
  }

  async function loadInitial() {
    stoppedRef.current = false
    submitLockedRef.current = false
    scoreRef.current = 0
    resultsLogRef.current = []
    questionsRef.current = []
    cursorRef.current = 0
    historyRef.current = []

    setQuestionNumber(1)
    setCurrentQuestion(null)
    resetForQuestion()

    setLoading(true)
    setError('')
    try {
      await fetchMoreQuestionsIfNeeded()
      setCurrentQuestion(questionsRef.current[0] || null)
      rootRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
    } catch {
      setError(GENERIC_ERROR)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, difficulty, type, totalQuestions])

  useEffect(() => {
    if (!currentQuestion) return
    if (uiLocked) return

    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [currentQuestion, uiLocked])

  async function advanceToNextQuestion(nextIndex) {
    if (stoppedRef.current) return
    if (nextIndex >= totalQuestions) {
      onFinish(type === 'text' ? 0 : scoreRef.current, resultsLogRef.current)
      return
    }

    if (nextIndex >= questionsRef.current.length) {
      setLoading(true)
      setError('')
      try {
        await fetchMoreQuestionsIfNeeded()
      } catch {
        setError(GENERIC_ERROR)
        submitLockedRef.current = false
        setUiLocked(false)
        setLoading(false)
        return
      } finally {
        setLoading(false)
      }
      if (nextIndex >= questionsRef.current.length) {
        setError(GENERIC_ERROR)
        submitLockedRef.current = false
        setUiLocked(false)
        return
      }
    }

    cursorRef.current = nextIndex
    setQuestionNumber(nextIndex + 1)
    setCurrentQuestion(questionsRef.current[nextIndex] || null)
    resetForQuestion()

    rootRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  function submitAnswer({ reason }) {
    if (stoppedRef.current) return
    if (!currentQuestion) return
    if (submitLockedRef.current) return

    const forceTimeout = reason === 'timeout'
    if (!forceTimeout) {
      if (type === 'text' && !textAnswer.trim()) return
      if (type === 'single' && selectedOptions.length !== 1) return
      if (type === 'multi' && selectedOptions.length === 0) return
    }

    submitLockedRef.current = true
    setUiLocked(true)
    setError('')

    if (type === 'single' || type === 'multi') {
      const sel =
        forceTimeout && type === 'single'
          ? []
          : forceTimeout && type === 'multi'
            ? []
            : [...selectedOptions]

      const result = computeMcqResult({
        question: currentQuestion,
        questionType: type,
        selectedOptions: sel,
      })

      const nextScore = scoreRef.current + (Number.isFinite(result.scoreAwarded) ? result.scoreAwarded : 0)
      scoreRef.current = nextScore

      historyRef.current.push(currentQuestion.question)

      resultsLogRef.current.push({
        question: currentQuestion.question,
        questionType: type,
        options: [...(currentQuestion.options || [])],
        correctAnswer: result.correctAnswer || [],
        explanation: result.explanation || '',
        userAnswer: { selected: sel },
        status: result.status,
        scoreAwarded: result.scoreAwarded,
      })

      const isLast = questionNumber >= totalQuestions
      if (isLast) {
        setTimeout(() => {
          if (!stoppedRef.current) onFinish(nextScore, resultsLogRef.current)
        }, 400)
      } else {
        const nextIndex = cursorRef.current + 1
        setTimeout(() => {
          if (stoppedRef.current) return
          advanceToNextQuestion(nextIndex)
        }, 400)
      }
      return
    }

    // Text: no AI scoring during quiz; backend provides correctAnswer on each question.
    const userText = forceTimeout ? '' : textAnswer.trim()
    const correctAnswer = currentQuestion.correctAnswer || []

    historyRef.current.push(currentQuestion.question)

    resultsLogRef.current.push({
      question: currentQuestion.question,
      questionType: 'text',
      options: null,
      correctAnswer,
      explanation: currentQuestion.explanation || '',
      userAnswer: { text: userText },
      status: null,
      scoreAwarded: null,
    })

    const isLast = questionNumber >= totalQuestions
    if (isLast) {
      setTimeout(() => {
        if (!stoppedRef.current) onFinish(0, resultsLogRef.current)
      }, 400)
    } else {
      const nextIndex = cursorRef.current + 1
      setTimeout(() => {
        if (stoppedRef.current) return
        advanceToNextQuestion(nextIndex)
      }, 400)
    }
  }

  useEffect(() => {
    if (!currentQuestion) return
    if (uiLocked) return
    if (timeLeft > 0) return
    submitAnswer({ reason: 'timeout' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, currentQuestion, uiLocked])

  function stopQuiz() {
    stoppedRef.current = true
    onFinish(type === 'text' ? 0 : scoreRef.current, resultsLogRef.current)
  }

  async function handleRetry() {
    setError('')
    if (!currentQuestion && questionNumber === 1 && questionsRef.current.length === 0) {
      await loadInitial()
      return
    }
    setLoading(true)
    try {
      await fetchMoreQuestionsIfNeeded()
      const idx = cursorRef.current
      setCurrentQuestion(questionsRef.current[idx] || null)
    } catch {
      setError(GENERIC_ERROR)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          Q{questionNumber}/{totalQuestions}
        </div>
        <div className="rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-xs dark:border-slate-800 dark:bg-white/5">
          Time: <span className="font-semibold">{Math.max(0, timeLeft)}s</span>
        </div>
      </div>

      <div
        ref={rootRef}
        className="mt-4 max-h-[72vh] overflow-auto rounded-xl border border-slate-200 bg-white/50 p-5 shadow-sm dark:border-slate-800 dark:bg-black/10"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Topic: <span className="font-medium text-slate-700 dark:text-slate-200">{topic}</span>
          </div>

          <button
            type="button"
            onClick={stopQuiz}
            disabled={uiLocked}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-black/20 dark:hover:bg-black/30"
          >
            Stop
          </button>
        </div>

        {loading ? (
          <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-300">Generating questions…</div>
        ) : error ? (
          <div className="mt-8 space-y-3 rounded-lg border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => handleRetry()}
              className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700"
            >
              Try again
            </button>
          </div>
        ) : !currentQuestion ? (
          <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-300">Preparing…</div>
        ) : (
          <div key={currentQuestion.question}>
            <h2 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-50">{currentQuestion.question}</h2>

            {type === 'single' ? (
              <div className="mt-4 grid gap-3">
                {currentQuestion.options.map((opt) => {
                  const selected = selectedOptions[0] === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={optionClass({ selected })}
                      onClick={() => {
                        if (uiLocked) return
                        setSelectedOptions([opt])
                      }}
                      disabled={uiLocked}
                    >
                      <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="flex-1 text-left">{opt}</span>
                    </button>
                  )
                })}
              </div>
            ) : null}

            {type === 'multi' ? (
              <div className="mt-4 grid gap-3">
                {currentQuestion.options.map((opt) => {
                  const selected = selectedOptions.includes(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={optionClass({ selected })}
                      onClick={() => {
                        if (uiLocked) return
                        setSelectedOptions((prev) => (prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]))
                      }}
                      disabled={uiLocked}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        disabled
                      />
                      <span className="flex-1 text-left">{opt}</span>
                    </button>
                  )
                })}
              </div>
            ) : null}

            {type === 'text' ? (
              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Your answer</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-800 dark:bg-black/20"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  disabled={uiLocked}
                  placeholder="Type a short answer…"
                />
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => submitAnswer({ reason: 'submit' })}
                disabled={!canSubmit || uiLocked}
                className="rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Submit
              </button>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {type === 'text'
                  ? canSubmit
                    ? ''
                    : 'Type an answer to enable Submit'
                  : canSubmit
                    ? ''
                    : 'Choose an answer to enable Submit'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
