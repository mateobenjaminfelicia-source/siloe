// ================================================
//  SILOÉ — Home v5 — Parte 2 completa
//  Puertas (portales) con sistema de confirmación
//  y transición completa orbe → puerta → expansión.
// ================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const DESTINATIONS_GUEST = [
  { id: 'login',     label: 'Iniciar sesión', icon: '🔑', angle: 35,  color: '#7c5cfc', path: '/login'     },
  { id: 'register',  label: 'Crear cuenta',   icon: '✨', angle: 325, color: '#5c9cfc', path: '/register'  },
  { id: 'gen',       label: 'Generar',        icon: '⚡', angle: 70,  color: '#3cb8fc', path: '/generate' },
  { id: 'community', label: 'Comunidad',       icon: '🌐', angle: 200, color: '#3cb8fc', path: '/community' },
  { id: 'donations', label: 'Donaciones',      icon: '💜', angle: 155, color: '#9c5cfc', path: '/donations' },
]

const DESTINATIONS_USER = [
  { id: 'dashboard', label: 'Presentaciones', icon: '📁', angle: 355, color: '#7c5cfc', path: '/dashboard'  },
  { id: 'gen',       label: 'Generar',        icon: '⚡', angle: 40,  color: '#5c9cfc', path: '/generate' },
  { id: 'community', label: 'Comunidad',       icon: '🌐', angle: 160, color: '#3cb8fc', path: '/community'  },
  { id: 'profile',   label: 'Mi perfil',      icon: '👤', angle: 215, color: '#9c5cfc', path: '/u/me'       },
  { id: 'donations', label: 'Donaciones',      icon: '💜', angle: 265, color: '#6c4cdc', path: '/donations'  },
]

const GATE_DISTANCE  = 480   // px desde el orbe a cada puerta en el mundo
const MAX_CAM        = 400   // desplazamiento máximo de la cámara
const APPROACH_DIST  = 260   // px del MOUSE al portal para que aparezca
const CONFIRM_DIST   = 130   // px del MOUSE al portal para confirmar

function lerp(a, b, t) { return a + (b - a) * t }
function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

export default function HomePage() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const isLoggedIn = !!localStorage.getItem('siloe_token')
  const dests      = isLoggedIn ? DESTINATIONS_USER : DESTINATIONS_GUEST

  // ── Cámara ──
  const camRef      = useRef({ x: 0, y: 0 })
  const targetRef   = useRef({ x: 0, y: 0 })
  const mouseRef    = useRef({ x: 0, y: 0 })
  const [camPos,    setCamPos]    = useState({ x: 0, y: 0 })
  const [mouseRel,  setMouseRel]  = useState({ x: 0, y: 0 })

  // ── Viewport ──
  const [vp, setVp] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth  : 1200,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  })
  useEffect(() => {
    const fn = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // ── Estado de la máquina ──
  // idle | approaching | confirming | returning | traveling | expanding | reversing
  const isReversePending = !!location.state?.reverseHome
  const [phase,        setPhase]        = useState(isReversePending ? 'reversing' : 'idle')
  const phaseRef       = useRef(isReversePending ? 'reversing' : 'idle')
  const [activeGate,   setActiveGate]   = useState(null)
  const [orbWorldPos,  setOrbWorldPos]  = useState(null) // posición del orbe en coords mundo
  const [travelPath,   setTravelPath]   = useState(null) // params bezier del viaje
  const travelPosRef   = useRef({ x: 0, y: 0 })          // posición actual del cristal viajando
  const [expandFrom,   setExpandFrom]   = useState({ x: 0, y: 0 })
  const [expandColor,  setExpandColor]  = useState('#7c5cfc')

  // ── Proximidad de puertas (actualizado cada frame) ──
  const [gateStates, setGateStates] = useState({})
  // { [id]: { screenX, screenY, dist, opacity, scale } }

  // ── Wave emitter ──
  const waveEmitterRef = useRef(null)

  const cx = vp.w / 2
  const cy = vp.h / 2

  // Posición mundo de cada puerta
  function gateWorldPos(angle) {
    const rad = (angle - 90) * (Math.PI / 180)
    return {
      x: cx + GATE_DISTANCE * Math.cos(rad),
      y: cy + GATE_DISTANCE * Math.sin(rad),
    }
  }

  // ── Loop principal de cámara + detección de proximidad ──
  useEffect(() => {
    let animId
    let last = performance.now()

    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      const mdx = (mouseRef.current.x - cx) / cx
      const mdy = (mouseRef.current.y - cy) / cy

      // Cámara con inercia — solo activa en idle/approaching/confirming
      if (['idle', 'approaching', 'confirming'].includes(phaseRef.current)) {
        targetRef.current.x = -mdx * MAX_CAM
        targetRef.current.y = -mdy * MAX_CAM
        const LERP = 1 - Math.pow(0.01, dt)
        camRef.current.x += (targetRef.current.x - camRef.current.x) * LERP
        camRef.current.y += (targetRef.current.y - camRef.current.y) * LERP
      } else if (phaseRef.current === 'returning') {
        // Volver suavemente al centro
        const LERP = 1 - Math.pow(0.003, dt)
        camRef.current.x += (0 - camRef.current.x) * LERP
        camRef.current.y += (0 - camRef.current.y) * LERP
      } else if (phaseRef.current === 'traveling' || phaseRef.current === 'reversing') {
        const tp = travelPosRef.current
        const targetCamX = -(tp.x - cx) * 0.75
        const targetCamY = -(tp.y - cy) * 0.75
        const LERP = 1 - Math.pow(0.04, dt)
        camRef.current.x += (targetCamX - camRef.current.x) * LERP
        camRef.current.y += (targetCamY - camRef.current.y) * LERP
      }

      setCamPos({ x: camRef.current.x, y: camRef.current.y })
      setMouseRel({ x: mdx, y: mdy })

      // Calcular posición en pantalla de cada puerta
      // y distancia del MOUSE al portal (no la cámara al centro)
      const newGateStates = {}
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      dests.forEach(dest => {
        const gp = gateWorldPos(dest.angle)
        // Posición en pantalla = posición mundo + offset de cámara
        const screenX = gp.x + camRef.current.x
        const screenY = gp.y + camRef.current.y
        // Distancia del mouse al portal en pantalla
        const dist = Math.hypot(screenX - mx, screenY - my)

        // Opacidad y escala basadas en distancia del mouse al portal
        const FAR_BASE = 0.45
        const opacity = dist < APPROACH_DIST
          ? Math.min(1, FAR_BASE + (1 - FAR_BASE) * (APPROACH_DIST - dist) / (APPROACH_DIST - CONFIRM_DIST + 30))
          : FAR_BASE
        const scale = dist < APPROACH_DIST
          ? lerp(0.75, 1, Math.min(1, (APPROACH_DIST - dist) / (APPROACH_DIST - CONFIRM_DIST + 40)))
          : 0.75

        newGateStates[dest.id] = { screenX, screenY, dist, opacity, scale }
      })
      setGateStates(newGateStates)

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [vp, phase, dests.length])

  useEffect(() => {
    const fn = e => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', fn)
    return () => window.removeEventListener('mousemove', fn)
  }, [])

  // Detectar puerta activa según distancia mouse→portal
  // Usamos phaseRef.current para evitar closures viejos
  useEffect(() => {
    if (!['idle', 'approaching', 'confirming'].includes(phaseRef.current)) return

    let closest = null
    let minDist = Infinity
    dests.forEach(dest => {
      const gs = gateStates[dest.id]
      if (gs && gs.dist < minDist) {
        minDist  = gs.dist
        closest  = dest
      }
    })

    if (minDist < APPROACH_DIST) {
      setActiveGate(closest)
      changePhase(minDist < CONFIRM_DIST ? 'confirming' : 'approaching')
    } else {
      if (phaseRef.current !== 'idle') { changePhase('idle') }
      setActiveGate(null)
    }
  }, [gateStates])

  // Helper para cambiar fase y mantener ref sincronizado
  const changePhase = useCallback((p) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  // ── Confirmar entrada ──
  async function handleEnter() {
    if (!activeGate) return
    const gate = activeGate

    // 1. Cámara vuelve al centro
    changePhase('returning')
    await delay(900)

    // 2. Calcular la curva bezier del cable de esta puerta
    const gp  = gateWorldPos(gate.angle)
    const mx  = (cx + gp.x) / 2
    const my  = (cy + gp.y) / 2
    const pdx = gp.x - cx
    const pdy = gp.y - cy
    const cpx = mx - pdy * 0.22
    const cpy = my + pdx * 0.22

    // Inicializar posición de viaje en el centro
    travelPosRef.current = { x: cx, y: cy }
    setTravelPath({ sx: cx, sy: cy, cpx, cpy, ex: gp.x, ey: gp.y })
    setOrbWorldPos(gp)
    changePhase('traveling')
    await delay(1600)   // duración del viaje — más cinematográfico

    // 3. Expansión cristalina — posición en PANTALLA (mundo + offset cámara)
    setExpandFrom({
      x: gp.x + camRef.current.x,
      y: gp.y + camRef.current.y,
    })
    setExpandColor(gate.color)
    sessionStorage.setItem('siloe_transition_color', gate.color)
    changePhase('expanding')
    await delay(1450)

    navigate(gate.path, { state: { color: gate.color } })
  }

  function handleCancel() {
    changePhase('idle')
    setActiveGate(null)
  }

  // ── Reverse: desde Navbar Siloé hacia Home ──
  function pathToGate(fromPath) {
    const all = [...DESTINATIONS_USER, ...DESTINATIONS_GUEST]
    return all.find(d => {
      if (fromPath === d.path) return true
      if (d.path.includes('/', 1) && fromPath.startsWith(d.path.replace(/\/\w+$/, ''))) return true
      return false
    }) || all.find(d => d.id === 'dashboard') || all[0]
  }

  function startReverseTravel(fromPath) {
    const gate = pathToGate(fromPath)
    if (!gate) return
    const gp = gateWorldPos(gate.angle)
    const mx = (cx + gp.x) / 2
    const my = (cy + gp.y) / 2
    const pdx = gp.x - cx
    const pdy = gp.y - cy
    const cpx = mx - pdy * 0.22
    const cpy = my + pdx * 0.22
    travelPosRef.current = { x: gp.x, y: gp.y }
    setTravelPath({ sx: gp.x, sy: gp.y, cpx, cpy, ex: cx, ey: cy })
    changePhase('reversing')
  }

  // Detectar reverseHome y esperar a CrystalReveal
  useEffect(() => {
    if (!location.state?.reverseHome) return
    const from = location.state.from || '/dashboard'
    const check = setInterval(() => {
      if (window.__siloeReverseReady) {
        window.__siloeReverseReady = false
        clearInterval(check)
        startReverseTravel(from)
      }
    }, 16)
    return () => clearInterval(check)
  }, [location.pathname, location.state?.reverseHome])

  // Al terminar el reverse, volver a idle y posicionar mouse en la puerta
  function handleReverseDone() {
    const from = location.state?.from || '/dashboard'
    const gate = pathToGate(from)
    if (gate) {
      const gp = gateWorldPos(gate.angle)
      mouseRef.current = { x: gp.x + camRef.current.x, y: gp.y + camRef.current.y }
    }
    changePhase('idle')
    navigate('/', { replace: true, state: {} })
  }

  const showOrb = !['traveling', 'expanding', 'reversing'].includes(phase)

  return (
    <div style={s.root}>

      {/* Canvas fijo */}
      <BinaryRain waveEmitterRef={waveEmitterRef} cx={cx} cy={cy} />

      {/* Cursor personalizado */}
      <CustomCursor mouseRef={mouseRef} />

      {/* Mundo que se mueve */}
      <div style={{
        ...s.world,
        transform:  `translate(${camPos.x}px, ${camPos.y}px)`,
        transition: phase === 'returning' ? 'none' : undefined,
      }}>

        {/* SVG: cables con rastro */}
        <svg style={s.worldSvg}>
          <defs>
            {dests.map(dest => {
              const gp  = gateWorldPos(dest.angle)
              const t   = 0.15
              const mx  = (cx + gp.x) / 2
              const my  = (cy + gp.y) / 2
              const pdx = gp.x - cx
              const pdy = gp.y - cy
              const cpx = mx - pdy * 0.22
              const cpy = my + pdx * 0.22
              const bx  = (1-t)*(1-t)*cx + 2*(1-t)*t*cpx + t*t*gp.x
              const by  = (1-t)*(1-t)*cy + 2*(1-t)*t*cpy + t*t*gp.y
              return (
                <linearGradient key={dest.id}
                  id={`trail-${dest.id}`}
                  x1={cx} y1={cy} x2={bx} y2={by}
                  gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stopColor={dest.color} stopOpacity="1"    />
                  <stop offset="45%"  stopColor={dest.color} stopOpacity="0.55" />
                  <stop offset="100%" stopColor={dest.color} stopOpacity="0"    />
                </linearGradient>
              )
            })}
          </defs>

          {dests.map(dest => {
            const gp   = gateWorldPos(dest.angle)
            const mx   = (cx + gp.x) / 2
            const my   = (cy + gp.y) / 2
            const pdx  = gp.x - cx
            const pdy  = gp.y - cy
            const cpx  = mx - pdy * 0.22
            const cpy  = my + pdx * 0.22
            const full = `M ${cx} ${cy} Q ${cpx} ${cpy} ${gp.x} ${gp.y}`
            const t    = 0.15
            const bx   = (1-t)*(1-t)*cx + 2*(1-t)*t*cpx + t*t*gp.x
            const by   = (1-t)*(1-t)*cy + 2*(1-t)*t*cpy + t*t*gp.y
            const trail = `M ${cx} ${cy} Q ${cpx} ${cpy} ${bx} ${by}`
            const isAct = activeGate?.id === dest.id
            const gs    = gateStates[dest.id]

            return (
              <g key={dest.id}>
                {/* Cable completo muy tenue */}
                <path d={full} fill="none" stroke={dest.color}
                  strokeWidth={1} opacity={isAct ? 0.18 : 0.05} />
                {/* Halo cable activo */}
                {isAct && (
                  <path d={full} fill="none" stroke={dest.color}
                    strokeWidth={6} opacity={0.08}
                    style={{ filter: 'blur(5px)' }} />
                )}
                {/* Rastro con gradiente */}
                <path d={trail} fill="none"
                  stroke={`url(#trail-${dest.id})`}
                  strokeWidth={2.5} strokeDasharray="3 8" />
                <path d={trail} fill="none"
                  stroke={dest.color} strokeWidth={7} opacity={0.05}
                  style={{ filter: 'blur(5px)' }} />
                {/* Partícula */}
                <circle r="3.5" fill={dest.color}>
                  <animateMotion
                    dur={`${3 + (dest.angle % 5) * 0.4}s`}
                    repeatCount="indefinite" path={trail} />
                  <animate attributeName="opacity"
                    values="0;0.85;0" keyTimes="0;0.4;1"
                    dur={`${3 + (dest.angle % 5) * 0.4}s`}
                    repeatCount="indefinite" />
                </circle>
              </g>
            )
          })}
        </svg>

        {/* Detalles del camino */}
        {dests.map(dest => (
          <PathDetails key={dest.id}
            cx={cx} cy={cy}
            gatePos={gateWorldPos(dest.angle)}
            color={dest.color} />
        ))}

        {/* Puertas en el mundo */}
        {dests.map(dest => {
          const gp = gateWorldPos(dest.angle)
          const gs = gateStates[dest.id]
          if (!gs || gs.opacity <= 0) return null
          return (
            <Portal key={dest.id}
              dest={dest}
              wx={gp.x} wy={gp.y}
              opacity={gs.opacity}
              scale={gs.scale}
              isConfirming={phase === 'confirming' && activeGate?.id === dest.id}
              onEnter={handleEnter}
              onCancel={handleCancel}
            />
          )
        })}

        {/* Cristal viajando a lo largo del cable bezier */}
        {phase === 'traveling' && travelPath && (
          <TravelingOrb
            travelPath={travelPath}
            travelPosRef={travelPosRef}
          />
        )}

        {/* Reverse: cristal viajando desde el portal al centro */}
        {phase === 'reversing' && travelPath && (
          <TravelingOrb
            travelPath={travelPath}
            travelPosRef={travelPosRef}
            duration={1200}
            onDone={handleReverseDone}
          />
        )}

        {/* Orbe fijo al centro */}
        {showOrb && (
          <PremiumOrb
            cx={cx} cy={cy}
            mouseRel={mouseRel}
            waveEmitterRef={waveEmitterRef}
          />
        )}

      </div>

      {/* Indicadores de dirección */}
      {phase === 'idle' && dests.map(dest => (
        <DirectionHint key={dest.id} dest={dest} vp={vp} />
      ))}

      {/* Subtítulo */}
      <p style={s.subtitle}>
        {phase === 'confirming'
          ? `Puerta encontrada — ${activeGate?.label}`
          : phase === 'returning' || phase === 'traveling' || phase === 'reversing'
          ? 'Viajando...'
          : isLoggedIn
          ? 'Mové el mouse para explorar'
          : 'Explorá el espacio para comenzar'}
      </p>

      {/* Expansión cristalina */}
      {phase === 'expanding' && (
        <CrystalExpansion
          fromX={expandFrom.x}
          fromY={expandFrom.y}
          color={expandColor}
        />
      )}

      <style>{`
        @keyframes orbRing {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(2.4); opacity: 0;   }
        }
        @keyframes portalRing {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
        @keyframes portalRingRev {
          from { transform: rotate(0deg);    }
          to   { transform: rotate(-360deg); }
        }
        @keyframes floatDetail {
          0%   { transform: translate(-50%,-50%) scale(1)   translateY(0px);  }
          100% { transform: translate(-50%,-50%) scale(1.3) translateY(-8px); }
        }
        @keyframes hintPulse {
          0%, 100% { opacity: 1;   }
          50%       { opacity: 0.4; }
        }
        @keyframes confirmAppear {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0px); }
        }
        @keyframes pillarGlow {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1;   }
        }
        @keyframes travelOrb {
          0%   { transform: translate(-50%,-50%) scale(0.7); }
          50%  { transform: translate(-50%,-50%) scale(0.85); }
          100% { transform: translate(-50%,-50%) scale(0.6); }
        }
      `}</style>
    </div>
  )
}

// ════════════════════════════════════════════════
//  PORTAL / PUERTA
// ════════════════════════════════════════════════
function Portal({ dest, wx, wy, opacity, scale, isConfirming, onEnter, onCancel }) {
  return (
    <div style={{
      position:   'absolute',
      left:       wx,
      top:        wy,
      transform:  `translate(-50%, -50%) scale(${scale})`,
      opacity,
      transition: 'opacity 0.4s, transform 0.4s',
      zIndex:     15,
    }}>

      {/* Anillo exterior giratorio */}
      <div style={{
        position:     'absolute',
        inset:        '-18px',
        borderRadius: '50%',
        border:       `1.5px solid ${dest.color}60`,
        animation:    'portalRing 8s linear infinite',
        boxShadow:    `0 0 12px ${dest.color}30`,
      }}>
        {/* Punto de referencia en el anillo */}
        <div style={{
          position:     'absolute',
          top:          '-3px',
          left:         '50%',
          transform:    'translateX(-50%)',
          width:        '6px',
          height:       '6px',
          borderRadius: '50%',
          background:   dest.color,
          boxShadow:    `0 0 8px ${dest.color}`,
        }} />
      </div>

      {/* Anillo interior giratorio inverso */}
      <div style={{
        position:     'absolute',
        inset:        '-8px',
        borderRadius: '50%',
        border:       `1px dashed ${dest.color}40`,
        animation:    'portalRingRev 5s linear infinite',
      }} />

      {/* Cuerpo del portal */}
      <div style={{
        width:        '100px',
        height:       '100px',
        borderRadius: '50%',
        background:   `radial-gradient(circle at center,
          ${dest.color}22 0%,
          ${dest.color}10 40%,
          transparent 70%)`,
        border:       `1.5px solid ${dest.color}50`,
        boxShadow:    `
          0 0 20px ${dest.color}40,
          0 0 50px ${dest.color}20,
          inset 0 0 30px ${dest.color}15
        `,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '4px',
        position:       'relative',
        overflow:       'hidden',
      }}>

        {/* Pilares del arco — izquierdo y derecho */}
        <div style={{
          position:   'absolute',
          left:       '12px', top: '15px', bottom: '15px',
          width:      '3px',
          background: `linear-gradient(180deg, transparent, ${dest.color}, transparent)`,
          borderRadius:'2px',
          animation:  'pillarGlow 2s ease-in-out infinite',
          boxShadow:  `0 0 8px ${dest.color}`,
        }} />
        <div style={{
          position:   'absolute',
          right:      '12px', top: '15px', bottom: '15px',
          width:      '3px',
          background: `linear-gradient(180deg, transparent, ${dest.color}, transparent)`,
          borderRadius:'2px',
          animation:  'pillarGlow 2s 0.3s ease-in-out infinite',
          boxShadow:  `0 0 8px ${dest.color}`,
        }} />

        {/* Ícono del destino */}
        <span style={{
          fontSize:   '28px',
          filter:     `drop-shadow(0 0 8px ${dest.color})`,
          zIndex:     2,
        }}>{dest.icon}</span>

        {/* Nombre */}
        <span style={{
          fontSize:      '10px',
          fontWeight:    '600',
          color:         dest.color,
          letterSpacing: '0.05em',
          textAlign:     'center',
          zIndex:        2,
          textShadow:    `0 0 10px ${dest.color}`,
        }}>{dest.label}</span>

      </div>

      {/* Confirmación — aparece al estar cerca */}
      {isConfirming && (
        <div style={{
          position:    'absolute',
          bottom:      '-70px',
          left:        '50%',
          whiteSpace:  'nowrap',
          display:     'flex',
          flexDirection:'column',
          alignItems:  'center',
          gap:         '10px',
          animation:   'confirmAppear 0.35s ease-out forwards',
        }}>
          <span style={{
            fontSize:    '13px',
            fontWeight:  '600',
            color:       '#fff',
            textShadow:  `0 0 20px ${dest.color}`,
          }}>
            ¿Entrar a {dest.label}?
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onEnter} style={{
              padding:      '7px 20px',
              background:   dest.color,
              border:       'none',
              borderRadius: '20px',
              color:        '#fff',
              fontSize:     '12px',
              fontWeight:   '700',
              cursor:       'pointer',
              boxShadow:    `0 0 16px ${dest.color}60`,
              transition:   'transform 0.15s',
            }}>
              Entrar
            </button>
            <button onClick={onCancel} style={{
              padding:      '7px 20px',
              background:   'rgba(255,255,255,0.08)',
              border:       '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px',
              color:        'rgba(255,255,255,0.6)',
              fontSize:     '12px',
              fontWeight:   '600',
              cursor:       'pointer',
            }}>
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
//  CRISTAL VIAJANDO
//  Sigue la curva bezier del cable usando RAF.
//  Actualiza travelPosRef para que la cámara
//  pueda seguirlo en tiempo real.
// ════════════════════════════════════════════════
function TravelingOrb({ travelPath, travelPosRef, duration, onDone }) {
  const canvasRef  = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    const canvas  = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper || !travelPath) return

    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const CX = W/2, CY = H/2, SCALE = 78

    // ── Icosaedro ──
    const phi = (1+Math.sqrt(5))/2
    const norm = v=>{const l=Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);return l>0?[v[0]/l,v[1]/l,v[2]/l]:v}
    const VERTS=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(v=>norm(v))
    const FACES=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]
    const rX=(v,a)=>{const c=Math.cos(a),s=Math.sin(a);return[v[0],v[1]*c-v[2]*s,v[1]*s+v[2]*c]}
    const rY=(v,a)=>{const c=Math.cos(a),s=Math.sin(a);return[v[0]*c+v[2]*s,v[1],-v[0]*s+v[2]*c]}
    const proj=v=>{const fov=3.8,z=v[2]+fov,f=SCALE*fov/z;return[CX+v[0]*f,CY+v[1]*f]}
    const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]]
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
    const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
    const LIGHT=norm([0.4,-0.7,1.0])

    // ── Bezier cuadrática ──
    const { sx, sy, cpx, cpy, ex, ey } = travelPath
    const bezier = t => ({
      x: (1-t)*(1-t)*sx + 2*(1-t)*t*cpx + t*t*ex,
      y: (1-t)*(1-t)*sy + 2*(1-t)*t*cpy + t*t*ey,
    })

    const DURATION = duration || 1550
    let startTime  = null
    let rotY       = 0
    let animId

    function draw(now) {
      if (!startTime) startTime = now
      const elapsed = now - startTime
      // Easing: ease-in-out cúbico
      let raw = Math.min(elapsed / DURATION, 1)
      const t = raw < 0.5 ? 4*raw*raw*raw : 1 - Math.pow(-2*raw+2,3)/2

      // Posición en la curva bezier
      const pos = bezier(t)

      // Actualizar ref para que la cámara lo siga
      travelPosRef.current = pos

      // Mover el wrapper DOM directamente (sin React state → sin re-render)
      wrapper.style.left = pos.x + 'px'
      wrapper.style.top  = pos.y + 'px'

      // Rotar cristal
      rotY += 0.05

      // Dibujar cristal
      ctx.clearRect(0,0,W,H)
      const T = VERTS.map(v=>rY(rX(v,0.4),rotY))
      const P = T.map(v=>proj(v))
      const fd = FACES.map(f=>{
        const n=norm(cross(sub(T[f[1]],T[f[0]]),sub(T[f[2]],T[f[0]])))
        const bf=dot(n,[0,0,-1])>0
        const d=Math.max(0,dot(n,LIGHT))
        const z=(T[f[0]][2]+T[f[1]][2]+T[f[2]][2])/3
        return{f,d,bf,z}
      }).sort((a,b)=>a.z-b.z)

      fd.forEach(({f,d,bf})=>{
        const [p0,p1,p2]=[P[f[0]],P[f[1]],P[f[2]]]
        ctx.beginPath(); ctx.moveTo(p0[0],p0[1]); ctx.lineTo(p1[0],p1[1]); ctx.lineTo(p2[0],p2[1]); ctx.closePath()
        ctx.fillStyle=`rgba(${Math.floor(70+d*90)},${Math.floor(40+d*50)},${Math.floor(160+d*80)},${bf?.06:.10+d*.22})`
        ctx.fill()
        ctx.strokeStyle=`rgba(${160+Math.floor(d*80)},${120+Math.floor(d*60)},255,${bf?.12:.45+d*.45})`
        ctx.lineWidth=bf?.4:1; ctx.stroke()
      })

      // Texto
      ctx.save()
      ctx.textAlign='center'; ctx.textBaseline='middle'
      ctx.shadowColor='#c0a8ff'
      ctx.shadowBlur=22
      ctx.font='bold 24px Inter,sans-serif'; ctx.fillStyle='#fff'
      ctx.fillText('Siloé', CX, CY - 5)
      ctx.shadowBlur=0
      ctx.font='500 8px Inter,sans-serif'
      ctx.fillStyle='rgba(200,175,255,0.55)'
      ctx.fillText('IA · PRESENTACIONES', CX, CY + 13)
      ctx.restore()

      if (elapsed < DURATION) {
        animId = requestAnimationFrame(draw)
      } else {
        onDone?.()
      }
    }

    animId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animId)
  }, [travelPath])

  return (
    <div
      ref={wrapperRef}
      style={{
        position:  'absolute',
        left:      travelPath?.sx ?? 0,
        top:       travelPath?.sy ?? 0,
        transform: 'translate(-50%,-50%)',
        zIndex:    20,
        willChange:'left,top',
      }}
    >
      {/* Estela de luz */}
      <div style={{
        position:'absolute', inset:'-18px', borderRadius:'50%',
        background:'radial-gradient(circle, #7c5cfc40, transparent 70%)',
        animation:'orbRing 0.9s ease-out infinite', pointerEvents:'none',
      }}/>
      <canvas ref={canvasRef} width={210} height={210} style={{display:'block'}}/>
    </div>
  )
}

// ════════════════════════════════════════════════
//  CRISTAL PREMIUM — Icosaedro 3D
//  Reemplaza al orbe. Figura con 20 caras
//  triangulares de vidrio que rota suavemente.
//  El mouse inclina el cristal en X e Y.
//  Cada 2.5s emite un pulso al canvas binario.
// ════════════════════════════════════════════════
function PremiumOrb({ cx, cy, mouseRel, waveEmitterRef }) {
  const canvasRef  = useRef(null)
  const stateRef   = useRef({ rotX: 0.4, rotY: 0 })
  const mouseRef2  = useRef(mouseRel)

  // Sincronizar mouseRel en ref para no recrear el loop
  useEffect(() => { mouseRef2.current = mouseRel }, [mouseRel])

  // Pulso cada 2.5s
  useEffect(() => {
    const id = setInterval(() => waveEmitterRef.current?.(), 2500)
    return () => clearInterval(id)
  }, [waveEmitterRef])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const CX = W / 2, CY = H / 2
    const SCALE = 78
    let animId, last = performance.now()

    // ── Icosaedro ──
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

    // Dirección de la luz
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

    function draw(now) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      // Rotación automática Y + inclinación por mouse
      stateRef.current.rotY += dt * 0.38
      const mr = mouseRef2.current
      const targetX = 0.4 + mr.y * 0.4
      stateRef.current.rotX += (targetX - stateRef.current.rotX) * 0.06
      const ry = stateRef.current.rotY + mr.x * 0.35
      const rx = stateRef.current.rotX

      ctx.clearRect(0, 0, W, H)

      // Transformar vértices
      const transformed = VERTS.map(v => rotY(rotX(v, rx), ry))
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

      // ── PASO 1: caras rellenas ──
      faceData.forEach(({ face, diffuse, backface }) => {
        const [p0,p1,p2] = [projected[face[0]],projected[face[1]],projected[face[2]]]
        ctx.beginPath()
        ctx.moveTo(p0[0],p0[1])
        ctx.lineTo(p1[0],p1[1])
        ctx.lineTo(p2[0],p2[1])
        ctx.closePath()
        // Vidrio: poco alpha, color violeta/azul
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

      // ── PASO 2: halo de aristas (blur) ──
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

      // ── PASO 3: resplandor central ──
      const grd = ctx.createRadialGradient(CX,CY,0, CX,CY,SCALE*0.9)
      grd.addColorStop(0, 'rgba(160,100,255,0.18)')
      grd.addColorStop(1, 'rgba(80,40,180,0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(CX,CY,SCALE*0.9,0,Math.PI*2)
      ctx.fill()

      // ── PASO 4: texto "Siloé" ──
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

  return (
    <div style={{
      position:  'absolute',
      left:      cx, top: cy,
      transform: 'translate(-50%,-50%)',
      zIndex:    20,
    }}>
      {/* Sombra proyectada */}
      <div style={{
        position:     'absolute',
        bottom:       '-20px', left: '50%',
        transform:    'translateX(-50%)',
        width:        '130px', height: '22px',
        background:   'radial-gradient(ellipse, #7c5cfc40, transparent 70%)',
        filter:       'blur(10px)',
        pointerEvents:'none',
      }} />
      {/* Anillos de pulso — usan border-radius 0 para cuadrar con el cristal */}
      {[0,1,2].map(i => (
        <div key={i} style={{
          position:     'absolute',
          inset:        `${-12-i*14}px`,
          borderRadius: '50%',
          border:       `${1.5-i*0.4}px solid #7c5cfc`,
          opacity:      0,
          animation:    `orbRing 2.5s ${i*0.65}s ease-out infinite`,
          pointerEvents:'none',
        }} />
      ))}
      {/* Canvas del cristal */}
      <canvas
        ref={canvasRef}
        width={210} height={210}
        style={{ display: 'block' }}
      />
    </div>
  )
}

// ════════════════════════════════════════════════
//  DETALLES DEL CAMINO
// ════════════════════════════════════════════════
function PathDetails({ cx, cy, gatePos, color }) {
  const details = useRef(
    Array.from({ length: 6 }, (_, i) => {
      const t   = 0.12 + (i / 6) * 0.82
      const mx  = (cx + gatePos.x) / 2
      const my  = (cy + gatePos.y) / 2
      const pdx = gatePos.x - cx
      const pdy = gatePos.y - cy
      const cpx = mx - pdy * 0.22
      const cpy = my + pdx * 0.22
      const bx  = (1-t)*(1-t)*cx + 2*(1-t)*t*cpx + t*t*gatePos.x
      const by_ = (1-t)*(1-t)*cy + 2*(1-t)*t*cpy + t*t*gatePos.y
      return {
        x: bx + (Math.random()-.5)*55,
        y: by_ + (Math.random()-.5)*55,
        size: 1.5 + Math.random()*3,
        opacity: 0.07 + Math.random()*0.13,
        dur: 3 + Math.random()*4,
        delay: Math.random()*4,
      }
    })
  ).current

  return (
    <>
      {details.map((d, i) => (
        <div key={i} style={{
          position:'absolute', left:d.x, top:d.y,
          width:d.size, height:d.size, borderRadius:'50%',
          background:color, opacity:d.opacity,
          transform:'translate(-50%,-50%)',
          animation:`floatDetail ${d.dur}s ${d.delay}s ease-in-out infinite alternate`,
          boxShadow:`0 0 ${d.size*3}px ${color}60`,
          pointerEvents:'none',
        }} />
      ))}
    </>
  )
}

// ════════════════════════════════════════════════
//  CURSOR PERSONALIZADO
// ════════════════════════════════════════════════
function CustomCursor({ mouseRef }) {
  const [pos, setPos] = useState({ x: -100, y: -100 })

  useEffect(() => {
    const id = setInterval(() => {
      setPos({ x: mouseRef.current.x, y: mouseRef.current.y })
    }, 16)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <div style={{
        position:     'fixed',
        left:         pos.x, top: pos.y,
        width:        '12px', height: '12px',
        borderRadius: '50%',
        background:   '#7c5cfc',
        transform:    'translate(-50%,-50%)',
        pointerEvents:'none',
        zIndex:       9999,
        boxShadow:    '0 0 12px #7c5cfc, 0 0 24px #7c5cfc60',
        transition:   'width 0.15s, height 0.15s',
      }} />
      <div style={{
        position:     'fixed',
        left:         pos.x, top: pos.y,
        width:        '36px', height: '36px',
        borderRadius: '50%',
        border:       '1px solid rgba(124,92,252,0.35)',
        transform:    'translate(-50%,-50%)',
        pointerEvents:'none',
        zIndex:       9998,
        transition:   'left 0.08s, top 0.08s',
      }} />
    </>
  )
}

// ════════════════════════════════════════════════
//  INDICADORES DE DIRECCIÓN
// ════════════════════════════════════════════════
function DirectionHint({ dest, vp }) {
  const rad = (dest.angle - 90) * (Math.PI / 180)
  const dx  = Math.cos(rad)
  const dy  = Math.sin(rad)
  const m   = 36
  const bx  = vp.w/2 + dx*(vp.w/2 - m*2)
  const by  = vp.h/2 + dy*(vp.h/2 - m*2)
  const px  = Math.max(m, Math.min(vp.w-m, bx))
  const py  = Math.max(m, Math.min(vp.h-m, by))
  const ang = Math.atan2(dy, dx) * (180/Math.PI)

  return (
    <div style={{
      position:'fixed', left:px, top:py,
      transform:`translate(-50%,-50%)`,
      zIndex:30, pointerEvents:'none',
      display:'flex', flexDirection:'column',
      alignItems:'center', gap:'4px',
      animation:'hintPulse 2.5s ease-in-out infinite',
    }}>
      <div style={{
        width:0, height:0,
        borderTop:'5px solid transparent',
        borderBottom:'5px solid transparent',
        borderLeft:`9px solid ${dest.color}`,
        opacity:0.4,
        filter:`drop-shadow(0 0 4px ${dest.color})`,
        transform:`rotate(${ang}deg)`,
      }} />
      <span style={{
        fontSize:'9px', color:dest.color,
        opacity:0.45, fontWeight:'600',
        letterSpacing:'0.05em', whiteSpace:'nowrap',
      }}>{dest.label}</span>
    </div>
  )
}

// ════════════════════════════════════════════════
//  LLUVIA BINARIA CON ONDAS
// ════════════════════════════════════════════════
function BinaryRain({ waveEmitterRef, cx, cy }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef({ mouse:{x:-999,y:-999}, waves:[], cells:[], cols:0, rows:0 })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    let animId
    const FS = 13

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      const cols = Math.ceil(canvas.width/FS)
      const rows = Math.ceil(canvas.height/FS)
      stateRef.current.cols  = cols
      stateRef.current.rows  = rows
      stateRef.current.cells = Array.from({length:cols},()=>
        Array.from({length:rows},()=>({
          char: Math.random()>.5?'1':'0',
          waveBright:0, speed:.2+Math.random()*.55,
          phase:Math.random()*rows, lastWave:-1,
        })))
    }
    resize()
    window.addEventListener('resize', resize)
    const onMove = e => { stateRef.current.mouse={x:e.clientX,y:e.clientY} }
    window.addEventListener('mousemove', onMove)

    let waveId = 0
    waveEmitterRef.current = () => {
      const maxR = Math.hypot(canvas.width, canvas.height)*.75
      stateRef.current.waves.push({ id:waveId++, x:cx, y:cy, r:0, maxR, speed:270 })
    }

    let last=performance.now(), tick=0
    function draw(now) {
      const dt=Math.min((now-last)/1000,.05); last=now; tick+=dt*60
      ctx.fillStyle='rgba(4,1,14,0.16)'
      ctx.fillRect(0,0,canvas.width,canvas.height)
      ctx.font=`${FS}px monospace`
      const {cells,cols,rows,waves,mouse}=stateRef.current
      for(let i=waves.length-1;i>=0;i--){
        waves[i].r+=waves[i].speed*dt
        if(waves[i].r>waves[i].maxR) waves.splice(i,1)
      }
      for(let c=0;c<cols;c++){
        for(let r=0;r<rows;r++){
          const cell=cells[c]?.[r]; if(!cell) continue
          const px=c*FS, py=r*FS+FS
          const mdist=Math.hypot(px-mouse.x,py-mouse.y)
          const mouseB=Math.max(0,1-mdist/100)*.8
          const colPhase=(tick*cell.speed*.5+cell.phase)%rows
          const headB=Math.max(0,1-Math.abs(r-colPhase)/3.5)*.6
          let waveB=cell.waveBright*.91
          for(const wave of waves){
            const wdist=Math.hypot(px-wave.x,py-wave.y)
            const diff=Math.abs(wdist-wave.r)
            if(diff<28){
              const intensity=(1-diff/28)
              if(intensity>waveB&&wave.id!==cell.lastWave){
                waveB=intensity*.92
                if(diff<5) cell.lastWave=wave.id
              }
            }
          }
          cell.waveBright=waveB
          const totalB=Math.max(mouseB,headB,waveB,.028)
          let r_,g_,b_
          if(waveB>.35){r_=Math.floor(155+waveB*85);g_=Math.floor(90+waveB*55);b_=255}
          else if(mouseB>.25){r_=Math.floor(110+mouseB*110);g_=Math.floor(195+mouseB*60);b_=255}
          else if(headB>.25){r_=130;g_=70;b_=255}
          else{r_=45;g_=25;b_=110}
          ctx.fillStyle=`rgba(${r_},${g_},${b_},${totalB})`
          ctx.fillText(cell.char,px,py)
          if(Math.random()<.0012) cell.char=Math.random()>.5?'1':'0'
        }
      }
      animId=requestAnimationFrame(draw)
    }
    animId=requestAnimationFrame(draw)
    return()=>{
      cancelAnimationFrame(animId)
      window.removeEventListener('resize',resize)
      window.removeEventListener('mousemove',onMove)
      waveEmitterRef.current=null
    }
  }, [cx, cy])

  return <canvas ref={canvasRef} style={s.canvas} />
}

// ════════════════════════════════════════════════
//  EXPANSIÓN CRISTALINA
//  Fase 1: cristal crece desde la puerta a maxScale
//  Fase 2: cristal se queda en maxScale (tamaño fijo)
//          mientras el overlay sólido funde a 100%
//  El tamaño máximo es idéntico al que usa CrystalReveal
//  — garantiza handoff sin corte visual.
// ════════════════════════════════════════════════

// Tamaño compartido entre expansión y revelación
const SHARED_MAX_SCALE = () => Math.hypot(window.innerWidth, window.innerHeight) * 1.4

function CrystalExpansion({ fromX, fromY, color }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const phi  = (1+Math.sqrt(5))/2
    const norm = v=>{const l=Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);return l>0?[v[0]/l,v[1]/l,v[2]/l]:v}
    const VERTS=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(v=>norm(v))
    const FACES=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]
    const rX=(v,a)=>{const c=Math.cos(a),s=Math.sin(a);return[v[0],v[1]*c-v[2]*s,v[1]*s+v[2]*c]}
    const rY=(v,a)=>{const c=Math.cos(a),s=Math.sin(a);return[v[0]*c+v[2]*s,v[1],-v[0]*s+v[2]*c]}

    const hex=color.replace('#','')
    const rgb={r:parseInt(hex.slice(0,2),16),g:parseInt(hex.slice(2,4),16),b:parseInt(hex.slice(4,6),16)}

    const maxScale = SHARED_MAX_SCALE()
    let rotAngle   = 0
    let startTime  = null
    let animId

    const project=(v,sc)=>{const fov=3.5,z=v[2]+fov,f=sc*fov/z;return[fromX+v[0]*f,fromY+v[1]*f]}

    const SCALE_DURATION = 650
    const SOLID_DURATION = 400

    function draw(now) {
      if (!startTime) startTime = now
      const elapsed = now - startTime

      rotAngle += 0.04

      // Fase 1: escala crece de 8 a maxScale con ease-in cuadrático
      const scaleProgress = Math.min(elapsed / SCALE_DURATION, 1)
      const eased = scaleProgress * scaleProgress
      const scale = 8 + (maxScale - 8) * eased

      // Fase 2: overlay sólido después de alcanzar maxScale
      const solidElapsed = Math.max(0, elapsed - SCALE_DURATION)
      const solidAlpha = Math.min(1, solidElapsed / SOLID_DURATION)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Cristal siempre en su tamaño actual
      const T  = VERTS.map(v=>rY(rX(v,0.3),rotAngle))
      const fd = FACES.map((f,i)=>({f,i,z:(T[f[0]][2]+T[f[1]][2]+T[f[2]][2])/3})).sort((a,b)=>a.z-b.z)

      fd.forEach(({f,i})=>{
        const [p0,p1,p2]=f.map(vi=>project(T[vi],scale))
        ctx.beginPath(); ctx.moveTo(p0[0],p0[1]); ctx.lineTo(p1[0],p1[1]); ctx.lineTo(p2[0],p2[1]); ctx.closePath()
        const t=i/20
        ctx.fillStyle=`rgb(${Math.min(255,Math.floor(rgb.r*(0.65+t*0.55)))},${Math.min(255,Math.floor(rgb.g*(0.65+t*0.55)))},${Math.min(255,Math.floor(rgb.b*(0.75+t*0.45)))})`
        ctx.fill()
        // Aristas visibles mientras crece
        if (scale < maxScale * 0.5) {
          ctx.strokeStyle=`rgba(255,255,255,${0.15*(1-scale/(maxScale*0.5))})`
          ctx.lineWidth=0.8; ctx.stroke()
        }
      })

      // Overlay sólido encima
      if (solidAlpha > 0) {
        ctx.fillStyle=`rgba(${rgb.r},${rgb.g},${rgb.b},${solidAlpha})`
        ctx.fillRect(0,0,canvas.width,canvas.height)
      }

      if (solidAlpha < 1) animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <canvas ref={canvasRef} style={{position:'fixed',inset:0,zIndex:100,pointerEvents:'none'}}/>
  )
}

const s = {
  root:    { width:'100vw', height:'100vh', overflow:'hidden', background:'#04010e', position:'relative', cursor:'none' },
  canvas:  { position:'absolute', inset:0, zIndex:0 },
  world:   { position:'absolute', inset:0, zIndex:1, willChange:'transform' },
  worldSvg:{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible', pointerEvents:'none' },
  subtitle:{ position:'fixed', bottom:'28px', left:'50%', transform:'translateX(-50%)', fontSize:'11px', color:'rgba(160,130,255,0.4)', fontWeight:'600', letterSpacing:'0.1em', zIndex:50, pointerEvents:'none', textTransform:'uppercase' },
  // expandOverlay removido — reemplazado por CrystalExpansion
}
