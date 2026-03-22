import { useRef, useState } from 'react'

import Landing from './components/Landing'
import QuizViewBatched from './components/QuizViewBatched'
import ChatView from './components/ChatView'
import Results from './components/Results'
import SessionHistory from './components/SessionHistory'
import { saveQuizSession } from './lib/api'

export default function QuizMasterApp() {
  const [stage, setStage] = useState('landing')
  const [settings, setSettings] = useState(null)
  const [finalScore, setFinalScore] = useState(0)
  const [quizReview, setQuizReview] = useState([])
  const [chatTopic, setChatTopic] = useState('')
  const [resultsFromHistory, setResultsFromHistory] = useState(false)
  const [sessionMaxScore, setSessionMaxScore] = useState(null)
  const activeQuizRef = useRef(null)

  function handleStart({ topic, difficulty, questionType, questionCount }) {
    const session = { topic, difficulty, questionType, questionCount }
    activeQuizRef.current = session
    setSettings(session)
    setFinalScore(0)
    setStage('quiz')
  }

  function handleFinish(score, results) {
    const list = results || []
    setResultsFromHistory(false)
    setSessionMaxScore(null)
    setFinalScore(score)
    setQuizReview(list)
    setStage('results')

    const s = activeQuizRef.current
    if (s) {
      const payload = {
        topic: s.topic,
        difficulty: s.difficulty,
        questionType: s.questionType,
        questionCount: s.questionCount ?? 20,
        results: list,
      }
      if (s.questionType === 'text') {
        payload.totalScore = null
        payload.maxScore = null
      } else {
        payload.totalScore = score
        payload.maxScore = list.length
      }
      saveQuizSession(payload).catch(() => {})
    }
  }

  function handleChatStart({ topic }) {
    setChatTopic(topic)
    setStage('chat')
  }

  function handleOpenHistorySession(doc) {
    const list = doc.results || []
    const mode = doc.questionType || 'single'
    setResultsFromHistory(true)
    setSettings({
      topic: doc.topic,
      difficulty: doc.difficulty,
      questionType: mode,
      questionCount: doc.questionCount ?? 20,
    })
    if (mode === 'text') {
      setFinalScore(0)
      setSessionMaxScore(null)
    } else {
      const ts = doc.totalScore
      setFinalScore(ts != null && Number.isFinite(Number(ts)) ? Number(ts) : 0)
      setSessionMaxScore(
        doc.maxScore != null && Number.isFinite(Number(doc.maxScore)) ? Number(doc.maxScore) : list.length,
      )
    }
    setQuizReview(list)
    setStage('results')
  }

  function goHomeFromResults() {
    setResultsFromHistory(false)
    setSessionMaxScore(null)
    setStage('landing')
  }

  const resultsMaxScore =
    settings?.questionType === 'text' ? 0 : sessionMaxScore != null ? sessionMaxScore : quizReview.length

  return (
    <div className="min-h-screen">
      {stage === 'landing' ? (
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 pb-14 pt-6">
          <Landing onStart={handleStart} onChat={handleChatStart} />
          <SessionHistory onOpenSession={handleOpenHistorySession} />
        </div>
      ) : null}

      {stage === 'quiz' && settings ? (
        <QuizViewBatched
          topic={settings.topic}
          difficulty={settings.difficulty}
          questionType={settings.questionType}
          questionCount={settings.questionCount ?? 20}
          onFinish={handleFinish}
        />
      ) : null}

      {stage === 'chat' ? (
        <ChatView
          topic={chatTopic}
          onExit={() => {
            setStage('landing')
          }}
        />
      ) : null}

      {stage === 'results' ? (
        <Results
          questionMode={settings?.questionType || 'single'}
          totalScore={finalScore}
          maxScore={resultsMaxScore}
          quizReview={quizReview}
          fromHistory={resultsFromHistory}
          onBackFromHistory={resultsFromHistory ? goHomeFromResults : undefined}
          onRestart={() => {
            setResultsFromHistory(false)
            setSessionMaxScore(null)
            setStage('landing')
          }}
          onChat={() => {
            const t = settings?.topic || chatTopic
            if (t) handleChatStart({ topic: t })
          }}
        />
      ) : null}
    </div>
  )
}
