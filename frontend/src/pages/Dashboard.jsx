// ================================================
//  SILOÉ — Página: Dashboard
//
//  Pantalla principal del usuario autenticado.
//  Responsabilidades:
//    1. Cargar las presentaciones del usuario desde la API
//    2. Cargar los créditos disponibles
//    3. Mostrar el prompt de generación con IA
//    4. Renderizar la grilla de presentaciones
//    5. Manejar publicar y eliminar desde las cards
//
//  Estados posibles de la carga:
//    loading → muestra skeleton
//    error   → muestra mensaje con botón de reintentar
//    vacío   → muestra estado vacío con CTA
//    con data → muestra la grilla
// ================================================

import { useState, useEffect }     from 'react'
import { useNavigate }             from 'react-router-dom'
import { presentationsAPI, usersAPI } from '../services/api'
import Navbar           from '../components/UI/Navbar'
import PresentationCard from '../components/UI/PresentationCard'
import Button           from '../components/UI/Button'
import GeneratingOverlay from '../components/UI/GeneratingOverlay'

export default function DashboardPage() {
  const navigate = useNavigate()

  // ── Estado principal ──
  const [presentations, setPresentations] = useState([])
  const [credits,       setCredits]       = useState(0)
  const [userName,      setUserName]      = useState('')
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')

  // ── Estado del prompt de generación ──
  const [prompt,     setPrompt]     = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError,   setGenError]   = useState('')

  // ── Carga inicial ──
  // useEffect con array vacío [] = se ejecuta una sola vez
  // cuando el componente se monta. Equivale a componentDidMount.
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      // Llamadas en paralelo — Promise.all espera que ambas terminen
      // antes de actualizar el estado. Más eficiente que hacerlas en serie.
      const [presResponse, creditsResponse] = await Promise.all([
        presentationsAPI.getAll(),
        usersAPI.getCredits(),
      ])

      setPresentations(presResponse.data)
      setCredits(creditsResponse.data.balance)
      setUserName(creditsResponse.data.name || '')

    } catch (err) {
      setError('No se pudo cargar tu información. Revisá tu conexión.')
    } finally {
      setLoading(false)
    }
  }

  // ── Generar presentación con IA ──
  async function handleGenerate(e) {
    e.preventDefault()
    if (!prompt.trim()) return
    if (credits < 1) {
      setGenError('Sin créditos suficientes. Publicá una presentación o hacé una donación para obtener más.')
      return
    }

    try {
      setGenerating(true)
      setGenError('')
      const response = await presentationsAPI.generate({ prompt: prompt.trim() })
      // El backend devuelve la presentación creada con su ID
      // Navegamos directo al editor para que el usuario la vea y edite
      navigate(`/editor/${response.data.id}`)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al generar. Intentá de nuevo.'
      setGenError(msg)
      setGenerating(false)
    }
  }

  // ── Eliminar presentación ──
  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar esta presentación? Esta acción no se puede deshacer.')) return
    try {
      await presentationsAPI.delete(id)
      // Actualizar la lista local sin recargar todo desde la API
      setPresentations(prev => prev.filter(p => p.id !== id))
    } catch {
      alert('No se pudo eliminar. Intentá de nuevo.')
    }
  }

  // ── Publicar en comunidad ──
  async function handlePublish(id) {
    try {
      await presentationsAPI.publish(id)
      // Marcarla como publicada en el estado local y sumar créditos
      setPresentations(prev =>
        prev.map(p => p.id === id ? { ...p, is_published: true } : p)
      )
      setCredits(prev => prev + 3) // +3 créditos por publicar
    } catch {
      alert('No se pudo publicar. Intentá de nuevo.')
    }
  }

  // ── Render ──
  return (
    <div style={s.page}>
      <Navbar
        credits={credits}
        userName={userName}
      />

      <main style={s.main}>

        {/* ── Sección: Generador de IA ── */}
        <section style={s.generatorSection}>
          <h1 style={s.generatorTitle}>
            ¿Qué presentación vas a crear hoy?
          </h1>
          <p style={s.generatorSubtitle}>
            Describí el tema y la IA arma la estructura, el contenido y el diseño.
          </p>

          <form onSubmit={handleGenerate} style={s.generatorForm}>
            <div style={s.inputWrapper}>
              <textarea
                value={prompt}
                onChange={e => {
                  setPrompt(e.target.value)
                  if (genError) setGenError('')
                }}
                placeholder="Ej: Presentación sobre inteligencia artificial para estudiantes universitarios, tono accesible, 10 slides..."
                rows={3}
                disabled={generating}
                style={s.textarea}
              />
              <div style={s.formFooter}>
                {genError && (
                  <span style={s.genError}>⚠️ {genError}</span>
                )}
                <div style={s.formFooterRight}>
                  <span style={s.creditCost}>
                    ⚡ Cuesta 1 crédito · Tenés {credits}
                  </span>
                  <Button
                    type="submit"
                    loading={generating}
                    disabled={!prompt.trim() || credits < 1}
                    size="md"
                  >
                    {generating ? 'Generando...' : '✨ Generar con IA'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </section>

        {/* ── Sección: Mis presentaciones ── */}
        <section>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>Mis presentaciones</h2>
            {!loading && presentations.length > 0 && (
              <span style={s.count}>{presentations.length} en total</span>
            )}
          </div>

          {/* Estado: cargando */}
          {loading && (
            <div style={s.grid}>
              {[1, 2, 3, 4].map(i => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Estado: error */}
          {!loading && error && (
            <div style={s.errorBox}>
              <p style={{ color: 'var(--color-danger)', marginBottom: '12px' }}>
                ⚠️ {error}
              </p>
              <Button variant="secondary" onClick={loadData}>
                Reintentar
              </Button>
            </div>
          )}

          {/* Estado: sin presentaciones */}
          {!loading && !error && presentations.length === 0 && (
            <div style={s.emptyState}>
              <span style={{ fontSize: '48px' }}>🗂️</span>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '16px' }}>
                Todavía no tenés presentaciones.
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                Escribí un tema arriba y la IA se encarga del resto.
              </p>
            </div>
          )}

          {/* Estado: con presentaciones */}
          {!loading && !error && presentations.length > 0 && (
            <div style={s.grid}>
              {presentations.map(p => (
                <PresentationCard
                  key={p.id}
                  presentation={p}
                  mode="own"
                  onDelete={handleDelete}
                  onPublish={handlePublish}
                />
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Pantalla de carga mientras la IA genera la presentación */}
      {generating && <GeneratingOverlay mode="content" />}
    </div>
  )
}

// ── Skeleton Card ──
// Placeholder animado mientras cargan los datos reales.
// Mismo tamaño que una PresentationCard para evitar el
// efecto de "salto" de layout cuando llegan los datos.
function SkeletonCard() {
  return (
    <div style={{
      background:    'var(--color-bg-card)',
      border:        '1px solid var(--color-border)',
      borderRadius:  'var(--radius-lg)',
      overflow:      'hidden',
      height:        '180px',
    }}>
      <div style={{ height: '5px', background: 'var(--color-border)' }} />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={skeleton(140, 16)} />
        <div style={skeleton(80, 11)}  />
        <div style={skeleton('100%', 11)} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <div style={skeleton('50%', 32)} />
          <div style={skeleton('50%', 32)} />
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0%   { opacity: 0.4; }
          50%  { opacity: 0.8; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

// Helper para generar estilos de skeleton consistentes
function skeleton(width, height) {
  return {
    width,
    height:       `${height}px`,
    background:   'var(--color-border)',
    borderRadius: '4px',
    animation:    'shimmer 1.4s ease-in-out infinite',
  }
}

// ── Estilos ──
const s = {
  page: {
    minHeight:     '100vh',
    background:    'transparent',
    display:       'flex',
    flexDirection: 'column',
  },
  main: {
    maxWidth: '1100px',
    width:    '100%',
    margin:   '0 auto',
    padding:  '32px 24px 64px',
    display:  'flex',
    flexDirection: 'column',
    gap:      '48px',
  },
  generatorSection: {
    textAlign: 'center',
    display:   'flex',
    flexDirection: 'column',
    gap:       '12px',
  },
  generatorTitle: {
    fontSize:   '28px',
    fontWeight: '700',
    color:      'var(--color-text)',
  },
  generatorSubtitle: {
    color:    'var(--color-text-muted)',
    fontSize: '15px',
  },
  generatorForm: {
    maxWidth: '700px',
    margin:   '0 auto',
    width:    '100%',
  },
  inputWrapper: {
    background:    'var(--color-bg-card)',
    border:        '1px solid var(--color-border)',
    borderRadius:  'var(--radius-xl)',
    overflow:      'hidden',
    boxShadow:     'var(--shadow-md)',
  },
  textarea: {
    width:       '100%',
    padding:     '20px',
    background:  'transparent',
    border:      'none',
    color:       'var(--color-text)',
    fontSize:    '15px',
    resize:      'none',
    outline:     'none',
    lineHeight:  '1.6',
  },
  formFooter: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '12px 16px',
    borderTop:      '1px solid var(--color-border)',
    flexWrap:       'wrap',
    gap:            '8px',
  },
  formFooterRight: {
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
    marginLeft: 'auto',
  },
  creditCost: {
    fontSize: '12px',
    color:    'var(--color-text-muted)',
  },
  genError: {
    fontSize: '13px',
    color:    'var(--color-danger)',
  },
  sectionHeader: {
    display:     'flex',
    alignItems:  'baseline',
    gap:         '12px',
    marginBottom:'20px',
  },
  sectionTitle: {
    fontSize:   '18px',
    fontWeight: '600',
    color:      'var(--color-text)',
  },
  count: {
    fontSize: '13px',
    color:    'var(--color-text-muted)',
  },
  grid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap:                 '16px',
  },
  errorBox: {
    textAlign: 'center',
    padding:   '40px',
  },
  emptyState: {
    textAlign: 'center',
    padding:   '64px 24px',
    display:   'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap:        '12px',
  },
}
