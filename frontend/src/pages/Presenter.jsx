// ================================================
//  SILOÉ — Página: Presenter
//  Modo presentador a pantalla completa.
//
//  Funcionalidades:
//    - Pantalla completa con el slide activo
//    - Navegación con flechas del teclado y botones
//    - Barra de progreso
//    - Panel de notas del orador (toggle con N)
//    - Contador de slides
//    - Salir con Escape
//
//  Reutiliza SlideCanvas en modo readonly — el mismo
//  renderizado que el editor pero sin edición.
//
//  Atajos de teclado:
//    → / Espacio / PageDown : siguiente slide
//    ← / PageUp             : slide anterior
//    N                      : toggle notas del orador
//    F                      : toggle pantalla completa
//    Escape                 : salir al dashboard
// ================================================

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate }           from 'react-router-dom'
import { presentationsAPI }                 from '../services/api'
import SlideCanvas                          from '../components/Editor/SlideCanvas'
import Button                               from '../components/UI/Button'

export default function PresenterPage() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [presentation, setPresentation] = useState(null)
  const [slides,       setSlides]       = useState([])
  const [activeIndex,  setActiveIndex]  = useState(0)
  const [showNotes,    setShowNotes]    = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  // ── Carga de la presentación ──
  useEffect(() => {
    async function load() {
      try {
        const response = await presentationsAPI.getById(id)
        setPresentation(response.data)
        setSlides(response.data.slides || [])
      } catch {
        setError('No se pudo cargar la presentación.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // ── Navegación ──
  const goNext = useCallback(() => {
    setActiveIndex(i => Math.min(i + 1, slides.length - 1))
  }, [slides.length])

  const goPrev = useCallback(() => {
    setActiveIndex(i => Math.max(i - 1, 0))
  }, [])

  // ── Toggle pantalla completa ──
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // ── Atajos de teclado ──
  useEffect(() => {
    function onKeyDown(e) {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault()
          goNext()
          break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          goPrev()
          break
        case 'n':
        case 'N':
          setShowNotes(v => !v)
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'Escape':
          if (!document.fullscreenElement) navigate('/dashboard')
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goNext, goPrev, navigate])

  // Sincronizar estado cuando el usuario sale de fullscreen con Escape del browser
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // ── Render: estados ──
  if (loading) return <PresenterSkeleton />
  if (error)   return (
    <div style={s.centered}>
      <p style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>⚠️ {error}</p>
      <Button variant="secondary" onClick={() => navigate('/dashboard')}>
        Volver al Dashboard
      </Button>
    </div>
  )

  const activeSlide = slides[activeIndex]
  const isFirst     = activeIndex === 0
  const isLast      = activeIndex === slides.length - 1
  const progress    = slides.length > 1
    ? (activeIndex / (slides.length - 1)) * 100
    : 100

  return (
    <div style={s.page}>

      {/* ── Barra superior ── */}
      <header style={s.topBar}>
        <div style={s.topLeft}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/editor/${id}`)}
          >
            ← Volver al editor
          </Button>
          <span style={s.presTitle}>{presentation?.title}</span>
        </div>

        <div style={s.topRight}>
          {/* Toggle notas */}
          <button
            style={{ ...s.iconBtn, ...(showNotes ? s.iconBtnActive : {}) }}
            onClick={() => setShowNotes(v => !v)}
            title="Notas del orador (N)"
          >
            📝
          </button>
          {/* Toggle pantalla completa */}
          <button
            style={s.iconBtn}
            onClick={toggleFullscreen}
            title="Pantalla completa (F)"
          >
            {isFullscreen ? '⤡' : '⤢'}
          </button>
        </div>
      </header>

      {/* ── Barra de progreso ── */}
      <div style={s.progressBar}>
        <div style={{ ...s.progressFill, width: `${progress}%` }} />
      </div>

      {/* ── Cuerpo: slide + notas ── */}
      <div style={{
        ...s.body,
        gridTemplateRows: showNotes ? '1fr 220px' : '1fr',
      }}>

        {/* Zona del slide */}
        <div style={s.slideZone}>

          {/* Canvas del slide */}
          <div style={s.canvasWrapper}>
            {activeSlide && (
              <SlideCanvas
                slide={activeSlide}
                theme={presentation?.theme}
                background={presentation?.background}
                readonly
              />
            )}
          </div>

          {/* Controles de navegación */}
          <button
            style={{ ...s.navBtn, ...s.navBtnLeft, opacity: isFirst ? 0.2 : 1 }}
            onClick={goPrev}
            disabled={isFirst}
            aria-label="Slide anterior"
          >
            ‹
          </button>
          <button
            style={{ ...s.navBtn, ...s.navBtnRight, opacity: isLast ? 0.2 : 1 }}
            onClick={goNext}
            disabled={isLast}
            aria-label="Siguiente slide"
          >
            ›
          </button>

          {/* Contador de slides */}
          <div style={s.counter}>
            {activeIndex + 1} / {slides.length}
          </div>

          {/* Miniaturas de navegación rápida */}
          <div style={s.thumbnails}>
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                style={{
                  ...s.dot,
                  background: i === activeIndex
                    ? 'var(--color-primary)'
                    : 'var(--color-border)',
                  width: i === activeIndex ? '20px' : '8px',
                }}
                aria-label={`Ir al slide ${i + 1}`}
              />
            ))}
          </div>

        </div>

        {/* Panel de notas del orador — aparece solo si showNotes */}
        {showNotes && (
          <div style={s.notesPanel}>
            <div style={s.notesHeader}>
              <span style={s.notesLabel}>📝 Notas del orador — Slide {activeIndex + 1}</span>
            </div>
            <div style={s.notesBody}>
              {activeSlide?.speaker_notes
                ? <p style={s.notesText}>{activeSlide.speaker_notes}</p>
                : <p style={s.notesEmpty}>Sin notas para este slide.</p>
              }
            </div>
          </div>
        )}

      </div>

      {/* Atajos visibles */}
      <div style={s.shortcuts}>
        <span>← → Navegar</span>
        <span>N Notas</span>
        <span>F Pantalla completa</span>
        <span>Esc Salir</span>
      </div>

    </div>
  )
}

// ── Skeleton ──
function PresenterSkeleton() {
  return (
    <div style={{ ...s.page, background: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#ffffff44', fontSize: '14px' }}>Cargando presentación...</div>
    </div>
  )
}

// ── Estilos ──
const s = {
  page: {
    height:        '100vh',
    display:       'flex',
    flexDirection: 'column',
    background:    'transparent',
    overflow:      'hidden',
    userSelect:    'none',
  },
  topBar: {
    height:         '52px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '0 16px',
    background:     'rgba(0,0,0,0.6)',
    borderBottom:   '1px solid rgba(255,255,255,0.07)',
    flexShrink:     0,
    zIndex:         10,
  },
  topLeft: {
    display:    'flex',
    alignItems: 'center',
    gap:        '16px',
    minWidth:   0,
  },
  presTitle: {
    fontSize:     '14px',
    fontWeight:   '500',
    color:        'rgba(255,255,255,0.6)',
    overflow:     'hidden',
    textOverflow: 'ellipsis',
    whiteSpace:   'nowrap',
  },
  topRight: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
    flexShrink: 0,
  },
  iconBtn: {
    background:   'rgba(255,255,255,0.06)',
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--radius-sm)',
    color:        'rgba(255,255,255,0.6)',
    fontSize:     '16px',
    cursor:       'pointer',
    padding:      '5px 10px',
    transition:   'background 0.15s',
  },
  iconBtnActive: {
    background:  'rgba(124,92,252,0.25)',
    borderColor: 'rgba(124,92,252,0.5)',
    color:       'var(--color-primary)',
  },
  progressBar: {
    height:     '3px',
    background: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  progressFill: {
    height:     '100%',
    background: 'var(--color-primary)',
    transition: 'width 0.35s ease',
  },
  body: {
    flex:     1,
    display:  'grid',
    overflow: 'hidden',
    transition: 'grid-template-rows 0.25s ease',
  },
  slideZone: {
    position:       'relative',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    overflow:       'hidden',
    padding:        '32px 80px',
  },
  canvasWrapper: {
    width:     '100%',
    maxWidth:  '1000px',
    boxShadow: '0 0 80px rgba(0,0,0,0.8)',
  },
  navBtn: {
    position:   'absolute',
    top:        '50%',
    transform:  'translateY(-50%)',
    background: 'rgba(255,255,255,0.05)',
    border:     '1px solid rgba(255,255,255,0.1)',
    borderRadius:'50%',
    color:      '#fff',
    fontSize:   '28px',
    width:      '48px',
    height:     '48px',
    cursor:     'pointer',
    display:    'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s, opacity 0.2s',
    lineHeight: 1,
  },
  navBtnLeft:  { left:  '16px' },
  navBtnRight: { right: '16px' },
  counter: {
    position:  'absolute',
    bottom:    '48px',
    left:      '50%',
    transform: 'translateX(-50%)',
    fontSize:  '13px',
    color:     'rgba(255,255,255,0.35)',
  },
  thumbnails: {
    position:   'absolute',
    bottom:     '16px',
    left:       '50%',
    transform:  'translateX(-50%)',
    display:    'flex',
    alignItems: 'center',
    gap:        '6px',
  },
  dot: {
    height:       '8px',
    borderRadius: '4px',
    border:       'none',
    cursor:       'pointer',
    padding:      0,
    transition:   'width 0.2s, background 0.2s',
  },
  notesPanel: {
    background:  'rgba(0,0,0,0.5)',
    borderTop:   '1px solid rgba(255,255,255,0.08)',
    display:     'flex',
    flexDirection:'column',
    overflow:    'hidden',
  },
  notesHeader: {
    padding:     '10px 20px',
    borderBottom:'1px solid rgba(255,255,255,0.06)',
    flexShrink:  0,
  },
  notesLabel: {
    fontSize:   '11px',
    fontWeight: '600',
    color:      'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  notesBody: {
    flex:     1,
    padding:  '16px 20px',
    overflowY:'auto',
  },
  notesText: {
    fontSize:   '15px',
    color:      'rgba(255,255,255,0.75)',
    lineHeight: '1.7',
  },
  notesEmpty: {
    fontSize: '13px',
    color:    'rgba(255,255,255,0.25)',
    fontStyle:'italic',
  },
  shortcuts: {
    display:        'flex',
    justifyContent: 'center',
    gap:            '24px',
    padding:        '8px',
    fontSize:       '11px',
    color:          'rgba(255,255,255,0.2)',
    background:     'rgba(0,0,0,0.3)',
    flexShrink:     0,
  },
  centered: {
    height:         '100vh',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
  },
}
