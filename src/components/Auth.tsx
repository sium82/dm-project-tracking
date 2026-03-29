import { useState } from 'react'
import { AnimatedBackground } from './AnimatedBackground'
import { getUsers, saveUsers, setSession } from '@/lib/storage'
import type { User } from '@/types'

interface Props {
  onAuth: (user: User, isNew: boolean) => void
}

export function Auth({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const users = getUsers()

    if (mode === 'signup') {
      if (!name.trim()) return setError('Full name is required')
      if (!email.trim()) return setError('Email is required')
      if (password.length < 6) return setError('Password must be at least 6 characters')
      if (users.find(u => u.email === email.toLowerCase().trim())) return setError('Email already registered')
      const user: User = {
        id: crypto.randomUUID(), name: name.trim(),
        email: email.toLowerCase().trim(), password, createdAt: new Date().toISOString(),
      }
      saveUsers([...users, user])
      setSession(user)
      onAuth(user, true)
    } else {
      const user = users.find(u => u.email === email.toLowerCase().trim() && u.password === password)
      if (!user) return setError('Invalid email or password')
      setSession(user)
      onAuth(user, false)
    }
  }

  return (
    <div className="auth-screen">
      <AnimatedBackground />
      <div className="auth-container">
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <h1><span>Project</span> Tracking</h1>
        </div>
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={`auth-tab${mode === 'login' ? ' active' : ''}`} onClick={() => { setMode('login'); setError('') }}>Login</button>
            <button className={`auth-tab${mode === 'signup' ? ' active' : ''}`} onClick={() => { setMode('signup'); setError('') }}>Sign Up</button>
          </div>
          <form onSubmit={submit} className="auth-form">
            {mode === 'signup' && (
              <div className="form-group">
                <label>Full Name</label>
                <input className="game-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" autoFocus />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input className="game-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus={mode === 'login'} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="game-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="btn btn-primary btn-ripple" style={{ justifyContent: 'center', padding: '11px' }}>
              {mode === 'login' ? '⚡ ACCESS SYSTEM' : '✦ CREATE ACCOUNT'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

interface WelcomeProps {
  user: User
  onDone: () => void
}

export function WelcomeScreen({ user, onDone }: WelcomeProps) {
  return (
    <div className="welcome-screen">
      <AnimatedBackground />
      <div className="welcome-content">
        <div className="welcome-title">
          Welcome,
          <span>{user.name}!</span>
        </div>
        <div className="welcome-sub">Your command center is ready.</div>
        <div className="welcome-continue">
          <button className="btn btn-primary btn-ripple" style={{ fontSize: 14, padding: '12px 32px' }} onClick={onDone}>
            ▶ ENTER DASHBOARD
          </button>
        </div>
      </div>
    </div>
  )
}
