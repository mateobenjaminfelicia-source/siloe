import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const HOLD_MS     = 250
const SHRINK_MS   = 1200
const GROW_MS     = 900
const MINI_SCALE  = 10
const NAV_TARGET_X = 95
const NAV_TARGET_Y = 32

export default function CrystalReveal() {
  const location  = useLocation()
  const canvasRef = useRef(null)
  const animRef   = useRef({
    active: false, stay: false, grow: false,
    color: '#7c5cfc', startTime: 0,
    rgb: { r:124, g:92, b:252 },
  })

  useLayoutEffect(() => {
    const stateColor = location.state?.color
    const saved = stateColor || sessionStorage.getItem('siloe_transition_color')

    // ── Reverse: mini crystal crece a fullscreen ──
    if (location.state?.reverseHome) {
      sessionStorage.removeItem('siloe_transition_color')
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      const hex = '#7c5cfc'.replace('#','')
      animRef.current = {
        active: true, stay: false, grow: true,
        color: '#7c5cfc',
        startTime: performance.now(),
        rgb: { r:124, g:92, b:252 },
      }
      return
    }

    if (!saved) return
    sessionStorage.removeItem('siloe_transition_color')

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    ctx.fillStyle = saved
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const hex = saved.replace('#','')
    animRef.current = {
      active: true, stay: false, grow: false,
      color: saved,
      startTime: performance.now(),
      rgb: {
        r: parseInt(hex.slice(0,2),16),
        g: parseInt(hex.slice(2,4),16),
        b: parseInt(hex.slice(4,6),16),
      },
    }
  }, [location.pathname, location.state])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const phi  = (1 + Math.sqrt(5)) / 2
    const norm = v => { const l = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]); return l>0?[v[0]/l,v[1]/l,v[2]/l]:v }
    const VERTS = [
      [-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],
      [0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],
      [phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1],
    ].map(v => norm(v))
    const FACES = [
      [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
      [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
      [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
      [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
    ]
    const rX = (v,a) => { const c=Math.cos(a),s=Math.sin(a); return [v[0],v[1]*c-v[2]*s,v[1]*s+v[2]*c] }
    const rY = (v,a) => { const c=Math.cos(a),s=Math.sin(a); return [v[0]*c+v[2]*s,v[1],-v[0]*s+v[2]*c] }

    let rotAngle = Math.PI * 0.15

    function project(CX, CY, v, sc) {
      const fov = 3.5, z = v[2]+fov, f = sc*fov/z
      return [CX + v[0]*f, CY + v[1]*f]
    }

    function drawCrystal(CX, CY, sc, rgb, maxScale) {
      if (sc <= 1) return
      const T  = VERTS.map(v => rY(rX(v, 0.3), rotAngle))
      const fd = FACES.map((f, i) => ({
        f, i, z: (T[f[0]][2]+T[f[1]][2]+T[f[2]][2]) / 3,
      })).sort((a, b) => a.z - b.z)

      fd.forEach(({ f, i }) => {
        const [p0,p1,p2] = f.map(vi => project(CX, CY, T[vi], sc))
        ctx.beginPath()
        ctx.moveTo(p0[0],p0[1]); ctx.lineTo(p1[0],p1[1]); ctx.lineTo(p2[0],p2[1])
        ctx.closePath()
        const t  = i / 20
        const cr = Math.min(255, Math.floor(rgb.r * (0.7 + t*0.5)))
        const cg = Math.min(255, Math.floor(rgb.g * (0.7 + t*0.5)))
        const cb = Math.min(255, Math.floor(rgb.b * (0.8 + t*0.4)))
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`
        ctx.fill()
        if (sc < maxScale * 0.3) {
          const a = Math.max(0, 0.25 * (1 - sc / (maxScale * 0.3)))
          ctx.strokeStyle = `rgba(255,255,255,${a})`
          ctx.lineWidth   = 0.8
          ctx.stroke()
        }
      })
    }

    let animId

    function draw(now) {
      const W = canvas.width, H = canvas.height
      const CX = W / 2, CY = H / 2
      const anim = animRef.current
      const maxScale = Math.hypot(W, H) * 1.4

      if (!anim.active) {
        if (anim.stay) {
          rotAngle += 0.008
          ctx.clearRect(0, 0, W, H)
          ctx.save()
          ctx.translate(NAV_TARGET_X - CX, NAV_TARGET_Y - CY)
          drawCrystal(CX, CY, MINI_SCALE, anim.rgb, maxScale)
          ctx.restore()
        } else {
          ctx.clearRect(0, 0, W, H)
        }
        animId = requestAnimationFrame(draw)
        return
      }

      rotAngle += 0.03
      const t = now - anim.startTime

      // ── GROW: mini crystal → fullscreen (reverse desde Navbar) ──
      if (anim.grow) {
        const progress = Math.min(t / GROW_MS, 1)
        const ease = progress * progress
        const scale = MINI_SCALE + (maxScale - MINI_SCALE) * ease
        const baseX = NAV_TARGET_X + (CX - NAV_TARGET_X) * ease
        const baseY = NAV_TARGET_Y + (CY - NAV_TARGET_Y) * ease
        const chaosAmp = 25 * (1 - ease)
        const offsetX = baseX
          + Math.sin(t * 0.0053 + 1.1) * chaosAmp
          + Math.sin(t * 0.0161 + 0.5) * chaosAmp * 0.5
          + Math.sin(t * 0.0031 + 2.7) * chaosAmp * 0.3
        const offsetY = baseY
          + Math.sin(t * 0.0079 + 0.7) * chaosAmp
          + Math.cos(t * 0.0127 + 2.9) * chaosAmp * 0.45
          + Math.sin(t * 0.0039 + 1.3) * chaosAmp * 0.25
        const bgAlpha  = Math.max(0, Math.min(1, (progress - 0.35) / 0.5))

        ctx.clearRect(0, 0, W, H)
        if (bgAlpha > 0) {
          ctx.fillStyle = anim.color
          ctx.globalAlpha = bgAlpha
          ctx.fillRect(0, 0, W, H)
          ctx.globalAlpha = 1
        }
        ctx.save()
        ctx.translate(offsetX - CX, offsetY - CY)
        drawCrystal(CX, CY, scale, anim.rgb, maxScale)
        ctx.restore()
        if (progress > 0.85) {
          const overlayAlpha = (progress - 0.85) / 0.15
          ctx.fillStyle = `rgba(${anim.rgb.r},${anim.rgb.g},${anim.rgb.b},${overlayAlpha})`
          ctx.fillRect(0, 0, W, H)
        }

        if (progress < 1) {
          animId = requestAnimationFrame(draw)
        } else {
          window.__siloeReverseReady = true
          anim.active = false
          anim.grow = false
          animId = requestAnimationFrame(draw)
        }
        return
      }

      // ── SHRINK: fullscreen → mini crystal en Navbar ──
      if (t < HOLD_MS) {
        ctx.fillStyle = anim.color
        ctx.fillRect(0, 0, W, H)
        drawCrystal(CX, CY, maxScale, anim.rgb, maxScale)
      } else if (t < HOLD_MS + SHRINK_MS) {
        const progress = Math.min((t - HOLD_MS) / SHRINK_MS, 1)
        const ease = 1 - Math.pow(1 - progress, 2)
        const scale = maxScale - (maxScale - MINI_SCALE) * ease
        const baseX = CX + (NAV_TARGET_X - CX) * ease
        const baseY = CY + (NAV_TARGET_Y - CY) * ease
        const chaosAmp = 28 * (1 - ease)
        const offsetX = baseX
          + Math.sin(t * 0.0051 + 1.3) * chaosAmp
          + Math.sin(t * 0.0173 + 0.7) * chaosAmp * 0.55
          + Math.sin(t * 0.0029 + 2.9) * chaosAmp * 0.3
        const offsetY = baseY
          + Math.sin(t * 0.0077 + 0.9) * chaosAmp
          + Math.cos(t * 0.0131 + 3.1) * chaosAmp * 0.45
          + Math.sin(t * 0.0037 + 1.5) * chaosAmp * 0.25
        const solidAlpha = Math.max(0, 1 - progress / 0.35)

        ctx.clearRect(0, 0, W, H)
        ctx.save()
        ctx.translate(offsetX - CX, offsetY - CY)
        drawCrystal(CX, CY, scale, anim.rgb, maxScale)
        ctx.restore()
        if (solidAlpha > 0) {
          ctx.fillStyle = `rgba(${anim.rgb.r},${anim.rgb.g},${anim.rgb.b},${solidAlpha})`
          ctx.fillRect(0, 0, W, H)
        }
      } else {
        anim.active = false
        anim.stay = true
        ctx.clearRect(0, 0, W, H)
        ctx.save()
        ctx.translate(NAV_TARGET_X - CX, NAV_TARGET_Y - CY)
        drawCrystal(CX, CY, MINI_SCALE, anim.rgb, maxScale)
        ctx.restore()
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        999,
        pointerEvents: 'none',
      }}
    />
  )
}
