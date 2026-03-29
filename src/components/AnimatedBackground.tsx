import { useEffect, useRef } from 'react'

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf: number

    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = []
    const rings: { x: number; y: number; r: number; max: number; o: number }[] = []

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.5 + 0.5,
        o: Math.random() * 0.4 + 0.05,
      })
    }

    const ringInterval = setInterval(() => {
      rings.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0,
        max: Math.random() * 180 + 80,
        o: 0.25,
      })
    }, 2500)

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x = (p.x + p.vx + canvas.width) % canvas.width
        p.y = (p.y + p.vy + canvas.height) % canvas.height
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,212,255,${p.o})`
        ctx.fill()
      })
      for (let i = rings.length - 1; i >= 0; i--) {
        const rg = rings[i]
        rg.r += 0.6
        rg.o = (1 - rg.r / rg.max) * 0.2
        if (rg.r >= rg.max) { rings.splice(i, 1); continue }
        ctx.beginPath()
        ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0,212,255,${rg.o})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(ringInterval)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="bg-layer">
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
      <div className="grid-bg" style={{ position: 'absolute', inset: 0 }} />
      <div className="ambient-glow" style={{ position: 'absolute', inset: 0 }} />
    </div>
  )
}
