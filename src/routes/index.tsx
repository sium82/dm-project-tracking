import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AnimatedBackground } from '@/components/AnimatedBackground'
import { Auth, WelcomeScreen } from '@/components/Auth'
import { Dashboard } from '@/components/Dashboard'
import { Analytics } from '@/components/Analytics'
import { ToastProvider } from '@/context/ToastContext'
import { getSession, setSession } from '@/lib/storage'
import type { User } from '@/types'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [user, setUser] = useState<User | null>(() => getSession())
  const [showWelcome, setShowWelcome] = useState(false)
  const [tab, setTab] = useState<'dashboard' | 'analytics'>('dashboard')

  if (!user) {
    return (
      <ToastProvider>
        <Auth
          onAuth={(u, isNew) => {
            setUser(u)
            if (isNew) setShowWelcome(true)
          }}
        />
      </ToastProvider>
    )
  }

  if (showWelcome) {
    return (
      <WelcomeScreen
        user={user}
        onDone={() => setShowWelcome(false)}
      />
    )
  }

  function logout() {
    setSession(null)
    setUser(null)
  }

  return (
    <ToastProvider>
      <div className="app-root">
        <AnimatedBackground />

        {/* Header */}
        <header className="app-header">
          <div className="header-brand">
            <div className="header-logo">⚡</div>
            <span className="header-title">Project Tracking</span>
          </div>

          <div className="tab-nav">
            <button
              className={`tab-btn${tab === 'dashboard' ? ' active' : ''}`}
              onClick={() => setTab('dashboard')}
            >
              📋 Dashboard
            </button>
            <button
              className={`tab-btn${tab === 'analytics' ? ' active' : ''}`}
              onClick={() => setTab('analytics')}
            >
              📊 Analytics
            </button>
          </div>

          <div className="header-right">
            <div className="header-user">
              <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
              <span>{user.name}</span>
            </div>
            <button className="btn btn-neutral btn-sm btn-ripple" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="main-content">
          {tab === 'dashboard' ? (
            <Dashboard user={user} />
          ) : (
            <Analytics user={user} />
          )}
        </main>
      </div>
    </ToastProvider>
  )
}
