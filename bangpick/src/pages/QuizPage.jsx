// Quiz selection page — choose between decision personality and investor style

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BottomNav from '../components/BottomNav'
import QuizIcon from '../components/QuizIcons'
import { QUIZZES } from '../lib/quizData'
import { loadQuizResult } from '../lib/quizLogic'

const quizList = [
  { type: 'decision', ...QUIZZES.decision },
  { type: 'investor', ...QUIZZES.investor },
]

export default function QuizPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#0a0e14] via-[#0f141a] to-[#0a0e14]">
      {/* Header */}
      <header className="flex-shrink-0 bg-[#0a0e14]/80 backdrop-blur-xl z-50">
        <div className="flex items-center px-6 h-16">
          <button onClick={() => navigate('/')} className="mr-3 text-[var(--muted)]">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="material-symbols-outlined text-[var(--primary)] mr-2" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
          <h1 className="text-xl font-black tracking-tighter text-[var(--primary)]">{t('quiz.fun_test')}</h1>
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 pt-8 pb-24 max-w-xl mx-auto w-full">
        <h2 className="text-2xl font-extrabold mb-2 text-[var(--text)]">{t('quiz.discover')}</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-8">{t('quiz.discover_desc')}</p>

        <div className="space-y-4">
          {quizList.map(({ type, title, subtitle, icon, color, questions }) => {
            const prevResult = loadQuizResult(type)
            return (
              <button
                key={type}
                onClick={() => navigate(`/quiz/${type}`)}
                className="w-full text-left glass-card rounded-2xl p-6 relative overflow-hidden active:scale-[0.98] transition-all duration-300 group"
              >
                {/* Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 -translate-y-1/2 translate-x-1/3 group-hover:opacity-35 transition-opacity"
                  style={{ background: color }} />

                <div className="flex items-start gap-4">
                  <QuizIcon id={type === 'decision' ? 'crystal' : 'chart'} size={56} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-[var(--text)] mb-1">{t(title)}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-2">{t(subtitle)}</p>
                    <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                      <span>{t('quiz.question_count', { count: questions.length })}</span>
                      <span>·</span>
                      <span>{t('quiz.about_1_min')}</span>
                    </div>
                    {prevResult && (
                      <div className="mt-3 flex items-center gap-2 text-xs" style={{ color }}>
                        <QuizIcon id={prevResult.personality?.id} size={18} />
                        <span className="font-medium">{t('quiz.prev_result', { name: t(prevResult.personality?.name) })}</span>
                        <span className="text-[var(--muted)]">· {t('quiz.retake')}</span>
                      </div>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-[var(--muted)] group-hover:text-white transition-colors mt-1">arrow_forward</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Info */}
        <div className="mt-10 text-center text-xs text-[var(--muted)]">
          <p>{t('quiz.disclaimer')}</p>
          <p className="mt-1">{t('quiz.disclaimer_2')} ✨</p>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
