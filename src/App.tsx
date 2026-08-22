import { useState } from 'react'
import { MainShell } from './components/MainShell'
import { PairScreen } from './components/PairScreen'
import { loadCredentials } from './lib/storage'
import type { DeviceCredentials } from './lib/types'

export default function App() {
  const [creds, setCreds] = useState<DeviceCredentials | null>(loadCredentials)

  return creds ? (
    <MainShell key={creds.deviceId} creds={creds} onUnpaired={() => setCreds(null)} />
  ) : (
    <PairScreen onPaired={setCreds} />
  )
}
