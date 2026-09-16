// ================================================
//  SILOÉ — Componente: AIPanel
//  Panel derecho del editor. Permite editar el
//  slide activo usando instrucciones en lenguaje
//  natural enviadas a la IA.
//
//  Responsabilidades:
//    1. Sugerencias rápidas (chips de acción común)
//    2. Input de instrucción libre
//    3. Llamada al backend para edición IA del slide
//    4. Historial de ediciones IA de esta sesión
//    5. Edición de notas del orador
//
//  Flujo de edición IA:
//    Usuario escribe instrucción
//      → se envía al backend con el contenido actual del slide
//      → el backend llama a la IA
//      → la IA devuelve el slide modificado como JSON
//      → onUpdate aplica los cambios en el canvas
//
//  Props:
//    slide:        slide activo completo
//    onUpdate:     fn(changes) — igual que en SlideCanvas
//    presentationId: para identificar la presentación en la API
// ================================================

import { useState, useRef } from 'react'
import Button               from '../UI/Button'
import api                  from '../../services/api'

// Sugerencias rápidas — las más frecuentes para no tener que escribir
const QUICK_ACTIONS = [
  { label: '✂️ Más corto',       prompt: 'Hacé el contenido más conciso, sin perder el mensaje principal.' },
  { label: '📖 Más detallado',   prompt: 'Expandí el contenido con más detalle y ejemplos.' },
  { label: '🎯 Más formal',      prompt: 'Cambiá el tono a uno más formal y profesional.' },
  { label: '😊 Más accesible',   prompt: 'Simplificá el lenguaje para que sea más fácil de entender.' },
  { label: '📊 Agregá datos',    prompt: 'Incorporá estadísticas o datos relevantes que refuercen el contenido.' },
  { label: '💡 Agregá ejemplos', prompt: 'Añadí ejemplos concretos que ilustren los puntos clave.' },
  { label: '🔄 Reescribir',      prompt: 'Reescribí el contenido completo manteniendo el tema pero con enfoque diferente.' },
  { label: '🌍 Traducir a inglés', prompt: 'Traducí todo el contenido al inglés.' },
]

export default function AIPanel({ slide, onUpdate, presentationId }) {
  const [instruction, setInstruction] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [history,     setHistory]     = useState([])  // historial de la sesión
  const [activeTab,   setActiveTab]   = useState('ia') // 'ia' | 'notes'

  const textareaRef = useRef(null)

  // ── Aplicar sugerencia rápida ──
  // Pone el texto en el input y hace foco,
  // el usuario puede modificarlo antes de enviar
  function applyQuickAction(prompt) {
    setInstruction(prompt)
    setError('')
    textareaRef.current?.focus()
  }

  // ── Enviar instrucción a la IA ──
  async function handleSubmit(e) {
    e?.preventDefault()
    if (!instruction.trim() || loading) return

    const instructionText = instruction.trim()

    try {
      setLoading(true)
      setError('')

      // Enviamos al backend:
      //   - La instrucción del usuario
      //   - El contenido actual del slide (para que la IA sepa qué modificar)
      //   - El ID de la presentación (para contexto general)
      //
      // TODO: este endpoint lo implementa Mateo en el backend.
      // El backend llama a ai_service con el slide y la instrucción,
      // y devuelve el slide modificado como JSON.
      const response = await api.post(
        `/presentations/${presentationId}/slides/${slide.id}/ai-edit`,
        {
          instruction: instructionText,
          current_slide: {
            slide_type:   slide.slide_type,
            title:        slide.title,
            content_json: slide.content_json,
          },
        }
      )

      const updatedSlide = response.data

      // Aplicar cambios al canvas
      onUpdate({
        title:        updatedSlide.title,
        content_json: updatedSlide.content_json,
        ai_edit_prompt: instructionText,  // guardamos el prompt usado (campo en DB)
        manually_edited: true,
      })

      // Agregar al historial de la sesión
      setHistory(prev => [
        { instruction: instructionText, timestamp: new Date() },
        ...prev,
      ].slice(0, 10)) // máximo 10 entradas en historial

      setInstruction('')

    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al procesar la instrucción. Intentá de nuevo.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Ctrl+Enter para enviar desde el textarea
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit()
    }
  }

  // ── Actualizar notas del orador ──
  function handleNotesChange(e) {
    onUpdate({ speaker_notes: e.target.value })
  }

  if (!slide) return null

  return (
    <aside style={s.panel}>

      {/* ── Tabs: IA / Notas ── */}
      <div style={s.tabs}>
        <button
          style={{ ...s.tab, ...(activeTab === 'ia'    ? s.tabActive : {}) }}
          onClick={() => setActiveTab('ia')}
        >
          ✨ IA inline
        </button>
        <button
          style={{ ...s.tab, ...(activeTab === 'notes' ? s.tabActive : {}) }}
          onClick={() => setActiveTab('notes')}
        >
          📝 Notas
        </button>
      </div>

      {/* ══════════════════════════════════
          TAB: IA INLINE
      ══════════════════════════════════ */}
      {activeTab === 'ia' && (
        <div style={s.tabContent}>

          {/* Contexto del slide activo */}
          <div style={s.slideContext}>
            <span style={s.slideTypeBadge}>{slide.slide_type}</span>
            <span style={s.slideContextTitle} title={slide.title}>
              {slide.title || 'Sin título'}
            </span>
          </div>

          {/* Sugerencias rápidas */}
          <div style={s.section}>
            <span style={s.sectionLabel}>Acciones rápidas</span>
            <div style={s.chips}>
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.label}
                  style={s.chip}
                  onClick={() => applyQuickAction(action.prompt)}
                  disabled={loading}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input de instrucción libre */}
          <div style={s.section}>
            <span style={s.sectionLabel}>Instrucción personalizada</span>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                ref={textareaRef}
                value={instruction}
                onChange={e => { setInstruction(e.target.value); setError('') }}
                onKeyDown={handleKeyDown}
                placeholder="Ej: Cambiá el tono a uno más motivador y agregá una metáfora deportiva..."
                rows={4}
                disabled={loading}
                style={s.textarea}
              />
              <div style={s.formFooter}>
                <span style={s.hint}>Ctrl+Enter para enviar</span>
                <Button
                  type="submit"
                  size="sm"
                  loading={loading}
                  disabled={!instruction.trim()}
                >
                  {loading ? 'Procesando...' : 'Aplicar'}
                </Button>
              </div>
            </form>

            {error && (
              <div style={s.errorBox}>⚠️ {error}</div>
            )}
          </div>

          {/* Historial de la sesión */}
          {history.length > 0 && (
            <div style={s.section}>
              <span style={s.sectionLabel}>Historial de esta sesión</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {history.map((entry, i) => (
                  <div key={i} style={s.historyEntry}>
                    <span style={s.historyText}>{entry.instruction}</span>
                    <span style={s.historyTime}>
                      {entry.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ══════════════════════════════════
          TAB: NOTAS DEL ORADOR
      ══════════════════════════════════ */}
      {activeTab === 'notes' && (
        <div style={s.tabContent}>
          <div style={s.section}>
            <span style={s.sectionLabel}>Notas del orador</span>
            <p style={s.notesHint}>
              Estas notas son solo para vos. Se muestran en el modo presentador pero no en la presentación pública.
            </p>
            <textarea
              value={slide.speaker_notes || ''}
              onChange={handleNotesChange}
              placeholder="Escribí acá tus notas para este slide..."
              rows={12}
              style={{ ...s.textarea, resize: 'vertical' }}
            />
          </div>
        </div>
      )}

    </aside>
  )
}

const s = {
  panel: {
    display:       'flex',
    flexDirection: 'column',
    background:    'var(--color-bg-card)',
    borderLeft:    '1px solid var(--color-border)',
    overflowY:     'hidden',
    height:        '100%',
  },
  tabs: {
    display:     'flex',
    borderBottom:'1px solid var(--color-border)',
    flexShrink:  0,
  },
  tab: {
    flex:       1,
    padding:    '12px 8px',
    background: 'none',
    border:     'none',
    cursor:     'pointer',
    fontSize:   '12px',
    fontWeight: '500',
    color:      'var(--color-text-muted)',
    transition: 'color 0.15s, border-bottom 0.15s',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    color:        'var(--color-primary)',
    borderBottom: '2px solid var(--color-primary)',
  },
  tabContent: {
    flex:          1,
    overflowY:     'auto',
    display:       'flex',
    flexDirection: 'column',
    gap:           '0',
  },
  slideContext: {
    display:     'flex',
    alignItems:  'center',
    gap:         '8px',
    padding:     '12px 14px',
    background:  'var(--color-bg-secondary)',
    borderBottom:'1px solid var(--color-border)',
    flexShrink:  0,
  },
  slideTypeBadge: {
    fontSize:     '10px',
    fontWeight:   '600',
    padding:      '2px 7px',
    background:   'rgba(124,92,252,0.15)',
    color:        'var(--color-primary)',
    borderRadius: '8px',
    textTransform:'uppercase',
    flexShrink:   0,
  },
  slideContextTitle: {
    fontSize:     '12px',
    color:        'var(--color-text-muted)',
    overflow:     'hidden',
    textOverflow: 'ellipsis',
    whiteSpace:   'nowrap',
  },
  section: {
    padding:       '14px',
    borderBottom:  '1px solid var(--color-border)',
    display:       'flex',
    flexDirection: 'column',
    gap:           '10px',
  },
  sectionLabel: {
    fontSize:      '11px',
    fontWeight:    '600',
    color:         'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  chips: {
    display:  'flex',
    flexWrap: 'wrap',
    gap:      '6px',
  },
  chip: {
    padding:      '5px 10px',
    background:   'var(--color-bg-secondary)',
    border:       '1px solid var(--color-border)',
    borderRadius: '16px',
    fontSize:     '12px',
    color:        'var(--color-text)',
    cursor:       'pointer',
    transition:   'border-color 0.15s, background 0.15s',
    whiteSpace:   'nowrap',
  },
  textarea: {
    width:        '100%',
    padding:      '10px 12px',
    background:   'var(--color-bg-secondary)',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color:        'var(--color-text)',
    fontSize:     '13px',
    lineHeight:   '1.5',
    outline:      'none',
    resize:       'none',
    fontFamily:   'var(--font-sans)',
  },
  formFooter: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  hint: {
    fontSize: '11px',
    color:    'var(--color-text-muted)',
  },
  errorBox: {
    background:   'rgba(239,68,68,0.1)',
    border:       '1px solid var(--color-danger)',
    borderRadius: 'var(--radius-md)',
    padding:      '8px 12px',
    fontSize:     '12px',
    color:        'var(--color-danger)',
  },
  historyEntry: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '2px',
    padding:       '8px 10px',
    background:    'var(--color-bg-secondary)',
    borderRadius:  'var(--radius-sm)',
    border:        '1px solid var(--color-border)',
  },
  historyText: {
    fontSize:     '12px',
    color:        'var(--color-text)',
    overflow:     'hidden',
    textOverflow: 'ellipsis',
    whiteSpace:   'nowrap',
  },
  historyTime: {
    fontSize: '10px',
    color:    'var(--color-text-muted)',
  },
  notesHint: {
    fontSize:   '12px',
    color:      'var(--color-text-muted)',
    lineHeight: '1.5',
  },
}
