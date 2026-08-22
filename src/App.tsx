import { useState } from 'react'
import { HomeScreen } from './components/HomeScreen'
import { PairScreen } from './components/PairScreen'
import { loadCredentials } from './lib/storage'
import type { DeviceCredentials } from './lib/types'

export default function App() {
  const [creds, setCreds] = useState<DeviceCredentials | null>(loadCredentials)

  return creds ? (
    <HomeScreen creds={creds} onUnpaired={() => setCreds(null)} />
  ) : (
    <PairScreen onPaired={setCreds} />
  )
}
