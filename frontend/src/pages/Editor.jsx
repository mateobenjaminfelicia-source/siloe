// ================================================
//  SILOÉ — Página: Editor
//
//  Layout base del editor de presentaciones.
//  Esta página orquesta tres zonas:
//    - Toolbar:      acciones globales (guardar, presentar, etc.)
//    - SlidePanel:   lista de slides a la izquierda
//    - Canvas:       zona central donde se ve y edita el slide activo
//    - AIPanel:      panel derecho de edición con IA (por implementar)
//
//  Estado central:
//    presentation   → datos completos traídos de la API
//    slides         → array de slides (se edita localmente antes de guardar)
//    activeIndex    → índice del slide activo en el canvas
//    isDirty        → hay cambios sin guardar (muestra aviso)
//    saving         → petición de guardado en curso
// ================================================

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate }           from 'react-router-dom'
import { presentationsAPI }                 from '../services/api'
import EditorToolbar                        from '../components/Editor/EditorToolbar'
import SlidePanel                           from '../components/Editor/SlidePanel'
import SlideCanvas                          from '../components/Editor/SlideCanvas'
import AIPanel                              from '../components/Editor/AIPanel'
import Button                               from '../components/UI/Button'

export default function EditorPage() {
  const { id }   = useParams()   // ID de la presentación en la URL
  const navigate = useNavigate()

  // ── Estado principal ──
  const [presentation, setPresentation] = useState(null)
  const [slides,       setSlides]       = useState([])
  const [activeIndex,  setActiveIndex]  = useState(0)
  const [isDirty,      setIsDirty]      = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  // ── Carga de la presentación ──
  useEffect(() => {
    if (!id) return
    loadPresentation()
  }, [id])

  async function loadPresentation() {
    try {
      setLoading(true)
      setError('')
      const response = await presentationsAPI.getById(id)
      setPresentation(response.data)
      setSlides(response.data.slides || [])
    } catch (err) {
      setError('No se pudo cargar la presentación.')
    } finally {
      setLoading(false)
    }
  }

  // ── Guardar cambios ──
  // useCallback evita que esta función se recree en cada render,
  // importante porque la pasamos como prop a componentes hijos.
  const handleSave = useCallback(async () => {
    if (!isDirty) return
    try {
      setSaving(true)
      await presentationsAPI.update(id, { slides })
      setIsDirty(false)
    } catch {
      alert('Error al guardar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }, [id, slides, isDirty])

  // Guardado automático con Ctrl+S
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave])

  // ── Actualizar un slide ──
  // Recibe el índice y los campos a modificar.
  // El spread (...slide, ...changes) preserva los campos
  // que no se están editando.
  function updateSlide(index, changes) {
    setSlides(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...changes }
      return updated
    })
    setIsDirty(true)
  }

  // ── Reordenar slides ──
  function moveSlide(fromIndex, toIndex) {
    setSlides(prev => {
      const updated = [...prev]
      const [moved]  = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })
    setActiveIndex(toIndex)
    setIsDirty(true)
  }

  // ── Render: estados de carga y error ──
  if (loading) return <EditorSkeleton />
  if (error)   return (
    <div style={s.centered}>
      <p style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>⚠️ {error}</p>
      <Button variant="secondary" onClick={() => navigate('/dashboard')}>
        Volver al Dashboard
      </Button>
    </div>
  )

  const activeSlide = slides[activeIndex]

  return (
    <div style={s.page}>

      {/* ── Toolbar superior ── */}
      <EditorToolbar
        title={presentation?.title}
        isDirty={isDirty}
        saving={saving}
        onSave={handleSave}
        onPresent={() => navigate(`/present/${id}`)}
        onBack={() => navigate('/dashboard')}
      />

      {/* ── Cuerpo del editor ── */}
      <div style={s.body}>

        {/* Panel izquierdo: lista de slides */}
        <SlidePanel
          slides={slides}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          onMove={moveSlide}
        />

        {/* Canvas central: slide activo */}
        <main style={s.canvas}>
          {activeSlide ? (
            <SlideCanvas
              slide={activeSlide}
              theme={presentation?.theme}
              onUpdate={(changes) => updateSlide(activeIndex, changes)}
            />
          ) : (
            <p style={{ color: 'var(--color-text-muted)' }}>
              Sin slides disponibles.
            </p>
          )}
        </main>

        {/* Panel derecho: IA inline */}
        <AIPanel
          slide={activeSlide}
          onUpdate={(changes) => updateSlide(activeIndex, changes)}
          presentationId={id}
        />

      </div>

      {/* Aviso de cambios sin guardar */}
      {isDirty && (
        <div style={s.dirtyBanner}>
          <span>Tenés cambios sin guardar</span>
          <Button size="sm" onClick={handleSave} loading={saving}>
            Guardar ahora
          </Button>
        </div>
      )}

    </div>
  )
}

// ── Skeleton del Editor ──
// Se muestra mientras carga la presentación.
// Replica las tres zonas del layout real.
function EditorSkeleton() {
  return (
    <div style={{ ...s.page, pointerEvents: 'none' }}>
      <div style={{ ...s.toolbar, background: 'var(--color-bg-card)' }} />
      <div style={s.body}>
        <div style={{ ...s.slidePanel, background: 'var(--color-bg-card)' }} />
        <div style={{ ...s.canvas,    background: 'var(--color-bg-secondary)' }} />
        <div style={{ ...s.aiPanel,   background: 'var(--color-bg-card)' }} />
      </div>
      <style>{`@keyframes shimmer{0%{opacity:.4}50%{opacity:.7}100%{opacity:.4}}`}</style>
    </div>
  )
}

// ── Estilos ──
const TOOLBAR_H   = '56px'
const PANEL_W     = '220px'
const AI_PANEL_W  = '280px'

const s = {
  page: {
    height:        '100vh',
    display:       'flex',
    flexDirection: 'column',
    background:    'transparent',
    overflow:      'hidden',   // el scroll lo manejan las zonas internas
  },
  toolbar: {
    height:     TOOLBAR_H,
    flexShrink: 0,
  },
  body: {
    flex:     1,
    display:  'grid',
    // Tres columnas: panel slides | canvas | panel IA
    gridTemplateColumns: `${PANEL_W} 1fr ${AI_PANEL_W}`,
    overflow: 'hidden',
  },
  slidePanel: {
    borderRight: '1px solid var(--color-border)',
    overflowY:   'auto',
  },
  canvas: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    background:     'var(--color-bg-secondary)',
    overflowY:      'auto',
    padding:        '32px',
  },
  slidePreview: {
    width:        '100%',
    maxWidth:     '800px',
    aspectRatio:  '16/9',
    background:   'var(--color-bg-card)',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    display:      'flex',
    flexDirection:'column',
    alignItems:   'center',
    justifyContent:'center',
    padding:      '32px',
    boxShadow:    'var(--shadow-lg)',
  },
  aiPanel: {
    borderLeft: '1px solid var(--color-border)',
    overflowY:  'auto',
  },
  centered: {
    height:         '100vh',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
  },
  dirtyBanner: {
    position:       'fixed',
    bottom:         '24px',
    left:           '50%',
    transform:      'translateX(-50%)',
    background:     'var(--color-bg-card)',
    border:         '1px solid var(--color-border)',
    borderRadius:   'var(--radius-lg)',
    padding:        '10px 16px',
    display:        'flex',
    alignItems:     'center',
    gap:            '12px',
    boxShadow:      'var(--shadow-lg)',
    fontSize:       '13px',
    color:          'var(--color-text-muted)',
    zIndex:         50,
  },
}
