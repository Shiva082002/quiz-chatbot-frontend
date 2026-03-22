import { useEffect, useMemo, useRef, useState } from 'react'

import { evaluateAnswer, generateQuestion } from '../lib/api'
import Feedback from './Feedback'

const MAX_QUESTIONS = 20
const QUESTION_TIME_SECONDS = 30

function clampType(type) {
  if (type === 'single' || type === 'multi' || type === 'text') return type
  return 'single'
}

export default function QuizView({ topic, difficulty, questionType, onFinish }) {
  const type = clampType(questionType)

  const [questionNumber, setQuestionNumber] = useState(1)
  const [currentQuestion, setCurrentQuestion] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [selectedOptions, setSelectedOptions] = useState([])
  const [textAnswer, setTextAnswer] = useState('')

  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS)
  const [evaluating, setEvaluating] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState(null)
  const [scoreState, setScoreState] = useState(0)

  const stoppedRef = useRef(false)
  const submitLockedRef = useRef(false)
  const scoreRef = useRef(0)
  const historyRef = useRef([])
  const rootRef = useRef(null)

  const maxScore = MAX_QUESTIONS

  async function loadQuestion() {
    if (stoppedRef.current) return
    setLoading(true)
    setError('')
    setEvaluationResult(null)
    setSelectedOptions([])
    setTextAnswer('')
    submitLockedRef.current = false

    try {
      const q = await generateQuestion({
        topic,
        difficulty,
        type,
        history: historyRef.current,
      })
      setCurrentQuestion(q)
      setTimeLeft(QUESTION_TIME_SECONDS)
      // Scroll question area to top for smooth UX.
      rootRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e?.message || 'Failed to generate question.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Reset state when starting quiz (topic/settings change).
    stoppedRef.current = false
    submitLockedRef.current = false
    historyRef.current = []
    scoreRef.current = 0
    setScoreState(0)
    setQuestionNumber(1)
    setCurrentQuestion(null)
    setEvaluationResult(null)
    setSelectedOptions([])
    setTextAnswer('')
    setTimeLeft(QUESTION_TIME_SECONDS)
    setEvaluating(false)
    setError('')
    loadQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, difficulty, type])

  async function submitAnswer({ reason }) {
    if (stoppedRef.current) return
    if (!currentQuestion) return
    if (submitLockedRef.current) return

    submitLockedRef.current = true
    setEvaluating(true)
    setError('')

    const userAnswer =
      type === 'text'
        ? { text: textAnswer }
        : {
            selected: selectedOptions,
          }

    try {
      const result = await evaluateAnswer({ question: currentQuestion, userAnswer })
      setEvaluationResult(result)

      // Update score deterministically from backend.
      const nextScore = scoreRef.current + (Number.isFinite(result.scoreAwarded) ? result.scoreAwarded : 0)
      scoreRef.current = nextScore
      setScoreState(nextScore)

      // Add to history to reduce duplicates on next question.
      historyRef.current.push(currentQuestion.question)

      const isLast = questionNumber >= MAX_QUESTIONS
      if (isLast) {
        // Small delay so the user sees feedback colors.
        setTimeout(() => {
          if (!stoppedRef.current) onFinish(nextScore)
        }, 850)
      } else {
        setTimeout(() => {
          if (stoppedRef.current) return
          setQuestionNumber((n) => n + 1)
        }, 850)
      }
    } catch (e) {
      setError(e?.message || 'Failed to evaluate answer.')
      // Allow retry for this question.
      submitLockedRef.current = false
    } finally {
      setEvaluating(false)
    }
  }

  useEffect(() => {
    // Load next question after incrementing questionNumber.
    if (!currentQuestion) return
    if (questionNumber === 1) return
    loadQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionNumber])

  useEffect(() => {
    if (!currentQuestion) return
    if (evaluationResult) return
    if (evaluating) return
    if (submitLockedRef.current) return

    const id = setInterval(() => {
      setTimeLeft((t) => t - 1)
    }, 1000)
    return () => clearInterval(id)
  }, [currentQuestion, evaluationResult, evaluating])

  useEffect(() => {
    if (!currentQuestion) return
    if (evaluationResult) return
    if (evaluating) return
    if (submitLockedRef.current) return
    if (timeLeft <= 0) {
      // Timer expiry should still evaluate even if user didn't select anything.
      submitAnswer({ reason: 'timeout' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, currentQuestion, evaluationResult, evaluating])

  function stopQuiz() {
    stoppedRef.current = true
    onFinish(scoreRef.current)
  }

  const canSubmit = useMemo(() => {
    if (!currentQuestion) return false
    if (type === 'text') return textAnswer.trim().length > 0
    if (type === 'single') return selectedOptions.length === 1
    return selectedOptions.length > 0
  }, [currentQuestion, selectedOptions, textAnswer, type])

  const correctSet = useMemo(() => {
    if (!evaluationResult) return new Set()
    return new Set(evaluationResult.correctAnswer || [])
  }, [evaluationResult])

  function optionClass({ option, selected, correct }) {
    const base =
      'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-purple-500'

    if (!evaluationResult) {
      const interactive = selected
        ? 'border-purple-500/60 bg-purple-50'
        : 'border-slate-200 bg-white/70 hover:bg-white dark:border-slate-800 dark:bg-black/20 dark:hover:bg-black/30'
      return `${base} ${interactive}`
    }

    if (correct) return `${base} border-green-500/70 bg-green-50 dark:bg-green-500/10 dark:border-green-400/70`
    if (selected && !correct) return `${base} border-red-500/70 bg-red-50 dark:bg-red-500/10 dark:border-red-400/70`
    return `${base} border-slate-200 bg-white/50 dark:border-slate-800 dark:bg-black/10`
  }

  const correctOptionSingle = evaluationResult?.correctAnswer?.[0]

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          Q{questionNumber}/{MAX_QUESTIONS}
        </div>
        <div className="rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-xs dark:border-slate-800 dark:bg-white/5">
          Time: <span className="font-semibold">{Math.max(0, timeLeft)}s</span>
        </div>
      </div>

      <div ref={rootRef} className="mt-4 max-h-[72vh] overflow-auto rounded-xl border border-slate-200 bg-white/50 p-5 shadow-sm dark:border-slate-800 dark:bg-black/10">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Topic: <span className="font-medium text-slate-700 dark:text-slate-200">{topic}</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Score:{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {scoreState.toFixed(2)}
            </span>
          </div>
          <button
            type="button"
            onClick={stopQuiz}
            disabled={evaluating}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-black/20 dark:hover:bg-black/30"
          >
            Stop
          </button>
        </div>

        {loading ? (
          <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-300">Generating question…</div>
        ) : error ? (
          <div className="mt-8 rounded-lg border border-red-500/60 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
            {error}
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
                  const correct = evaluationResult ? opt === correctOptionSingle : false
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={optionClass({ option: opt, selected, correct })}
                      onClick={() => {
                        if (evaluationResult || evaluating) return
                        setSelectedOptions([opt])
                      }}
                      disabled={!!evaluationResult || evaluating}
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
                  const correct = evaluationResult ? selected && correctSet.has(opt) : false
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={optionClass({ option: opt, selected, correct })}
                      onClick={() => {
                        if (evaluationResult || evaluating) return
                        setSelectedOptions((prev) => {
                          if (prev.includes(opt)) return prev.filter((x) => x !== opt)
                          return [...prev, opt]
                        })
                      }}
                      disabled={!!evaluationResult || evaluating}
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
                  disabled={!!evaluationResult || evaluating}
                  placeholder="Type a short answer…"
                />
              </div>
            ) : null}

            {type !== 'text' ? (
              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => submitAnswer({ reason: 'submit' })}
                  disabled={!canSubmit || !!evaluationResult || evaluating}
                  className="rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {evaluating ? 'Evaluating…' : 'Submit'}
                </button>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {canSubmit ? '' : 'Choose an answer to enable Submit'}
                </div>
              </div>
            ) : (
              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => submitAnswer({ reason: 'submit' })}
                  disabled={!canSubmit || !!evaluationResult || evaluating}
                  className="rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {evaluating ? 'Evaluating…' : 'Submit'}
                </button>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {canSubmit ? '' : 'Type an answer to enable Submit'}
                </div>
              </div>
            )}

            {evaluationResult ? (
              <Feedback
                status={evaluationResult.status}
                explanation={evaluationResult.explanation}
                questionType={type}
                correctAnswer={evaluationResult.correctAnswer}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

