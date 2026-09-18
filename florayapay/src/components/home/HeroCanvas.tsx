'use client'

import { useEffect, useRef } from 'react'

function rnd(a: number, b: number) { return a + Math.random() * (b - a) }

type Petal = { x: number; y: number; vx: number; vy: number; angle: number; spin: number; size: number; alpha: number; color: string }

export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf: number

    const colors = ['#C8899A','#D4A0B0','#E8C4CC','#B87090','#FFDDE6','#D0A890']

    function resize() {
      const W = el!.offsetWidth
      const H = el!.offsetHeight
      const dpr = devicePixelRatio
      el!.width = W * dpr
      el!.height = H * dpr
    }
    resize()

    const petals: Petal[] = Array.from({ length: 40 }, () => ({
      x: rnd(0, el.offsetWidth),
      y: rnd(-el.offsetHeight, el.offsetHeight),
      vx: rnd(-0.5, 0.5),
      vy: rnd(0.5, 1.6),
      angle: rnd(0, Math.PI * 2),
      spin: rnd(-0.02, 0.02),
      size: rnd(3, 9),
      alpha: rnd(0.25, 0.65),
      color: colors[Math.floor(rnd(0, colors.length))],
    }))

    const t0 = performance.now()

    function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, len: number, w: number, color: string, alpha: number) {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(x, y)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(w * 0.6, -len * 0.25, w * 0.8, -len * 0.6, 0, -len)
      ctx.bezierCurveTo(-w * 0.8, -len * 0.6, -w * 0.6, -len * 0.25, 0, 0)
      ctx.fillStyle = color
      ctx.fill()
      ctx.restore()
    }

    function drawBranch(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, len: number, depth: number) {
      if (depth === 0 || len < 6) return
      const x2 = x + Math.cos(angle) * len
      const y2 = y + Math.sin(angle) * len
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = '#1A3020'
      ctx.lineWidth = depth * 0.7
      ctx.lineCap = 'round'
      ctx.stroke()
      if (depth <= 3) {
        const lc = ['#2D5E38','#3A7A48','#4A9A5C','#1E4528','#537D5A']
        drawLeaf(ctx, x2, y2, angle - 0.3, len * 0.6, len * 0.25, lc[Math.floor(rnd(0, lc.length))], 0.7)
        drawLeaf(ctx, x2, y2, angle + 0.3, len * 0.5, len * 0.22, lc[Math.floor(rnd(0, lc.length))], 0.6)
      }
      drawBranch(ctx, x2, y2, angle - 0.3 + rnd(-0.1, 0.1), len * 0.68, depth - 1)
      drawBranch(ctx, x2, y2, angle + 0.35 + rnd(-0.1, 0.1), len * 0.62, depth - 1)
    }

    // pre-render static bg
    const off = document.createElement('canvas')
    off.width = el.width; off.height = el.height
    const bc = off.getContext('2d')!
    const dpr = devicePixelRatio
    bc.scale(dpr, dpr)
    const W = el.offsetWidth, H = el.offsetHeight

    const bg = bc.createRadialGradient(W * 0.5, H * 0.6, 0, W * 0.5, H * 0.5, W * 0.9)
    bg.addColorStop(0, '#243D2A')
    bg.addColorStop(0.4, '#112018')
    bg.addColorStop(1, '#060E08')
    bc.fillStyle = bg; bc.fillRect(0, 0, W, H)

    // trees
    drawBranch(bc, W * 0.87, 0, Math.PI / 2 + 0.15, H * 0.52, 7)
    drawBranch(bc, W * 0.97, H * 0.1, Math.PI / 2 + 0.3, H * 0.4, 6)
    drawBranch(bc, W * 0.07, 0, Math.PI / 2 - 0.2, H * 0.48, 6)
    drawBranch(bc, 0, H * 0.08, 0.15, H * 0.35, 5)

    // large corner leaves
    ;[[W * 0.03, H, Math.PI * 1.72, 140, 52], [W * 0.95, H * 0.85, Math.PI * 1.3, 120, 46]].forEach(([x, y, a, l, w]) => {
      drawLeaf(bc, x, y, a, l, w, '#1C3D25', 0.75)
      drawLeaf(bc, x - 8, y - 5, a + 0.1, l * 0.7, w * 0.7, '#2D5A36', 0.4)
    })

    // warm glow
    const glow = bc.createRadialGradient(W * 0.5, H * 0.7, 0, W * 0.5, H * 0.6, W * 0.35)
    glow.addColorStop(0, 'rgba(230,180,90,0.12)')
    glow.addColorStop(1, 'transparent')
    bc.fillStyle = glow; bc.fillRect(0, 0, W, H)

    function frame(now: number) {
      const ctx = el!.getContext('2d')!
      const t = (now - t0) * 0.001
      ctx.clearRect(0, 0, el!.width, el!.height)
      ctx.drawImage(off, 0, 0, W, H)

      // breathing light
      ctx.fillStyle = `rgba(180,220,160,${0.02 + 0.012 * Math.sin(t * 0.4)})`
      ctx.fillRect(0, 0, W, H)

      // petals
      petals.forEach(p => {
        p.x += p.vx + Math.sin(t * 0.6 + p.y * 0.01) * 0.3
        p.y += p.vy
        p.angle += p.spin
        if (p.y > H + 20) { p.y = -20; p.x = rnd(0, W) }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(t + p.x))
        ctx.beginPath()
        ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
        ctx.restore()
      })

      // swaying foreground leaves
      ctx.save()
      ctx.globalAlpha = 0.5 + 0.1 * Math.sin(t * 0.5)
      ctx.translate(Math.sin(t * 0.35) * 10, 0)
      drawLeaf(ctx, W * 0.02, H, Math.PI * 1.72 + Math.sin(t * 0.4) * 0.06, 145, 54, '#1C3D25', 0.7)
      drawLeaf(ctx, W * 0.96, H * 0.9, Math.PI * 1.32 + Math.sin(t * 0.45 + 1) * 0.07, 128, 50, '#1C3D25', 0.65)
      ctx.restore()

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const ro = new ResizeObserver(() => { resize(); off.width = el!.width; off.height = el!.height })
    ro.observe(el)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />
}
