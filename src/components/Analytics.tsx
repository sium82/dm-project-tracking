import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { getProjects } from '@/lib/storage'
import type { User } from '@/types'

Chart.register(...registerables)

const NEON = {
  blue: '#00d4ff',
  purple: '#8b5cf6',
  green: '#00ff88',
  red: '#ff3355',
  orange: '#ff8c00',
  yellow: '#ffd700',
}

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 900, easing: 'easeOutQuart' as const },
  plugins: {
    legend: {
      labels: {
        color: '#94a3b8',
        font: { family: 'Lexend', size: 11 },
        boxWidth: 12,
      },
    },
    tooltip: {
      backgroundColor: '#0a1225',
      borderColor: 'rgba(0,212,255,0.2)',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
      titleFont: { family: 'Lexend', size: 12, weight: 700 },
      bodyFont: { family: 'Lexend', size: 11 },
    },
  },
  scales: {
    x: {
      ticks: { color: '#475569', font: { family: 'Lexend', size: 10 } },
      grid: { color: 'rgba(0,212,255,0.04)' },
      border: { color: 'rgba(0,212,255,0.08)' },
    },
    y: {
      ticks: { color: '#475569', font: { family: 'Lexend', size: 10 } },
      grid: { color: 'rgba(0,212,255,0.04)' },
      border: { color: 'rgba(0,212,255,0.08)' },
    },
  },
} as const

function useChart(
  deps: unknown[],
  build: (canvas: HTMLCanvasElement) => Chart
) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const chart = build(ref.current)
    return () => chart.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

interface Props { user: User }

export function Analytics({ user }: Props) {
  const projects = getProjects(user.id)
  const [revenueYear, setRevenueYear] = useState(new Date().getFullYear())
  const [countYear, setCountYear] = useState(new Date().getFullYear())

  const years = [...new Set(projects.map(p => p.deadlineDate?.slice(0, 4)).filter(Boolean).map(Number))].sort().reverse()
  if (!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear())

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Monthly Revenue chart
  const revenueRef = useChart([revenueYear, projects.length], (canvas) => {
    const data = months.map((_, i) => {
      const m = `${revenueYear}-${String(i + 1).padStart(2, '0')}`
      return projects
        .filter(p => p.status !== 'cancel' && p.deadlineDate?.startsWith(m))
        .reduce((s, p) => s + p.grossValue * 0.8, 0)
    })
    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Net Revenue ($)',
          data,
          borderColor: NEON.blue,
          backgroundColor: 'rgba(0,212,255,0.08)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: NEON.blue,
          pointBorderColor: '#0a1225',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }],
      },
      options: {
        ...BASE_OPTIONS,
        plugins: {
          ...BASE_OPTIONS.plugins,
          tooltip: {
            ...BASE_OPTIONS.plugins.tooltip,
            callbacks: { label: (ctx) => ` $${Number(ctx.raw).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
          },
        },
      },
    })
  })

  // Cancellation Analysis (bar chart by month)
  const cancelRef = useChart([projects.length], (canvas) => {
    const activeData = months.map((_, i) => {
      const m = `-${String(i + 1).padStart(2, '0')}-`
      return projects.filter(p => p.status !== 'cancel' && p.deadlineDate?.includes(m)).length
    })
    const cancelData = months.map((_, i) => {
      const m = `-${String(i + 1).padStart(2, '0')}-`
      return projects.filter(p => p.status === 'cancel' && p.deadlineDate?.includes(m)).length
    })
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: 'Active', data: activeData, backgroundColor: 'rgba(0,212,255,0.6)', borderColor: NEON.blue, borderWidth: 1, borderRadius: 4 },
          { label: 'Cancelled', data: cancelData, backgroundColor: 'rgba(255,51,85,0.6)', borderColor: NEON.red, borderWidth: 1, borderRadius: 4 },
        ],
      },
      options: { ...BASE_OPTIONS },
    })
  })

  // Status Breakdown (doughnut)
  const statusRef = useChart([projects.length], (canvas) => {
    const wip = projects.filter(p => p.status === 'wip').length
    const done = projects.filter(p => p.status === 'complete').length
    const cancel = projects.filter(p => p.status === 'cancel').length
    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['WIP', 'Complete', 'Cancelled'],
        datasets: [{
          data: [wip, done, cancel],
          backgroundColor: ['rgba(0,212,255,0.7)', 'rgba(0,255,136,0.7)', 'rgba(255,51,85,0.7)'],
          borderColor: ['#00d4ff', '#00ff88', '#ff3355'],
          borderWidth: 1,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: { legend: BASE_OPTIONS.plugins.legend, tooltip: BASE_OPTIONS.plugins.tooltip },
        cutout: '65%',
      },
    })
  })

  // Category breakdown (horizontal bar)
  const catRef = useChart([projects.length], (canvas) => {
    const catMap: Record<string, number> = {}
    projects.forEach(p => {
      const c = p.category || 'Uncategorized'
      catMap[c] = (catMap[c] || 0) + 1
    })
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(([k]) => k),
        datasets: [{
          label: 'Projects',
          data: sorted.map(([, v]) => v),
          backgroundColor: 'rgba(139,92,246,0.6)',
          borderColor: NEON.purple,
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        ...BASE_OPTIONS,
        indexAxis: 'y' as const,
      },
    })
  })

  // Monthly Project Count
  const countRef = useChart([countYear, projects.length], (canvas) => {
    const data = months.map((_, i) => {
      const m = `${countYear}-${String(i + 1).padStart(2, '0')}`
      return projects.filter(p => p.deadlineDate?.startsWith(m)).length
    })
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Projects',
          data,
          backgroundColor: months.map((_, i) => `hsla(${(i / 12) * 60 + 180}, 80%, 55%, 0.6)`),
          borderColor: months.map((_, i) => `hsla(${(i / 12) * 60 + 180}, 80%, 65%, 1)`),
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: { ...BASE_OPTIONS },
    })
  })

  // Star distribution (radar or bar)
  const starRef = useChart([projects.length], (canvas) => {
    const dist = [0, 1, 2, 3, 4, 5].map(s => projects.filter(p => p.stars === s).length)
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['0 ★', '1 ★', '2 ★', '3 ★', '4 ★', '5 ★'],
        datasets: [{
          label: 'Projects',
          data: dist,
          backgroundColor: ['rgba(71,85,105,0.6)', 'rgba(255,140,0,0.4)', 'rgba(255,140,0,0.5)', 'rgba(255,215,0,0.5)', 'rgba(255,215,0,0.65)', 'rgba(255,215,0,0.8)'],
          borderColor: ['#475569', NEON.orange, NEON.orange, NEON.yellow, NEON.yellow, NEON.yellow],
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: { ...BASE_OPTIONS },
    })
  })

  const totalRevenue = projects.filter(p => p.status !== 'cancel').reduce((s, p) => s + p.grossValue * 0.8, 0)
  const avgValue = projects.length ? projects.reduce((s, p) => s + p.grossValue, 0) / projects.length : 0
  const cancelRate = projects.length ? (projects.filter(p => p.status === 'cancel').length / projects.length * 100) : 0

  return (
    <div className="analytics-page">
      <div className="analytics-title">Analytics &amp; Reports</div>
      <div className="analytics-sub">Real-time insights from your project data</div>
      <div className="timeline-bar" />

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Revenue', val: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: 'var(--neon-green)' },
          { label: 'Avg Project Value', val: `$${avgValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: 'var(--neon-blue)' },
          { label: 'Cancel Rate', val: `${cancelRate.toFixed(1)}%`, color: 'var(--neon-red)' },
          { label: 'Total Projects', val: String(projects.length), color: 'var(--text-primary)' },
        ].map(item => (
          <div key={item.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
            borderRadius: 8, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{item.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.val}</div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        {/* Monthly Revenue */}
        <div className="chart-card chart-full">
          <div className="chart-card-header">
            <div className="chart-card-title">📈 Monthly Revenue</div>
            <select className="chart-filter" value={revenueYear} onChange={e => setRevenueYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="chart-wrap">
            <canvas ref={revenueRef} />
          </div>
        </div>

        {/* Cancellation Analysis */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">🚫 Cancellation Analysis</div>
          </div>
          <div className="chart-wrap">
            <canvas ref={cancelRef} />
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">🎯 Status Breakdown</div>
          </div>
          <div className="chart-wrap">
            <canvas ref={statusRef} />
          </div>
        </div>

        {/* Monthly Project Count */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">📅 Monthly Project Count</div>
            <select className="chart-filter" value={countYear} onChange={e => setCountYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="chart-wrap">
            <canvas ref={countRef} />
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">🏷 Category Breakdown</div>
          </div>
          <div className="chart-wrap">
            <canvas ref={catRef} />
          </div>
        </div>

        {/* Star Distribution */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">⭐ Star Rating Distribution</div>
          </div>
          <div className="chart-wrap">
            <canvas ref={starRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
