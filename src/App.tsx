import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Activity } from '@/pages/Activity'
import { Dashboard } from '@/pages/Dashboard'
import { Landing } from '@/pages/Landing'
import { Safety } from '@/pages/Safety'
import { Send } from '@/pages/Send'
import { Settings } from '@/pages/Settings'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="send" element={<Send />} />
        <Route path="activity" element={<Activity />} />
        <Route path="safety" element={<Safety />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
