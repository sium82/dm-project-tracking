import { useState, useEffect } from 'react'
import { getProjects, saveProjects } from '@/lib/storage'
import { useToast } from '@/context/ToastContext'
import type { Project, ProjectStatus, User } from '@/types'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function daysLeft(deadline: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const d = new Date(deadline); d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / 86400000)
}

function deadlineClass(days: number) {
  if (days > 9) return 'dl-safe'
  if (days >= 5) return 'dl-warn'
  if (days >= 2) return 'dl-urgent'
  if (days === 1) return 'dl-critical'
  return 'dl-overdue'
}

function deadlineLabel(days: number) {
  if (days > 0) return days === 1 ? '1 day left' : `${days} days left`
  if (days === 0) return 'Due today'
  return `OVERDUE ${Math.abs(days)}d`
}

function autoOrderId(projects: Project[]) {
  const nums = projects.map(p => parseInt(p.orderId.replace(/\D/g, '') || '0', 10)).filter(Boolean)
  const next = nums.length ? Math.max(...nums) + 1 : 1001
  return `ORD-${next}`
}

const EMPTY_FORM: Omit<Project, 'id' | 'createdAt'> = {
  orderId: '', clientName: '', profileName: '', docLink: '',
  status: 'wip', assignDate: '', deadlineDate: '',
  grossValue: 0, category: '', stars: 0, notes: '', cancelRemarks: '',
}

// ─── confetti ────────────────────────────────────────────────────────────────

function launchConfetti() {
  const canvas = document.createElement('canvas')
  canvas.className = 'confetti-canvas'
  document.body.appendChild(canvas)
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const ctx = canvas.getContext('2d')!
  const colors = ['#00d4ff', '#8b5cf6', '#00ff88', '#ffd700', '#ff3355']
  const particles = Array.from({ length: 45 }, () => ({
    x: Math.random() * canvas.width, y: -10,
    vx: (Math.random() - 0.5) * 6, vy: Math.random() * 4 + 2,
    r: Math.random() * 5 + 3, color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * 360, rotV: (Math.random() - 0.5) * 8,
  }))
  let raf: number
  let frame = 0
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.rot += p.rotV
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rot * Math.PI) / 180)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r)
      ctx.restore()
    })
    frame++
    if (frame < 120) raf = requestAnimationFrame(draw)
    else document.body.removeChild(canvas)
  }
  draw()
}

// ─── Stats Cards ─────────────────────────────────────────────────────────────

function useCounter(target: number) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let cur = 0
    const step = target / 30
    const t = setInterval(() => {
      cur = Math.min(cur + step, target)
      setVal(cur)
      if (cur >= target) clearInterval(t)
    }, 16)
    return () => clearInterval(t)
  }, [target])
  return val
}

function StatCard({ label, value, color, accent, icon, prefix = '' }: {
  label: string; value: number; color: string; accent: string; icon: string; prefix?: string
}) {
  const display = useCounter(value)
  const isFloat = prefix === '$'
  return (
    <div className="stat-card" style={{ '--card-accent': accent } as React.CSSProperties}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ '--stat-color': color } as React.CSSProperties}>
        {isFloat ? fmt(display) : Math.round(display)}
      </div>
    </div>
  )
}

// ─── Project Modal ────────────────────────────────────────────────────────────

interface ProjectModalProps {
  project: Partial<Project> | null
  onSave: (data: Omit<Project, 'id' | 'createdAt'>) => void
  onClose: () => void
  projects: Project[]
}

function ProjectModal({ project, onSave, onClose, projects }: ProjectModalProps) {
  const [form, setForm] = useState<Omit<Project, 'id' | 'createdAt'>>({
    ...EMPTY_FORM,
    orderId: autoOrderId(projects),
    assignDate: new Date().toISOString().split('T')[0],
    ...project,
  })

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientName.trim()) return alert('Client name is required')
    if (!form.deadlineDate) return alert('Deadline date is required')
    onSave(form)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{project?.id ? '✏ Edit Project' : '✦ New Project'}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Order ID</label>
                <input className="game-input" value={form.orderId} onChange={e => set('orderId', e.target.value)} placeholder="ORD-1001" />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="game-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="wip">Work in Progress</option>
                  <option value="complete">Complete</option>
                  <option value="cancel">Cancel</option>
                </select>
              </div>
              <div className="form-group">
                <label>Client Name *</label>
                <input className="game-input" value={form.clientName} onChange={e => set('clientName', e.target.value)} placeholder="Acme Corp" required />
              </div>
              <div className="form-group">
                <label>Profile Name</label>
                <input className="game-input" value={form.profileName} onChange={e => set('profileName', e.target.value)} placeholder="Profile #1" />
              </div>
              <div className="form-group form-full">
                <label>Doc / Sheet Link</label>
                <input className="game-input" type="url" value={form.docLink} onChange={e => set('docLink', e.target.value)} placeholder="https://docs.google.com/..." />
              </div>
              <div className="form-group">
                <label>Assign Date</label>
                <input className="game-input" type="date" value={form.assignDate} onChange={e => set('assignDate', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Deadline Date *</label>
                <input className="game-input" type="date" value={form.deadlineDate} onChange={e => set('deadlineDate', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Gross Value ($)</label>
                <input className="game-input" type="number" min="0" step="0.01" value={form.grossValue} onChange={e => set('grossValue', parseFloat(e.target.value) || 0)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input className="game-input" value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Web Design" />
              </div>
              <div className="form-group">
                <label>Star Rating</label>
                <div className="star-rating" style={{ paddingTop: 6 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <span key={s} className={`star${form.stars >= s ? ' active' : ''}`} onClick={() => set('stars', form.stars === s ? 0 : s)}>★</span>
                  ))}
                </div>
              </div>
              {form.status === 'cancel' && (
                <div className="form-group form-full">
                  <label>Cancel Remarks</label>
                  <input className="game-input" value={form.cancelRemarks} onChange={e => set('cancelRemarks', e.target.value)} placeholder="Reason for cancellation..." />
                </div>
              )}
              <div className="form-group form-full">
                <label>Notes</label>
                <textarea className="game-input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Project notes..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-neutral" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-ripple">
              {project?.id ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Notes Panel ─────────────────────────────────────────────────────────────

function NotesPanel({ project, onSave, onClose }: { project: Project; onSave: (notes: string) => void; onClose: () => void }) {
  const [text, setText] = useState(project.notes)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="notes-panel-overlay" onClick={onClose} />
      <div className="notes-panel">
        <div className="notes-panel-header">
          <div className="notes-panel-title">📝 Notes — {project.clientName}</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <textarea
          className="notes-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write notes for this project..."
          autoFocus
        />
        <div className="notes-panel-footer">
          <button className="btn btn-neutral btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-success btn-sm btn-ripple" onClick={() => { onSave(text); onClose() }}>Save Notes</button>
        </div>
      </div>
    </>
  )
}

// ─── Delete Confirm ──────────────────────────────────────────────────────────

function DeleteConfirm({ project, onConfirm, onClose }: { project: Project; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-body" style={{ textAlign: 'center', padding: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗑</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Project?</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
            Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{project.clientName}</strong>? This cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-neutral" onClick={onClose}>Cancel</button>
            <button className="btn btn-danger btn-ripple" onClick={onConfirm}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Cancel Remarks Modal ─────────────────────────────────────────────────────

function CancelRemarksModal({ onSave, onClose }: { onSave: (remarks: string) => void; onClose: () => void }) {
  const [remarks, setRemarks] = useState('')
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <span className="modal-title" style={{ color: 'var(--neon-red)' }}>🚫 Cancel Project</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Cancel Remarks</label>
            <textarea className="game-input" rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Reason for cancellation..." autoFocus style={{ resize: 'vertical' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-neutral" onClick={onClose}>Skip</button>
          <button className="btn btn-danger btn-ripple" onClick={() => onSave(remarks)}>Confirm Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Restore Modal ────────────────────────────────────────────────────────────

function RestoreModal({ project, onRestore, onClose }: { project: Project; onRestore: (s: 'wip' | 'complete') => void; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <span className="modal-title" style={{ color: 'var(--neon-green)' }}>↩ Restore Project</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Restore <strong style={{ color: 'var(--text-primary)' }}>{project.clientName}</strong> as:
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary btn-ripple" onClick={() => onRestore('wip')}>Work in Progress</button>
            <button className="btn btn-success btn-ripple" onClick={() => onRestore('complete')}>Complete</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Project Row ──────────────────────────────────────────────────────────────

interface RowProps {
  project: Project
  onEdit: () => void
  onDelete: () => void
  onStatusCycle: () => void
  onStarChange: (s: number) => void
  onNotes: () => void
  onOrderIdChange: (v: string) => void
  onRestore: () => void
  stampId: string | null
}

function ProjectRow({ project: p, onEdit, onDelete, onStatusCycle, onStarChange, onNotes, onOrderIdChange, onRestore, stampId }: RowProps) {
  const [editingId, setEditingId] = useState(false)
  const [idVal, setIdVal] = useState(p.orderId)
  const days = p.deadlineDate ? daysLeft(p.deadlineDate) : null
  const dlClass = days !== null ? deadlineClass(days) : ''
  const net = p.grossValue * 0.8
  const deduct = p.grossValue * 0.2
  const isStamping = stampId === p.id

  function commitId() {
    setEditingId(false)
    if (idVal.trim() !== p.orderId) onOrderIdChange(idVal.trim())
  }

  return (
    <tr className={`project-row${p.status === 'cancel' ? ' cancelled-row' : ''}${isStamping ? ' stamp-active' : ''}`} style={{ position: 'relative' }}>
      {isStamping && <div className="stamp-overlay stamping">CANCELLED</div>}
      <td className="order-id-cell">
        {editingId ? (
          <input className="order-id-input" value={idVal} onChange={e => setIdVal(e.target.value)}
            onBlur={commitId} onKeyDown={e => { if (e.key === 'Enter') commitId(); if (e.key === 'Escape') { setEditingId(false); setIdVal(p.orderId) } }}
            autoFocus />
        ) : (
          <span className="order-id-display" onClick={() => { setEditingId(true); setIdVal(p.orderId) }} title="Click to edit">{p.orderId}</span>
        )}
      </td>
      <td>
        <div style={{ fontWeight: 600, fontSize: 12 }}>{p.clientName}</div>
        {p.profileName && <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{p.profileName}</div>}
      </td>
      <td>
        {p.docLink ? <a href={p.docLink} target="_blank" rel="noopener noreferrer" className="doc-link">🔗 View</a>
          : <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>}
      </td>
      <td>
        <span className={`status-badge status-${p.status}`} onClick={onStatusCycle} title="Click to cycle status">
          {p.status === 'wip' ? '● WIP' : p.status === 'complete' ? '✓ Done' : '✕ Cancel'}
        </span>
        {p.status === 'cancel' && (
          <div style={{ marginTop: 3 }}>
            <button className="restore-btn" onClick={onRestore}>↩ Restore</button>
          </div>
        )}
      </td>
      <td>
        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{p.assignDate || '—'}</div>
        <div style={{ fontSize: 11, fontWeight: 500 }}>{p.deadlineDate || '—'}</div>
      </td>
      <td>
        {days !== null && p.deadlineDate ? (
          <div className={`deadline-cell ${dlClass}`}>
            <div className="deadline-text">{deadlineLabel(days)}</div>
            <div className="deadline-bar-wrap">
              <div className="deadline-bar" style={{ width: days > 0 ? `${Math.min(100, (days / 30) * 100)}%` : '100%' }} />
            </div>
          </div>
        ) : <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>}
      </td>
      <td>
        <div className="value-cell">
          <span className="val-gross">{fmt(p.grossValue)}</span>
          <span className="val-deduct">−{fmt(deduct)}</span>
          <span className="val-net">{fmt(net)}</span>
        </div>
      </td>
      <td style={{ maxWidth: 100 }}>
        <div style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>{p.category || '—'}</div>
      </td>
      <td>
        <div className="star-rating">
          {[1,2,3,4,5].map(s => (
            <span key={s} className={`star${p.stars >= s ? ' active' : ''}`} onClick={() => onStarChange(p.stars === s ? 0 : s)}>★</span>
          ))}
        </div>
      </td>
      <td>
        <button className="btn-icon" onClick={onNotes} title="Notes">
          📝{p.notes && <span className="notes-dot" />}
        </button>
      </td>
      {p.status === 'cancel' && (
        <td><span className="cancel-remark-text" title={p.cancelRemarks}>{p.cancelRemarks || '—'}</span></td>
      )}
      {p.status !== 'cancel' && <td />}
      <td>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-icon" onClick={onEdit} title="Edit">✏</button>
          <button className="btn-icon" onClick={onDelete} title="Delete" style={{ color: 'var(--neon-red)' }}>🗑</button>
        </div>
      </td>
    </tr>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

type SortKey = keyof Project

interface Props {
  user: User
}

export function Dashboard({ user }: Props) {
  const { toast } = useToast()
  const [projects, setProjectsState] = useState<Project[]>(() => getProjects(user.id))
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterStars, setFilterStars] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [modalProject, setModalProject] = useState<Partial<Project> | null>(null)
  const [notesProject, setNotesProject] = useState<Project | null>(null)
  const [deleteProject, setDeleteProject] = useState<Project | null>(null)
  const [cancelProject, setCancelProject] = useState<Project | null>(null)
  const [restoreProject, setRestoreProject] = useState<Project | null>(null)
  const [stampId, setStampId] = useState<string | null>(null)

  function setProjects(ps: Project[]) {
    setProjectsState(ps)
    saveProjects(user.id, ps)
  }

  function addProject(data: Omit<Project, 'id' | 'createdAt'>) {
    const p: Project = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    setProjects([p, ...projects])
    setModalProject(null)
    toast('Project created!', 'success')
    if (p.status === 'complete') launchConfetti()
  }

  function editProject(data: Omit<Project, 'id' | 'createdAt'>) {
    if (!modalProject?.id) return
    const wasCancel = projects.find(p => p.id === modalProject.id)?.status === 'cancel'
    setProjects(projects.map(p => p.id === modalProject.id ? { ...p, ...data } : p))
    setModalProject(null)
    toast('Project updated!', 'info')
    if (data.status === 'complete' && !wasCancel) launchConfetti()
  }

  function cycleStatus(project: Project) {
    const next: Record<ProjectStatus, ProjectStatus> = { wip: 'complete', complete: 'cancel', cancel: 'wip' }
    const newStatus = next[project.status]
    if (newStatus === 'cancel') {
      setCancelProject(project)
    } else {
      applyStatus(project, newStatus, '')
    }
  }

  function applyStatus(project: Project, status: ProjectStatus, cancelRemarks: string) {
    setProjects(projects.map(p => p.id === project.id ? { ...p, status, cancelRemarks } : p))
    setCancelProject(null)
    if (status === 'complete') {
      toast('Project completed! 🎉', 'success')
      launchConfetti()
    } else if (status === 'cancel') {
      setStampId(project.id)
      setTimeout(() => setStampId(null), 1500)
      toast('Project cancelled', 'warning')
    }
  }

  function restoreProjectFn(project: Project, status: 'wip' | 'complete') {
    setProjects(projects.map(p => p.id === project.id ? { ...p, status, cancelRemarks: '' } : p))
    setRestoreProject(null)
    toast(`Project restored as ${status === 'wip' ? 'WIP' : 'Complete'}`, 'success')
    if (status === 'complete') launchConfetti()
  }

  function deleteProject_(project: Project) {
    setProjects(projects.filter(p => p.id !== project.id))
    setDeleteProject(null)
    toast('Project deleted', 'error')
  }

  function updateNotes(id: string, notes: string) {
    setProjects(projects.map(p => p.id === id ? { ...p, notes } : p))
    toast('Notes saved', 'success')
  }

  function updateStars(id: string, stars: number) {
    setProjects(projects.map(p => p.id === id ? { ...p, stars } : p))
  }

  function updateOrderId(id: string, orderId: string) {
    setProjects(projects.map(p => p.id === id ? { ...p, orderId } : p))
  }

  function sort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function exportCSV() {
    const headers = ['Order ID', 'Client', 'Profile', 'Doc Link', 'Status', 'Assign Date', 'Deadline', 'Gross', 'Deduction', 'Net', 'Category', 'Stars', 'Notes', 'Cancel Remarks']
    const rows = projects.map(p => [
      p.orderId, p.clientName, p.profileName, p.docLink, p.status,
      p.assignDate, p.deadlineDate, p.grossValue, p.grossValue * 0.2, p.grossValue * 0.8,
      p.category, p.stars, p.notes.replace(/\n/g, ' '), p.cancelRemarks,
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'projects.csv'; a.click()
    toast('CSV exported!', 'success')
  }

  // filter + sort
  const categories = [...new Set(projects.map(p => p.category).filter(Boolean))]
  const months = [...new Set(projects.map(p => p.deadlineDate?.slice(0, 7)).filter(Boolean))].sort().reverse()

  const filtered = projects
    .filter(p => {
      if (search) {
        const s = search.toLowerCase()
        if (![p.clientName, p.orderId, p.category, p.profileName].some(v => v?.toLowerCase().includes(s))) return false
      }
      if (filterStatus && p.status !== filterStatus) return false
      if (filterCategory && p.category !== filterCategory) return false
      if (filterMonth && !p.deadlineDate?.startsWith(filterMonth)) return false
      if (filterStars === 'top' && p.stars < 4) return false
      return true
    })
    .sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })

  const active = projects.filter(p => p.status !== 'cancel')
  const completed = projects.filter(p => p.status === 'complete')
  const cancelled = projects.filter(p => p.status === 'cancel')
  const wip = projects.filter(p => p.status === 'wip')
  const grossActive = active.reduce((s, p) => s + p.grossValue, 0)
  const cancelledValue = cancelled.reduce((s, p) => s + p.grossValue, 0)
  const netActive = grossActive * 0.8
  const deductActive = grossActive * 0.2
  const monthlyNet = filtered
    .filter(p => p.status !== 'cancel' && (!filterMonth ? p.deadlineDate?.startsWith(new Date().toISOString().slice(0, 7)) : true))
    .reduce((s, p) => s + p.grossValue * 0.8, 0)

  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th className={sortKey === k ? 'sorted' : ''} onClick={() => sort(k)}>
      {children} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div style={{ flex: 1 }}>
      {/* Stats */}
      <div className="stats-grid">
        <StatCard label="Total Projects" value={projects.length} color="var(--text-primary)" accent="var(--neon-blue)" icon="📊" />
        <StatCard label="In Progress" value={wip.length} color="var(--neon-blue)" accent="var(--neon-blue)" icon="⚡" />
        <StatCard label="Completed" value={completed.length} color="var(--neon-green)" accent="var(--neon-green)" icon="✓" />
        <StatCard label="Cancelled" value={cancelled.length} color="var(--neon-red)" accent="var(--neon-red)" icon="✕" />
        <StatCard label="Gross Value" value={grossActive} color="var(--text-primary)" accent="var(--neon-purple)" icon="💰" prefix="$" />
        <StatCard label="Deduction (20%)" value={deductActive} color="var(--neon-red)" accent="var(--neon-red)" icon="📉" prefix="$" />
        <StatCard label="Net Value (80%)" value={netActive} color="var(--neon-green)" accent="var(--neon-green)" icon="💎" prefix="$" />
        <StatCard label="Monthly Revenue" value={monthlyNet} color="var(--neon-blue)" accent="var(--neon-blue)" icon="📅" prefix="$" />
        <StatCard label="Cancelled Value" value={cancelledValue} color="var(--neon-red)" accent="var(--neon-red)" icon="🚫" prefix="$" />
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-input" placeholder="Search client, order, category..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="wip">WIP</option>
          <option value="complete">Complete</option>
          <option value="cancel">Cancel</option>
        </select>
        <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="">All Months</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="filter-select" value={filterStars} onChange={e => setFilterStars(e.target.value)}>
          <option value="">All Ratings</option>
          <option value="top">⭐ Top Rated (4-5)</option>
        </select>
        <button className="btn btn-neutral btn-sm" onClick={() => { setSearch(''); setFilterStatus(''); setFilterCategory(''); setFilterMonth(''); setFilterStars('') }}>
          ✕ Clear
        </button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-header-bar">
          <div>
            <span className="table-title">Projects</span>
            <span className="table-count">{filtered.length} of {projects.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-neutral btn-sm" onClick={exportCSV}>⬇ Export CSV</button>
            <button className="btn btn-primary btn-sm btn-ripple" onClick={() => setModalProject({})}>+ Add Project</button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-text">{projects.length === 0 ? 'No projects yet' : 'No results match your filters'}</div>
            <div className="empty-sub">{projects.length === 0 ? 'Click "Add Project" to get started' : 'Try adjusting your search or filters'}</div>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="project-table">
              <thead>
                <tr>
                  <Th k="orderId">Order ID</Th>
                  <Th k="clientName">Client</Th>
                  <th>Doc</th>
                  <Th k="status">Status</Th>
                  <Th k="assignDate">Dates</Th>
                  <Th k="deadlineDate">Deadline</Th>
                  <Th k="grossValue">Value</Th>
                  <Th k="category">Category</Th>
                  <Th k="stars">Stars</Th>
                  <th>Notes</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <ProjectRow
                    key={p.id}
                    project={p}
                    stampId={stampId}
                    onEdit={() => setModalProject(p)}
                    onDelete={() => setDeleteProject(p)}
                    onStatusCycle={() => cycleStatus(p)}
                    onStarChange={s => updateStars(p.id, s)}
                    onNotes={() => setNotesProject(p)}
                    onOrderIdChange={v => updateOrderId(p.id, v)}
                    onRestore={() => setRestoreProject(p)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalProject !== null && (
        <ProjectModal
          project={modalProject}
          projects={projects}
          onSave={modalProject.id ? editProject : addProject}
          onClose={() => setModalProject(null)}
        />
      )}
      {notesProject && (
        <NotesPanel
          project={notesProject}
          onSave={notes => updateNotes(notesProject.id, notes)}
          onClose={() => setNotesProject(null)}
        />
      )}
      {deleteProject && (
        <DeleteConfirm
          project={deleteProject}
          onConfirm={() => deleteProject_(deleteProject)}
          onClose={() => setDeleteProject(null)}
        />
      )}
      {cancelProject && (
        <CancelRemarksModal
          onSave={remarks => applyStatus(cancelProject, 'cancel', remarks)}
          onClose={() => { setCancelProject(null) }}
        />
      )}
      {restoreProject && (
        <RestoreModal
          project={restoreProject}
          onRestore={s => restoreProjectFn(restoreProject, s)}
          onClose={() => setRestoreProject(null)}
        />
      )}
    </div>
  )
}
