import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import FriendPage from './pages/FriendPage'
import HistoryPage from './pages/HistoryPage'
import QuizPage from './pages/QuizPage'
import QuizPlayPage from './pages/QuizPlayPage'
import QuizResultPage from './pages/QuizResultPage'
import SharePage from './pages/SharePage'
import StockPage from './pages/StockPage'
import WatchlistPage from './pages/WatchlistPage'
import NotificationBanner from './components/NotificationBanner'
import { hydrateOnBoot } from './lib/cloudSync'

export default function App() {
  useEffect(() => {
    hydrateOnBoot()
  }, [])

  return (
    <BrowserRouter>
      <NotificationBanner />
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/quiz/:type" element={<QuizPlayPage />} />
        <Route path="/quiz/:type/result" element={<QuizResultPage />} />
        <Route path="/friend/:id" element={<FriendPage />} />
        <Route path="/vote/:id" element={<SharePage />} />
      </Routes>
    </BrowserRouter>
  )
}
