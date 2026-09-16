// ================================================
//  SILOÉ — Componente: SlidePanel
//  Panel lateral izquierdo del editor.
//  Muestra la lista de slides como miniaturas.
//
//  Funcionalidades:
//    - Seleccionar slide activo con clic
//    - Reordenar con botones ↑ ↓ (drag-and-drop viene después)
//    - Indicador del número de slide
//    - Badge con el tipo de slide
//
//  Props:
//    slides:      array de slides
//    activeIndex: índice del slide activo
//    onSelect:    fn(index) — cambiar slide activo
//    onMove:      fn(from, to) — reordenar
// ================================================

// Íconos simples por tipo de slide
// Representan visualmente el layout sin necesidad
// de renderizar el contenido real en la miniatura
const SLIDE_TYPE_ICON = {
  title:   '🔤',
  bullets: '📋',
  text:    '📝',
  two_col: '⬛⬛',
  quote:   '💬',
  data:    '📊',
  image:   '🖼️',
  closing: '🏁',
}

export default function SlidePanel({
  slides      = [],
  activeIndex = 0,
  onSelect,
  onMove,
}) {
  return (
    <aside style={s.panel}>

      <div style={s.header}>
        <span style={s.headerLabel}>Slides</span>
        <span style={s.headerCount}>{slides.length}</span>
      </div>

      <div style={s.list}>
        {slides.map((slide, index) => (
          <SlideThumb
            key={slide.id ?? index}
            slide={slide}
            index={index}
            isActive={index === activeIndex}
            isFirst={index === 0}
            isLast={index === slides.length - 1}
            onSelect={() => onSelect(index)}
            onMoveUp={index > 0
              ? () => onMove(index, index - 1)
              : null}
            onMoveDown={index < slides.length - 1
              ? () => onMove(index, index + 1)
              : null}
          />
        ))}
      </div>

    </aside>
  )
}

// ── SlideThumb ──
// Miniatura de un slide individual dentro del panel.
// Componente separado para mantener SlidePanel limpio
// y porque esta lógica de hover/activo es local.
function SlideThumb({ slide, index, isActive, isFirst, isLast, onSelect, onMoveUp, onMoveDown }) {
  const icon = SLIDE_TYPE_ICON[slide.slide_type] || '📄'

  return (
    <div
      style={{
        ...s.thumb,
        ...(isActive ? s.thumbActive : {}),
      }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`Slide ${index + 1}: ${slide.title || 'Sin título'}`}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
    >
      {/* Número del slide */}
      <span style={s.thumbNumber}>{index + 1}</span>

      {/* Miniatura visual — representa el tipo de slide */}
      <div style={{
        ...s.thumbPreview,
        borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
      }}>
        <span style={s.thumbIcon}>{icon}</span>
        <span style={s.thumbTitle} title={slide.title}>
          {slide.title || 'Sin título'}
        </span>
      </div>

      {/* Badge de tipo */}
      <span style={s.typeBadge}>{slide.slide_type}</span>

      {/* Controles de reordenamiento — visibles al hacer hover */}
      <div style={s.moveControls}>
        <button
          style={s.moveBtn}
          onClick={e => { e.stopPropagation(); onMoveUp?.() }}
          disabled={isFirst}
          title="Mover arriba"
          aria-label="Mover slide arriba"
        >↑</button>
        <button
          style={s.moveBtn}
          onClick={e => { e.stopPropagation(); onMoveDown?.() }}
          disabled={isLast}
          title="Mover abajo"
          aria-label="Mover slide abajo"
        >↓</button>
      </div>

    </div>
  )
}

const s = {
  panel: {
    display:       'flex',
    flexDirection: 'column',
    background:    'var(--color-bg-card)',
    borderRight:   '1px solid var(--color-border)',
    overflowY:     'auto',
    minWidth:      0,
  },
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '12px 14px',
    borderBottom:   '1px solid var(--color-border)',
    flexShrink:     0,
  },
  headerLabel: {
    fontSize:   '12px',
    fontWeight: '600',
    color:      'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  headerCount: {
    fontSize:     '11px',
    color:        'var(--color-text-muted)',
    background:   'var(--color-bg-secondary)',
    padding:      '1px 6px',
    borderRadius: '8px',
  },
  list: {
    display:       'flex',
    flexDirection: 'column',
    padding:       '8px',
    gap:           '4px',
  },
  thumb: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '5px',
    padding:       '8px',
    borderRadius:  'var(--radius-md)',
    cursor:        'pointer',
    position:      'relative',
    transition:    'background 0.15s',
    userSelect:    'none',
  },
  thumbActive: {
    background: 'rgba(124, 92, 252, 0.1)',
  },
  thumbNumber: {
    fontSize:   '10px',
    color:      'var(--color-text-muted)',
    fontWeight: '600',
  },
  thumbPreview: {
    aspectRatio:    '16/9',
    background:     'var(--color-bg-secondary)',
    borderRadius:   'var(--radius-sm)',
    border:         '1.5px solid',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '4px',
    padding:        '8px',
    transition:     'border-color 0.15s',
    overflow:       'hidden',
  },
  thumbIcon: {
    fontSize: '18px',
  },
  thumbTitle: {
    fontSize:     '9px',
    color:        'var(--color-text-muted)',
    textAlign:    'center',
    overflow:     'hidden',
    textOverflow: 'ellipsis',
    whiteSpace:   'nowrap',
    width:        '100%',
  },
  typeBadge: {
    fontSize:     '9px',
    color:        'var(--color-text-muted)',
    textAlign:    'center',
    textTransform:'uppercase',
    letterSpacing:'0.04em',
  },
  moveControls: {
    display:        'flex',
    justifyContent: 'center',
    gap:            '4px',
  },
  moveBtn: {
    background:   'none',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color:        'var(--color-text-muted)',
    fontSize:     '11px',
    cursor:       'pointer',
    padding:      '1px 6px',
    lineHeight:   1.5,
  },
}
