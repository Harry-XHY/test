import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import FeedbackWidget from './components/FeedbackWidget'
import UploadPage from './pages/UploadPage'
import ChecklistPage from './pages/ChecklistPage'
import HistoryPage from './pages/HistoryPage'
import MergePage from './pages/MergePage'
import SettingsPage from './pages/SettingsPage'
import PrivacyPage from './pages/PrivacyPage'
import { migrateFromLocalStorage } from './lib/db'

export default function App() {
  // 首次启动时自动迁移 localStorage 数据到 IndexedDB
  useEffect(() => {
    migrateFromLocalStorage()
  }, [])
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/checklist/:id" element={<ChecklistPage />} />
          <Route path="/merge" element={<MergePage />} />
          <Route path="/merge/:id" element={<MergePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
        </Routes>
      </Layout>
      <FeedbackWidget />
    </BrowserRouter>
  )
}
