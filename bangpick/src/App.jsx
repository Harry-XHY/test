import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import FriendPage from './pages/FriendPage'
import HistoryPage from './pages/HistoryPage'
import SharePage from './pages/SharePage'

function Placeholder({ name }) {
  return <div className="p-4 text-center text-slate-400">{name} — coming soon</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/friend/:id" element={<FriendPage />} />
        <Route path="/vote/:id" element={<SharePage />} />
      </Routes>
    </BrowserRouter>
  )
}
