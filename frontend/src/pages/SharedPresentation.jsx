// ================================================
//  SILOÉ — Página: SharedPresentation
//  Vista pública de una presentación compartida por link.
//  URL: /share/:token
//
//  Casos que maneja:
//    1. Link normal → carga y muestra la presentación
//    2. Link con contraseña → pide la clave antes de mostrar
//    3. Presentación no encontrada → 404 amigable
//    4. Link expirado o inválido → mensaje claro
//
//  No requiere autenticación.
//  Incluye CTA para que el visitante se registre en Siloé.
// ================================================

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link }      from 'react-router-dom'
import { presentationsAPI }                  from '../services/api'
import SlideCanvas                           from '../components/Editor/SlideCanvas'
import Button                                from '../components/UI/Button'
import Input                                 from '../components/UI/Input'

export default function SharedPresentationPage() {
  const { token }  = useParams()
  const navigate   = useNavigate()

  // ── Estado de carga ──
  const [presentation, setPresentation] = useState(null)
  const [slides,       setSlides]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  // ── Estado de contraseña ──
  const [needsPassword,  setNeedsPassword]  = useState(false)
  const [password,       setPassword]       = useState('')
  const [passwordError,  setPasswordError]  = useState('')
  const [checkingPass,   setCheckingPass]   = useState(false)

  // ── Estado de navegación ──
  const [activeIndex, setActiveIndex] = useState(0)

  // ── Carga inicial ──
  useEffect(() => {
    loadPresentation()
  }, [token])

  async function loadPresentation(pwd = '') {
    try {
      setLoading(true)
      setError('')

      const response = await presentationsAPI.getByToken(token, pwd || undefined)
      setPresentation(response.data)
      setSlides(response.data.slides || [])
      setNeedsPassword(false)

    } catch (err) {
      const status = err.response?.status

      if (status === 401) {
        // El backend indica que necesita contraseña
        setNeedsPassword(true)
      } else if (status === 403) {
        setPasswordError('Contraseña incorrecta.')
        setCheckingPass(false)
        return
      } else if (status === 404) {
        setError('not_found')
      } else {
        setError('generic')
      }
    } finally {
      setLoading(false)
      setCheckingPass(false)
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    if (!password.trim()) return
    setCheckingPass(true)
    setPasswordError('')
    await loadPresentation(password)
  }

  // ── Navegación entre slides ──
  const goNext = useCallback(() => {
    setActiveIndex(i => Math.min(i + 1, slides.length - 1))
  }, [slides.length])

  const goPrev = useCallback(() => {
    setActiveIndex(i => Math.max(i - 1, 0))
  }, [])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft')                    { e.preventDefault(); goPrev() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goNext, goPrev])

  // ── Render: cargando ──
  if (loading && !needsPassword) return <SharedSkeleton />

  // ── Render: necesita contraseña ──
  if (needsPassword) return (
    <div style={s.centered}>
      <div style={s.passwordCard}>
        <span style={{ fontSize: '32px' }}>🔒</span>
        <h2 style={s.passwordTitle}>Presentación protegida</h2>
        <p style={s.passwordSubtitle}>
          El creador protegió esta presentación con contraseña.
        </p>
        <form onSubmit={handlePasswordSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            label="Contraseña"
            type="password"
            icon="🔑"
            value={password}
            onChange={e => { setPassword(e.target.value); setPasswordError('') }}
            error={passwordError}
            placeholder="Ingresá la contraseña"
            required
          />
          <Button type="submit" loading={checkingPass} style={{ width: '100%' }}>
            Ver presentación
          </Button>
        </form>
      </div>
    </div>
  )

  // ── Render: no encontrada ──
  if (error === 'not_found') return (
    <div style={s.centered}>
      <span style={{ fontSize: '48px' }}>🔗</span>
      <h2 style={{ color: 'var(--color-text)', fontSize: '22px', fontWeight: '600' }}>
        Link no válido
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', textAlign: 'center', maxWidth: '320px' }}>
        Esta presentación no existe o el link fue desactivado por su creador.
      </p>
      <Button onClick={() => navigate('/')}>Ir al inicio</Button>
    </div>
  )

  // ── Render: error genérico ──
  if (error) return (
    <div style={s.centered}>
      <p style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>
        ⚠️ No se pudo cargar la presentación.
      </p>
      <Button variant="secondary" onClick={() => loadPresentation()}>
        Reintentar
      </Button>
    </div>
  )

  const activeSlide = slides[activeIndex]
  const isFirst     = activeIndex === 0
  const isLast      = activeIndex === slides.length - 1
  const progress    = slides.length > 1 ? (activeIndex / (slides.length - 1)) * 100 : 100

  return (
    <div style={s.page}>

      {/* ── Barra superior ── */}
      <header style={s.topBar}>
        <Link to="/" style={s.logo}>Siloé</Link>
        <span style={s.presTitle}>{presentation?.title}</span>
        <div style={s.topRight}>
          {/* Crédito al creador */}
          {presentation?.author_name && (
            <span style={s.author}>por {presentation.author_name}</span>
          )}
          <Link to="/register">
            <Button size="sm">Crear presentación gratis →</Button>
          </Link>
        </div>
      </header>

      {/* Barra de progreso */}
      <div style={s.progressBar}>
        <div style={{ ...s.progressFill, width: `${progress}%` }} />
      </div>

      {/* ── Zona de slides ── */}
      <div style={s.slideZone}>

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

        {/* Navegación */}
        <button
          style={{ ...s.navBtn, left: '16px', opacity: isFirst ? 0.2 : 1 }}
          onClick={goPrev}
          disabled={isFirst}
          aria-label="Slide anterior"
        >‹</button>
        <button
          style={{ ...s.navBtn, right: '16px', opacity: isLast ? 0.2 : 1 }}
          onClick={goNext}
          disabled={isLast}
          aria-label="Siguiente slide"
        >›</button>

        {/* Contador */}
        <div style={s.counter}>{activeIndex + 1} / {slides.length}</div>

        {/* Dots */}
        <div style={s.dots}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              style={{
                ...s.dot,
                width:      i === activeIndex ? '20px' : '8px',
                background: i === activeIndex ? 'var(--color-primary)' : 'var(--color-border)',
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

      </div>

      {/* ── CTA final ── */}
      <div style={s.ctaBanner}>
        <span style={s.ctaText}>
          ¿Te gustó? Creá tus propias presentaciones con IA en Siloé — gratis.
        </span>
        <Link to="/register">
          <Button size="sm">Empezar gratis →</Button>
        </Link>
      </div>

    </div>
  )
}

function SharedSkeleton() {
  return (
    <div style={{ height: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#ffffff33', fontSize: '14px' }}>Cargando presentación...</p>
    </div>
  )
}

const s = {
  page: {
    minHeight:     '100vh',
    background:    'transparent',
    display:       'flex',
    flexDirection: 'column',
  },
  topBar: {
    height:         '56px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '0 24px',
    background:     'rgba(0,0,0,0.5)',
    borderBottom:   '1px solid rgba(255,255,255,0.07)',
    gap:            '16px',
    flexShrink:     0,
  },
  logo: {
    textDecoration: 'none',
    fontWeight:     '700',
    fontSize:       '18px',
    color:          'var(--color-primary)',
    flexShrink:     0,
  },
  presTitle: {
    fontSize:     '14px',
    fontWeight:   '500',
    color:        'rgba(255,255,255,0.5)',
    overflow:     'hidden',
    textOverflow: 'ellipsis',
    whiteSpace:   'nowrap',
    flex:         1,
    textAlign:    'center',
  },
  topRight: {
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
    flexShrink: 0,
  },
  author: {
    fontSize: '13px',
    color:    'rgba(255,255,255,0.35)',
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
  slideZone: {
    flex:           1,
    position:       'relative',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '32px 80px',
  },
  canvasWrapper: {
    width:     '100%',
    maxWidth:  '960px',
    boxShadow: '0 0 80px rgba(0,0,0,0.8)',
  },
  navBtn: {
    position:       'absolute',
    top:            '50%',
    transform:      'translateY(-50%)',
    background:     'rgba(255,255,255,0.05)',
    border:         '1px solid rgba(255,255,255,0.1)',
    borderRadius:   '50%',
    color:          '#fff',
    fontSize:       '28px',
    width:          '48px',
    height:         '48px',
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    transition:     'opacity 0.2s',
  },
  counter: {
    position:  'absolute',
    bottom:    '48px',
    left:      '50%',
    transform: 'translateX(-50%)',
    fontSize:  '13px',
    color:     'rgba(255,255,255,0.3)',
  },
  dots: {
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
  ctaBanner: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '16px',
    padding:        '14px 24px',
    background:     'rgba(124,92,252,0.12)',
    borderTop:      '1px solid rgba(124,92,252,0.2)',
    flexWrap:       'wrap',
    flexShrink:     0,
  },
  ctaText: {
    fontSize: '14px',
    color:    'rgba(255,255,255,0.6)',
  },
  centered: {
    minHeight:      '100vh',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '16px',
    background: 'transparent',
    padding:        '24px',
  },
  passwordCard: {
    width:         '100%',
    maxWidth:      '380px',
    background:    'var(--color-bg-card)',
    border:        '1px solid var(--color-border)',
    borderRadius:  'var(--radius-xl)',
    padding:       '36px',
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           '16px',
    boxShadow:     'var(--shadow-lg)',
  },
  passwordTitle: {
    fontSize:   '18px',
    fontWeight: '600',
    color:      'var(--color-text)',
  },
  passwordSubtitle: {
    fontSize:  '14px',
    color:     'var(--color-text-muted)',
    textAlign: 'center',
  },
}
