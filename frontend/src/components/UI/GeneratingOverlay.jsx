// ================================================
//  SILOÉ — Componente: GeneratingOverlay
//  Pantalla de carga cinemática con el cristal 3D
//  girando (el mismo del Home) mientras la IA crea
//  la presentación.
//  Props:
//    mode: 'structure' | 'content' | "default"
// ================================================

import { useState, useEffect, useRef } from 'react'

const MESSAGES = {
  structure: [
    'Analizando tu idea...',
    'Diseñando la estructura...',
    'Organizando los slides...',
    'Afinando los detalles...',
  ],
  content: [
    'Creando el contenido...',
    'Escribiendo cada slide...',
    'Aplicando el diseño...',
    'Dando los últimos toques...',
  ],
  default: [
    'Generando tu presentación...',
  ],
}

export default function GeneratingOverlay({ mode = 'default' }) {
  const messages = MESSAGES[mode] || MESSAGES.default
  const [idx, setIdx] = useState(0)
  const canvasRef = useRef(null)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), 2400)
    return () => clearInterval(t)
  }, [messages.length])

  // ── Dibujar el cristal 3D (icosaedro) ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const CX = W / 2, CY = H / 2
    const SCALE = 78

    // Icosaedro
    const phi = (1 + Math.sqrt(5)) / 2
    const normalize = v => {
      const l = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])
      return l > 0 ? [v[0]/l, v[1]/l, v[2]/l] : v
    }
    const VERTS = [
      [-1, phi,0],[1, phi,0],[-1,-phi,0],[1,-phi,0],
      [0,-1, phi],[0, 1, phi],[0,-1,-phi],[0, 1,-phi],
      [phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1],
    ].map(v => normalize(v))

    const FACES = [
      [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
      [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
      [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
      [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
    ]

    const LIGHT = normalize([0.4, -0.7, 1.0])

    const rotX = (v, a) => {
      const c = Math.cos(a), s = Math.sin(a)
      return [v[0], v[1]*c - v[2]*s, v[1]*s + v[2]*c]
    }
    const rotY = (v, a) => {
      const c = Math.cos(a), s = Math.sin(a)
      return [v[0]*c + v[2]*s, v[1], -v[0]*s + v[2]*c]
    }
    const project = v => {
      const fov = 3.8
      const z   = v[2] + fov
      const f   = SCALE * fov / z
      return [CX + v[0]*f, CY + v[1]*f, v[2]]
    }
    const cross = (a, b) => [
      a[1]*b[2]-a[2]*b[1],
      a[2]*b[0]-a[0]*b[2],
      a[0]*b[1]-a[1]*b[0],
    ]
    const dot = (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
    const sub = (a, b) => [a[0]-b[0],a[1]-b[1],a[2]-b[2]]

    let animId
    let rotYAngle = 0
    let rotXAngle = 0.4

    function draw() {
      rotYAngle += 0.008
      rotXAngle += 0.0015

      ctx.clearRect(0, 0, W, H)

      // Transformar vértices
      const transformed = VERTS.map(v => rotY(rotX(v, rotXAngle), rotYAngle))
      const projected   = transformed.map(v => project(v))

      // Datos de cara
      const faceData = FACES.map(face => {
        const v0 = transformed[face[0]]
        const v1 = transformed[face[1]]
        const v2 = transformed[face[2]]
        const normal   = normalize(cross(sub(v1,v0), sub(v2,v0)))
        const backface = dot(normal, [0,0,-1]) > 0
        const diffuse  = Math.max(0, dot(normal, LIGHT))
        const avgZ     = (v0[2]+v1[2]+v2[2]) / 3
        return { face, normal, diffuse, avgZ, backface }
      })

      // Ordenar por Z (atrás → adelante)
      faceData.sort((a, b) => a.avgZ - b.avgZ)

      // PASO 1: caras rellenas
      faceData.forEach(({ face, diffuse, backface }) => {
        const [p0,p1,p2] = [projected[face[0]],projected[face[1]],projected[face[2]]]
        ctx.beginPath()
        ctx.moveTo(p0[0],p0[1])
        ctx.lineTo(p1[0],p1[1])
        ctx.lineTo(p2[0],p2[1])
        ctx.closePath()
        const alpha = backface ? 0.06 : 0.10 + diffuse * 0.22
        const r = Math.floor(70  + diffuse * 90)
        const g = Math.floor(40  + diffuse * 50)
        const b = Math.floor(160 + diffuse * 80)
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.fill()
        // Aristas
        const eAlpha = backface ? 0.12 : 0.45 + diffuse * 0.45
        ctx.strokeStyle = `rgba(${160+Math.floor(diffuse*80)},${120+Math.floor(diffuse*60)},255,${eAlpha})`
        ctx.lineWidth   = backface ? 0.5 : 1.3
        ctx.stroke()
      })

      // PASO 2: halo de aristas (blur)
      ctx.save()
      ctx.filter = 'blur(3px)'
      faceData.forEach(({ face, diffuse, backface }) => {
        if (backface || diffuse < 0.2) return
        const [p0,p1,p2] = [projected[face[0]],projected[face[1]],projected[face[2]]]
        ctx.beginPath()
        ctx.moveTo(p0[0],p0[1])
        ctx.lineTo(p1[0],p1[1])
        ctx.lineTo(p2[0],p2[1])
        ctx.closePath()
        ctx.strokeStyle = `rgba(180,140,255,${diffuse*0.35})`
        ctx.lineWidth   = 4
        ctx.stroke()
      })
      ctx.restore()

      // PASO 3: resplandor central
      const grd = ctx.createRadialGradient(CX,CY,0, CX,CY,SCALE*0.9)
      grd.addColorStop(0, 'rgba(160,100,255,0.18)')
      grd.addColorStop(1, 'rgba(80,40,180,0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(CX,CY,SCALE*0.9,0,Math.PI*2)
      ctx.fill()

      // PASO 4: texto "Siloé"
      ctx.save()
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor  = '#c0a8ff'
      ctx.shadowBlur   = 22
      ctx.font         = 'bold 24px Inter, system-ui, sans-serif'
      ctx.fillStyle    = '#fff'
      ctx.fillText('Siloé', CX, CY - 5)
      ctx.shadowBlur   = 0
      ctx.font         = '500 8px Inter, system-ui, sans-serif'
      ctx.fillStyle    = 'rgba(200,175,255,0.55)'
      ctx.fillText('IA · PRESENTACIONES', CX, CY + 13)
      ctx.restore()

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animId)
  }, [])

  // Anillos de pulso alrededor del cristal
  useEffect(() => {
    const rings = document.querySelectorAll('.gen-ring')
    rings.forEach((ring, i) => {
      ring.style.animationDelay = `${i * 0.65}s`
    })
  }, [])

  return (
    <div style={overlay}>
      <div style={stage}>
        <canvas
          ref={canvasRef}
          width={210}
          height={210}
          style={{ display: 'block' }}
        />
        {/* Anillos de pulso */}
        {[0,1,2].map(i => (
          <div key={i} className="gen-ring" style={{
            position:     'absolute',
            inset:        `${-12-i*14}px`,
            borderRadius: '50%',
            border:       `${1.5-i*0.4}px solid #7c5cfc`,
            opacity:      0,
            animation:    `orbRing 2.5s ${i*0.65}s ease-out infinite`,
            pointerEvents:'none',
          }} />
        ))}
      </div>

      <p style={msg}>
        {messages[idx]}
        <span style={dots}>...</span>
      </p>

      {/* Barra de progreso indeterminada */}
      <div style={barTrack}>
        <div style={barFill} />
      </div>

      <style>{`
        @keyframes orbRing {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(2.4); opacity: 0;   }
        }
        @keyframes genDrift {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes genFade {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 1;    }
        }
      `}</style>
    </div>
  )
}

const overlay = {
  position:        'fixed',
  inset:           0,
  zIndex:          9990,
  display:         'flex',
  flexDirection:   'column',
  alignItems:      'center',
  justifyContent:  'center',
  gap:             '28px',
  background:      'rgba(4, 1, 14, 0.92)',
  backdropFilter:  'blur(10px)',
}

const stage = {
  position: 'relative',
  width:    '210px',
  height:   '210px',
}

const barTrack = {
  width:        '240px',
  height:       '4px',
  background:   'rgba(255,255,255,0.08)',
  borderRadius: '4px',
  overflow:     'hidden',
}

const barFill = {
  width:         '34%',
  height:        '100%',
  background:    'linear-gradient(90deg, #5c9cfc, #7c5cfc)',
  borderRadius:  '4px',
  animation:     'genDrift 1.4s ease-in-out infinite',
}

const msg = {
  margin:       '0',
  color:        '#d9d2ff',
  fontSize:     '17px',
  fontWeight:   '600',
  letterSpacing: '0.02em',
  fontFamily:    'inherit',
}

const dots = {
  animation: 'genFade 1s ease-in-out infinite',
}