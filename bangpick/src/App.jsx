import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import FriendPage from './pages/FriendPage'
import HistoryPage from './pages/HistoryPage'
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
        <Route path="/friend/:id" element={<FriendPage />} />
        <Route path="/vote/:id" element={<SharePage />} />
      </Routes>
    </BrowserRouter>
  )
}
