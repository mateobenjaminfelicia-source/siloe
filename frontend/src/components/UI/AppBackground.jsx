// ================================================
//  SILOÉ — AppBackground
//  Fondo compartido de todos los apartados.
//  Canvas fijo detrás de todo el contenido con:
//    - Triángulos celestes flotando (llenos y wireframe)
//      de distintos tamaños, velocidades y opacidades
//    - Unos y ceros solo en los bordes, muy tenues
//  Se renderiza una sola vez en App.jsx.
//  No aparece en el Home (que tiene su propio canvas).
// ================================================

import { useEffect, useRef } from 'react'
import { useLocation }        from 'react-router-dom'

export default function AppBackground() {
  const canvasRef = useRef(null)
  const location  = useLocation()

  // No mostrar en el Home — tiene su propio fondo
  if (location.pathname === '/') return null

  return <BackgroundCanvas />
}

function BackgroundCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    // ── Paleta celeste ──
    const CELESTE = [
      'rgba(100, 210, 255,',   // celeste brillante
      'rgba(80,  190, 240,',   // celeste medio
      'rgba(60,  160, 220,',   // celeste oscuro
      'rgba(140, 230, 255,',   // celeste claro
    ]

    // ── Triángulos flotantes ──
    let triangles = []

    function randomTriangle() {
      const size    = 8  + Math.random() * 42        // 8-50px
      const speed   = 0.08 + Math.random() * 0.18    // velocidad de deriva
      const rotSpeed= (Math.random() - 0.5) * 0.012  // velocidad de rotación
      const opacity = 0.04 + Math.random() * 0.14    // 4-18% opacidad
      const filled  = Math.random() > 0.45            // 55% llenos, 45% wireframe
      const color   = CELESTE[Math.floor(Math.random() * CELESTE.length)]
      const angle   = Math.random() * Math.PI * 2

      return {
        x:        Math.random() * canvas.width,
        y:        Math.random() * canvas.height,
        size,
        rot:      Math.random() * Math.PI * 2,
        rotSpeed,
        vx:       Math.cos(angle) * speed,
        vy:       Math.sin(angle) * speed,
        opacity,
        filled,
        color,
        // Movimiento senoidal para flotado orgánico
        phase:    Math.random() * Math.PI * 2,
        phaseSpeed: 0.004 + Math.random() * 0.008,
        amplitude:  0.5   + Math.random() * 1.5,
      }
    }

    function initParticles() {
      // Densidad: 1 triángulo cada ~18000px² de pantalla
      const count = Math.floor((canvas.width * canvas.height) / 18000)
      triangles = Array.from({ length: Math.max(12, Math.min(count, 35)) }, randomTriangle)
    }

    // ── Celdas de unos y ceros (solo bordes) ──
    const FS   = 12
    const EDGE = 90  // px de borde donde aparecen los números
    let cells  = []

    function initCells() {
      const cols = Math.ceil(canvas.width  / FS)
      const rows = Math.ceil(canvas.height / FS)
      cells = []
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = c * FS, y = r * FS
          // Solo en los 4 bordes
          const inEdge = x < EDGE || x > canvas.width-EDGE
                      || y < EDGE || y > canvas.height-EDGE
          if (inEdge) {
            cells.push({
              x, y,
              char:  Math.random() > 0.5 ? '1' : '0',
              speed: 0.15 + Math.random() * 0.35,
              phase: Math.random() * Math.PI * 2,
            })
          }
        }
      }
    }

    resize()
    initCells()
    window.addEventListener('resize', resize)

    let tick = 0

    function draw() {
      tick++

      // Fondo base — negro profundo con tinte morado muy sutil
      ctx.fillStyle = 'rgba(4, 1, 14, 0.92)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // ── Triángulos ──
      triangles.forEach(t => {
        // Actualizar posición
        t.phase += t.phaseSpeed
        t.rot   += t.rotSpeed
        t.x     += t.vx + Math.sin(t.phase) * t.amplitude * 0.08
        t.y     += t.vy + Math.cos(t.phase) * t.amplitude * 0.08

        // Rebote suave en los bordes (wrap con margen)
        const margin = t.size * 2
        if (t.x < -margin)              t.x = canvas.width  + margin
        if (t.x > canvas.width  + margin) t.x = -margin
        if (t.y < -margin)              t.y = canvas.height + margin
        if (t.y > canvas.height + margin) t.y = -margin

        // Pulso de opacidad muy sutil
        const pulseOpacity = t.opacity * (0.7 + 0.3 * Math.sin(t.phase * 1.3))

        ctx.save()
        ctx.translate(t.x, t.y)
        ctx.rotate(t.rot)

        // Dibujar triángulo equilátero
        const h = t.size * Math.sqrt(3) / 2
        ctx.beginPath()
        ctx.moveTo(0,           -t.size * 0.6)
        ctx.lineTo( t.size / 2,  h * 0.4)
        ctx.lineTo(-t.size / 2,  h * 0.4)
        ctx.closePath()

        if (t.filled) {
          ctx.fillStyle = `${t.color}${pulseOpacity})`
          ctx.fill()
        } else {
          // Wireframe — solo borde
          ctx.strokeStyle = `${t.color}${Math.min(pulseOpacity * 2.5, 0.4)})`
          ctx.lineWidth   = 0.8
          ctx.stroke()
          // Borde con micro-brillo
          ctx.strokeStyle = `${t.color}${pulseOpacity * 0.5})`
          ctx.lineWidth   = 3
          ctx.filter      = 'blur(2px)'
          ctx.stroke()
          ctx.filter      = 'none'
        }

        ctx.restore()
      })

      // ── Unos y ceros en los bordes ──
      ctx.font = `${FS}px monospace`
      cells.forEach(cell => {
        // Brillo pulsante muy tenue
        const brightness = 0.018 + 0.012 * Math.sin(tick * cell.speed * 0.04 + cell.phase)
        ctx.fillStyle = `rgba(60, 40, 120, ${brightness})`
        ctx.fillText(cell.char, cell.x, cell.y + FS)
        // Cambiar carácter raramente
        if (Math.random() < 0.0008) cell.char = Math.random() > 0.5 ? '1' : '0'
      })

      // ── Gradiente radial central — zona oscura más limpia para el contenido ──
      const grad = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, canvas.height * 0.15,
        canvas.width/2, canvas.height/2, canvas.height * 0.75,
      )
      grad.addColorStop(0, 'rgba(4, 1, 14, 0)')     // transparente al centro
      grad.addColorStop(1, 'rgba(4, 1, 14, 0.35)')  // levemente más oscuro en bordes
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        0,
        pointerEvents: 'none',
      }}
    />
  )
}
