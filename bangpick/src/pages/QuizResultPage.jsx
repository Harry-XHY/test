// Quiz result page — personality type + AI interpretation + share card

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QUIZZES } from '../lib/quizData'
import { loadQuizResult, buildQuizPrompt } from '../lib/quizLogic'
import { sendMessage } from '../lib/minimax'
import RadarChart from '../components/RadarChart'
import ShareCard from '../components/ShareCard'
import QuizIcon from '../components/QuizIcons'
import BottomNav from '../components/BottomNav'

const LOADING_TEXTS = [
  '正在窥探你的灵魂...',
  '分析你的脑回路中...',
  '解码你的决策DNA...',
  '正在生成毒舌点评...',
]

function extractAIResult(text) {
  try { return JSON.parse(text) } catch {}
  const m = text.match(/\{[\s\S]*\}/)
  if (m) { try { return JSON.parse(m[0]) } catch {} }
  return null
}

export default function QuizResultPage() {
  const { type } = useParams()
  const navigate = useNavigate()
  const quiz = QUIZZES[type]
  const result = loadQuizResult(type)

  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(false)
  const [loadingText, setLoadingText] = useState(LOADING_TEXTS[0])
  const [showShare, setShowShare] = useState(false)

  useEffect(() => {
    if (!result || !quiz) return

    setAiLoading(true)
    setAiError(false)

    // Rotate loading text
    let idx = 0
    const timer = setInterval(() => {
      idx = (idx + 1) % LOADING_TEXTS.length
      setLoadingText(LOADING_TEXTS[idx])
    }, 2000)

    const { system, messages } = buildQuizPrompt(type, result.personality, result.scores)
    sendMessage(system, messages)
      .then((res) => {
        const parsed = extractAIResult(res.raw)
        if (parsed && parsed.title) {
          setAiResult(parsed)
        } else {
          // Use fallback
          setAiResult({
            title: result.personality.name,
            description: result.personality.fallback,
            tip: '做自己就好。',
          })
        }
      })
      .catch(() => {
        setAiError(true)
        // Fallback
        setAiResult({
          title: result.personality.name,
          description: result.personality.fallback,
          tip: '做自己就好。',
        })
      })
      .finally(() => {
        setAiLoading(false)
        clearInterval(timer)
      })

    return () => clearInterval(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!quiz || !result) {
    navigate('/quiz', { replace: true })
    return null
  }

  const { personality, scores } = result
  const otherType = type === 'decision' ? 'investor' : 'decision'

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-gradient-to-br from-[#0a0e14] via-[#0f141a] to-[#0a0e14]">
      {/* Header */}
      <header className="flex-shrink-0 bg-[#0a0e14]/80 backdrop-blur-xl z-50">
        <div className="flex items-center justify-between px-6 h-16">
          <button onClick={() => navigate('/quiz')} className="text-[var(--muted)]">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-[var(--text)]">测试结果</h1>
          <div className="w-6" />
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 pt-6 pb-24 max-w-xl mx-auto w-full">
        {/* Personality Header */}
        <div className="text-center mb-6">
          <div className="mb-3 flex justify-center"><QuizIcon id={personality.id} size={96} /></div>
          <h2 className="text-3xl font-black mb-2" style={{ color: personality.color }}>
            {personality.name}
          </h2>
          <p className="text-[var(--text-secondary)] text-sm">{personality.desc}</p>
        </div>

        {/* Radar Chart */}
        <div className="glass-card rounded-2xl p-4 mb-4">
          <RadarChart
            dimensions={quiz.dimensions}
            scores={scores}
            labels={quiz.dimensionLabels}
            color={personality.color}
          />
        </div>

        {/* AI Interpretation */}
        <div className="glass-card rounded-2xl p-5 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[50px] opacity-15"
            style={{ background: personality.color }} />

          {aiLoading ? (
            <div className="text-center py-6">
              <div className="flex justify-center gap-1.5 mb-3">
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: personality.color, animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: personality.color, animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: personality.color, animationDelay: '300ms' }} />
              </div>
              <p className="text-sm text-[var(--muted)] animate-pulse">{loadingText}</p>
            </div>
          ) : aiResult ? (
            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3 leading-snug">
                "{aiResult.title}"
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                {aiResult.description}
              </p>
              {aiResult.tip && (
                <div className="flex items-start gap-2 bg-white/5 rounded-xl p-3">
                  <span className="material-symbols-outlined text-sm mt-0.5" style={{ color: personality.color }}>
                    lightbulb
                  </span>
                  <p className="text-xs text-[var(--text-secondary)]">{aiResult.tip}</p>
                </div>
              )}
              {aiError && (
                <p className="text-xs text-[var(--muted)] mt-2 text-center">AI 解读暂时不可用，已显示预设解读</p>
              )}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => setShowShare(true)}
            disabled={aiLoading}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-[15px] transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${personality.color}, ${personality.color}88)` }}
          >
            <span className="material-symbols-outlined text-sm align-middle mr-1">share</span>
            生成分享图片
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate(`/quiz/${type}`, { replace: true })}
              className="py-3 rounded-2xl font-medium text-sm text-[var(--text)] bg-white/5 hover:bg-white/10 transition-colors"
            >
              再测一次
            </button>
            <button
              onClick={() => navigate(`/quiz/${otherType}`)}
              className="py-3 rounded-2xl font-medium text-sm text-[var(--text)] bg-white/5 hover:bg-white/10 transition-colors"
            >
              换一套测试
            </button>
          </div>
        </div>
      </main>

      {/* Share Card Modal */}
      {showShare && (
        <ShareCard
          personality={personality}
          scores={scores}
          dimensions={quiz.dimensions}
          dimensionLabels={quiz.dimensionLabels}
          quizTitle={quiz.title}
          aiResult={aiResult}
          onClose={() => setShowShare(false)}
        />
      )}

      <BottomNav />
    </div>
  )
}
