// Quiz play page — answer questions one at a time

import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { QUIZZES } from '../lib/quizData'
import { calcScores, matchPersonality, saveQuizResult } from '../lib/quizLogic'

export default function QuizPlayPage() {
  const { type } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const quiz = QUIZZES[type]

  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selected, setSelected] = useState(null) // animation state

  if (!quiz) {
    return <Navigate to="/quiz" replace />
  }

  const total = quiz.questions.length
  const question = quiz.questions[currentQ]
  const progress = ((currentQ) / total) * 100

  function handleSelect(optIdx) {
    if (selected !== null) return // prevent double tap
    setSelected(optIdx)

    const newAnswers = [...answers, optIdx]

    setTimeout(() => {
      if (currentQ + 1 < total) {
        setAnswers(newAnswers)
        setCurrentQ(currentQ + 1)
        setSelected(null)
      } else {
        // Done — calculate result and navigate
        const scores = calcScores(type, newAnswers)
        const personality = matchPersonality(type, scores)
        saveQuizResult(type, { scores, personality })
        navigate(`/quiz/${type}/result`, { replace: true })
      }
    }, 400)
  }

  function handleBack() {
    if (currentQ > 0) {
      setAnswers(answers.slice(0, -1))
      setCurrentQ(currentQ - 1)
      setSelected(null)
    } else {
      navigate('/quiz')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#0a0e14] via-[#0f141a] to-[#0a0e14]">
      {/* Header */}
      <header className="flex-shrink-0 bg-[#0a0e14]/80 backdrop-blur-xl z-50">
        <div className="flex items-center px-6 h-16">
          <button onClick={handleBack} className="mr-3 text-[var(--muted)]">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-[var(--text)]">{t(quiz.title)}</h1>
          <span className="ml-auto text-sm text-[var(--muted)] font-medium">{currentQ + 1}/{total}</span>
        </div>
        {/* Progress bar */}
        <div className="h-1 w-full bg-white/5">
          <div className="h-full transition-all duration-500 ease-out rounded-r-full"
            style={{ width: `${progress}%`, background: quiz.color }} />
        </div>
      </header>

      {/* Question */}
      <main className="flex-1 flex flex-col justify-center px-6 max-w-xl mx-auto w-full">
        <div className="mb-8">
          <p className="text-2xl font-bold text-[var(--text)] leading-relaxed">{t(question.q)}</p>
        </div>

        <div className="space-y-3">
          {question.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={selected !== null}
              className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border ${
                selected === idx
                  ? 'border-transparent scale-[0.97]'
                  : 'border-white/5 hover:border-white/15 active:scale-[0.98]'
              } ${selected !== null && selected !== idx ? 'opacity-40' : ''}`}
              style={selected === idx ? {
                background: `linear-gradient(135deg, ${quiz.color}22, ${quiz.color}11)`,
                borderColor: quiz.color,
              } : {
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={selected === idx
                    ? { background: quiz.color, color: '#0a0e14' }
                    : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }
                  }>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-[15px] font-medium text-[var(--text)]">{t(opt.text)}</span>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Decorative */}
      <div className="fixed bottom-0 left-0 w-full h-40 bg-gradient-to-t from-[#0a0e14] to-transparent pointer-events-none" />
    </div>
  )
}
