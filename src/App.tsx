import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { LockScreen } from '@/components/LockScreen'
import { useSilentFailureTriggers } from '@/hooks/useSilentFailureTriggers'
import { Activity } from '@/pages/Activity'
import { Dashboard } from '@/pages/Dashboard'
import { Settings } from '@/pages/Settings'
import { Transfer } from '@/pages/Transfer'

function App() {
  const [locked, setLocked] = useState(true)
  useSilentFailureTriggers()

  if (locked) {
    return <LockScreen onUnlock={() => setLocked(false)} />
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/app" element={<AppShell onLock={() => setLocked(true)} />}>
        <Route index element={<Dashboard />} />
        <Route path="activity" element={<Activity />} />
        <Route path="transfer" element={<Transfer />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

export default App
