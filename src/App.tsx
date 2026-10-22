import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { LockScreen } from '@/components/LockScreen'
import { SilentFailureCue } from '@/components/SilentFailureCue'
import { SilentFailureRecovery } from '@/components/SilentFailureRecovery'
import { useDecoyPrewarm } from '@/hooks/useDecoyPrewarm'
import { useSilentFailureCue } from '@/hooks/useSilentFailureCue'
import { useSilentFailureTriggers } from '@/hooks/useSilentFailureTriggers'
import { Activity } from '@/pages/Activity'
import { Dashboard } from '@/pages/Dashboard'
import { Settings } from '@/pages/Settings'
import { Transfer } from '@/pages/Transfer'

function App() {
  const [locked, setLocked] = useState(true)
  useSilentFailureTriggers()
  useSilentFailureCue()
  useDecoyPrewarm()

  if (locked) {
    return (
      <>
        <SilentFailureCue />
        <SilentFailureRecovery />
        <LockScreen onUnlock={() => setLocked(false)} />
      </>
    )
  }

  return (
    <>
      <SilentFailureCue />
      <SilentFailureRecovery />
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="activity" element={<Activity />} />
          <Route path="transfer" element={<Transfer />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </>
  )
}

export default App
