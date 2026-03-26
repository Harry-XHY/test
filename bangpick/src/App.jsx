import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChatPage from './pages/ChatPage'

function Placeholder({ name }) {
  return <div className="p-4 text-center text-slate-400">{name} — coming soon</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/history" element={<Placeholder name="HistoryPage" />} />
        <Route path="/friend/:id" element={<Placeholder name="FriendPage" />} />
        <Route path="/vote/:id" element={<Placeholder name="SharePage" />} />
      </Routes>
    </BrowserRouter>
  )
}
