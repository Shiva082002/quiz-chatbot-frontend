import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import QuizMasterApp from './QuizMasterApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QuizMasterApp />
  </StrictMode>,
)
