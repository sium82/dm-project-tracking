import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { ToastMessage } from '@/types'

interface ToastCtx {
  toasts: ToastMessage[]
  toast: (msg: string, type?: ToastMessage['type'], duration?: number) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const toast = useCallback((message: string, type: ToastMessage['type'] = 'info', duration = 3000) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type, duration }])
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } as any : t))
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 280)
    }, duration)
  }, [])

  return (
    <Ctx.Provider value={{ toasts, toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast outside provider')
  return ctx
}

const ICONS: Record<string, string> = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' }

function ToastContainer({ toasts, onRemove }: { toasts: (ToastMessage & { leaving?: boolean })[]; onRemove: (id: string) => void }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}${t.leaving ? ' leaving' : ''}`} onClick={() => onRemove(t.id)}>
          <div className="toast-content">
            <span style={{ fontSize: 16, fontWeight: 700 }}>{ICONS[t.type]}</span>
            <span>{t.message}</span>
          </div>
          <div className="toast-progress" style={{ animationDuration: `${t.duration}ms` }} />
        </div>
      ))}
    </div>
  )
}
