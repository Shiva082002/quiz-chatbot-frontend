const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

async function getJson(path) {
  const res = await fetch(`${API_BASE_URL}${path}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error || `Request failed: ${res.status}`
    throw new Error(msg)
  }
  return data
}

async function postJson(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error || `Request failed: ${res.status}`
    throw new Error(msg)
  }
  return data
}

export async function generateQuestion({ topic, difficulty, type, history }) {
  const data = await postJson('/api/generate-question', { topic, difficulty, type, history })
  return data
}

export async function generateBatchQuestions({ topic, difficulty, type, count, history }) {
  const data = await postJson('/api/generate-batch-questions', { topic, difficulty, type, count, history })
  return data.questions
}

export async function evaluateAnswer({ question, userAnswer }) {
  const userAnswerPayload = question.type === 'text' ? userAnswer.text : userAnswer.selected
  const data = await postJson('/api/evaluate-answer', {
    question: question.question,
    type: question.type,
    options: question.options,
    correctAnswer: question.correctAnswer,
    userAnswer: userAnswerPayload,
  })
  return data
}

export async function sendChatMessage({ topic, message, history }) {
  const data = await postJson('/api/chat', { topic, message, history: history || [] })
  return data.reply
}

/** Persist anonymous quiz session to backend (MongoDB if configured). */
export async function saveQuizSession(payload) {
  const data = await postJson('/api/save-quiz-session', payload)
  return data
}

/** Paginated saved sessions. Response includes mongoConfigured + querySucceeded (retry if false). */
export async function fetchQuizSessions({ offset = 0, limit = 5 } = {}) {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  })
  return getJson(`/api/quiz-sessions?${params}`)
}

