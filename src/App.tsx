import { supabase } from './lib/supabase'
import { ConnectedApp, SetupScreen } from './auth/Auth'
import './App.css'

function App() {
  if (!supabase) return <SetupScreen />
  return <ConnectedApp client={supabase} />
}

export default App
