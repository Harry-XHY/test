import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import FeedbackWidget from './components/FeedbackWidget'
import UploadPage from './pages/UploadPage'
import ChecklistPage from './pages/ChecklistPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import PrivacyPage from './pages/PrivacyPage'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/checklist/:id" element={<ChecklistPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
        </Routes>
      </Layout>
      <FeedbackWidget />
    </BrowserRouter>
  )
}
