// ================================================
//  SILOÉ — Componente: GeneratingOverlay
//  Pantalla de carga cinemática mientras la IA
//  crea la presentación. Figura geométrica girando
//  (anillos + diamante + orbe) en el estilo del Home.
//  Props:
//    mode: 'structure' | 'content' | "default"
// ================================================

import { useState, useEffect } from 'react'

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

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), 2400)
    return () => clearInterval(t)
  }, [messages.length])

  return (
    <div style={overlay}>
      <div style={stage}>
        {/* Anillo exterior girando */}
        <div style={ringOuter} />
        {/* Anillo interior al revés */}
        <div style={ringInner} />
        {/* Diamante */}
        <div style={diamond} />
        {/* Orbe central con brillo */}
        <div style={core}>
          <span style={bolt}>⚡</span>
        </div>
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
        @keyframes genSpin {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes genSpinRev {
          from { transform: translate(-50%,-50%) rotate(360deg); }
          to   { transform: translate(-50%,-50%) rotate(0deg); }
        }
        @keyframes genPulse {
          0%, 100% { transform: translate(-50%,-50%) scale(1);   opacity: 0.9; }
          50%      { transform: translate(-50%,-50%) scale(1.15); opacity: 1;  }
        }
        @keyframes genDrift {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes genBolt {
          0%, 100% { transform: scale(1)  rotate(0deg);   filter: drop-shadow(0 0 6px #9cc8ff); }
          50%      { transform: scale(1.18) rotate(12deg); filter: drop-shadow(0 0 14px #c9b8ff); }
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
  width:    '150px',
  height:   '150px',
}

const ringBase = {
  position:        'absolute',
  left:            '50%',
  top:             '50%',
  borderRadius:    '50%',
  borderStyle:     'solid',
}

const ringOuter = {
  ...ringBase,
  width:       '140px',
  height:      '140px',
  borderWidth: '2px',
  borderColor: 'rgba(124,92,252,0.45) transparent rgba(124,92,252,0.45) transparent',
  animation:   'genSpin 3.2s linear infinite',
}

const ringInner = {
  ...ringBase,
  width:       '104px',
  height:      '104px',
  borderWidth: '2px',
  borderColor: 'transparent rgba(92,156,252,0.55) transparent rgba(92,156,252,0.55)',
  animation:   'genSpinRev 2.4s linear infinite',
}

const diamond = {
  position:   'absolute',
  left:       '50%',
  top:        '50%',
  width:      '58px',
  height:     '58px',
  background: 'linear-gradient(120deg, rgba(92,156,252,0.25), rgba(124,92,252,0.25))',
  border:     '1px solid rgba(201,184,255,0.4)',
  transform:  'translate(-50%,-50%) rotate(45deg)',
  animation:  'genPulse 1.8s ease-in-out infinite',
  borderRadius: '10px',
}

const core = {
  position:   'absolute',
  left:       '50%',
  top:        '50%',
  width:      '66px',
  height:     '66px',
  borderRadius: '50%',
  background: 'radial-gradient(circle at 35% 30%, #7c5cfc, #5c9cfc 70%, #3d2a8c)',
  transform:  'translate(-50%,-50%)',
  boxShadow:  '0 0 34px rgba(124,92,252,0.65)',
  display:    'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation:  'genPulse 1.8s ease-in-out infinite',
}

const bolt = {
  fontSize:   '26px',
  animation:  'genBolt 1.4s ease-in-out infinite',
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