// ================================================
//  SILOÉ — Componente: SlideCanvas
//  Zona central del editor. Renderiza el slide
//  activo y permite edición inline de su contenido.
//
//  Estrategia de edición inline:
//  Usamos contentEditable en los elementos de texto.
//  Cuando el usuario termina de editar (onBlur),
//  se llama a onUpdate con el nuevo contenido.
//  Esto evita actualizar el estado en cada tecla,
//  lo que causaría re-renders innecesarios.
//
//  Props:
//    slide:    objeto del slide activo
//    theme:    nombre del tema ('Minimal', 'Dark Mode', etc.)
//    onUpdate: fn(changes) — actualiza el slide en Editor.jsx
// ================================================

// Paleta de colores por tema
// Cada tema define fondo, texto principal y acento
const THEMES = {
  'Minimal':    { bg: '#FFFFFF', text: '#1A1A1A', accent: '#4F46E5', muted: '#666666' },
  'Dark Mode':  { bg: '#0F0F0F', text: '#F5F5F5', accent: '#7C3AED', muted: '#AAAAAA' },
  'Corporate':  { bg: '#F8F9FA', text: '#212529', accent: '#0D6EFD', muted: '#6C757D' },
  'Creative':   { bg: '#FFF7ED', text: '#1C1917', accent: '#EA580C', muted: '#78716C' },
  'Academic':   { bg: '#F0F4F8', text: '#1A202C', accent: '#2B6CB0', muted: '#4A5568' },
}

export default function SlideCanvas({ slide, theme = 'Minimal', onUpdate, readonly = false }) {
  const colors = THEMES[theme] || THEMES['Minimal']

  if (!slide) return null

  return (
    <div style={{ ...s.canvas, background: colors.bg }}>

      {/* Franja de acento superior — identidad del tema */}
      <div style={{ ...s.accentBar, background: colors.accent }} />

      {/* Contenido del slide según su tipo */}
      <div style={s.content}>
        {renderSlideContent(slide, colors, onUpdate, readonly)}
      </div>

      {/* Número de slide — decorativo, abajo a la derecha */}
      <div style={{ ...s.slideNumber, color: colors.muted }}>
        {slide.slide_order + 1}
      </div>

    </div>
  )
}

// ── Selector de tipo ──
// Punto central que despacha al componente correcto.
// Agregar un tipo nuevo = un caso más en el switch.
function renderSlideContent(slide, colors, onUpdate, readonly) {
  const content = slide.content_json || {}

  switch (slide.slide_type) {
    case 'title':   return <TitleSlide   slide={slide} colors={colors} content={content} onUpdate={onUpdate} readonly={readonly} />
    case 'bullets': return <BulletsSlide slide={slide} colors={colors} content={content} onUpdate={onUpdate} readonly={readonly} />
    case 'text':    return <TextSlide    slide={slide} colors={colors} content={content} onUpdate={onUpdate} readonly={readonly} />
    case 'two_col': return <TwoColSlide  slide={slide} colors={colors} content={content} onUpdate={onUpdate} readonly={readonly} />
    case 'quote':   return <QuoteSlide   slide={slide} colors={colors} content={content} onUpdate={onUpdate} readonly={readonly} />
    case 'data':    return <DataSlide    slide={slide} colors={colors} content={content} onUpdate={onUpdate} readonly={readonly} />
    case 'image':   return <ImageSlide   slide={slide} colors={colors} content={content} onUpdate={onUpdate} readonly={readonly} />
    case 'closing': return <ClosingSlide slide={slide} colors={colors} content={content} onUpdate={onUpdate} readonly={readonly} />
    default:        return <p style={{ color: colors.muted }}>Tipo de slide desconocido.</p>
  }
}

// ── Componente editable inline ──
// Reutilizado por todos los tipos de slide.
// contentEditable permite editar el texto directamente
// en el elemento sin necesidad de inputs separados.
// onBlur guarda el cambio solo cuando el usuario sale del campo.
function Editable({ value, onChange, tag: Tag = 'p', style, readonly = false }) {
  return (
    <Tag
      contentEditable={!readonly}
      suppressContentEditableWarning
      onBlur={e => !readonly && onChange(e.currentTarget.textContent)}
      style={{
        outline:   'none',
        cursor:    'text',
        minWidth:  '40px',
        borderRadius: '3px',
        transition: 'background 0.15s',
        ...style,
      }}
      onFocus={e => {
        e.currentTarget.style.background = 'rgba(124,92,252,0.08)'
      }}
      onBlurCapture={e => {
        e.currentTarget.style.background = 'transparent'
      }}
      // dangerouslySetInnerHTML solo en el render inicial
      // React no re-renderiza contentEditable mientras el usuario edita
      dangerouslySetInnerHTML={{ __html: value || '' }}
    />
  )
}

// ════════════════════════════════════════════════
//  TIPOS DE SLIDE
// ════════════════════════════════════════════════

// ── Title ──
function TitleSlide({ slide, colors, content, onUpdate }) {
  return (
    <div style={{ ...layout.centered, gap: '16px' }}>
      <Editable
        tag="h1"
        value={slide.title}
        onChange={v => onUpdate({ title: v })}
        style={{ fontSize: '2.4em', fontWeight: '700', color: colors.text, textAlign: 'center', lineHeight: 1.2 }}
      />
      <Editable
        value={content.subtitle}
        onChange={v => onUpdate({ content_json: { ...content, subtitle: v } })}
        style={{ fontSize: '1.1em', color: colors.muted, textAlign: 'center' }}
      />
      {/* Línea decorativa con el color de acento */}
      <div style={{ width: '60px', height: '4px', background: colors.accent, borderRadius: '2px', marginTop: '8px' }} />
    </div>
  )
}

// ── Bullets ──
function BulletsSlide({ slide, colors, content, onUpdate }) {
  const bullets = content.bullets || []

  function updateBullet(index, value) {
    const updated = [...bullets]
    updated[index] = value
    onUpdate({ content_json: { ...content, bullets: updated } })
  }

  return (
    <div style={{ ...layout.standard, gap: '20px' }}>
      <Editable
        tag="h2"
        value={slide.title}
        onChange={v => onUpdate({ title: v })}
        style={{ fontSize: '1.6em', fontWeight: '700', color: colors.text }}
      />
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {bullets.map((bullet, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ color: colors.accent, fontWeight: '700', flexShrink: 0, marginTop: '2px' }}>→</span>
            <Editable
              value={bullet}
              onChange={v => updateBullet(i, v)}
              style={{ fontSize: '1em', color: colors.text, flex: 1 }}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Text ──
function TextSlide({ slide, colors, content, onUpdate }) {
  return (
    <div style={{ ...layout.standard, gap: '16px' }}>
      <Editable
        tag="h2"
        value={slide.title}
        onChange={v => onUpdate({ title: v })}
        style={{ fontSize: '1.6em', fontWeight: '700', color: colors.text }}
      />
      <Editable
        value={content.body}
        onChange={v => onUpdate({ content_json: { ...content, body: v } })}
        style={{ fontSize: '1em', color: colors.text, lineHeight: '1.7' }}
      />
    </div>
  )
}

// ── Two columns ──
function TwoColSlide({ slide, colors, content, onUpdate }) {
  return (
    <div style={{ ...layout.standard, gap: '16px' }}>
      <Editable
        tag="h2"
        value={slide.title}
        onChange={v => onUpdate({ title: v })}
        style={{ fontSize: '1.5em', fontWeight: '700', color: colors.text }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1 }}>
        {/* Columna izquierda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Editable
            tag="h3"
            value={content.left_title}
            onChange={v => onUpdate({ content_json: { ...content, left_title: v } })}
            style={{ fontSize: '0.95em', fontWeight: '600', color: colors.accent }}
          />
          <Editable
            value={content.left_body}
            onChange={v => onUpdate({ content_json: { ...content, left_body: v } })}
            style={{ fontSize: '0.9em', color: colors.text, lineHeight: '1.6' }}
          />
        </div>
        {/* Divisor */}
        <div style={{ borderLeft: `2px solid ${colors.accent}20`, paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Editable
            tag="h3"
            value={content.right_title}
            onChange={v => onUpdate({ content_json: { ...content, right_title: v } })}
            style={{ fontSize: '0.95em', fontWeight: '600', color: colors.accent }}
          />
          <Editable
            value={content.right_body}
            onChange={v => onUpdate({ content_json: { ...content, right_body: v } })}
            style={{ fontSize: '0.9em', color: colors.text, lineHeight: '1.6' }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Quote ──
function QuoteSlide({ slide, colors, content, onUpdate }) {
  return (
    <div style={{ ...layout.centered, gap: '20px', padding: '40px' }}>
      <div style={{ fontSize: '3em', color: colors.accent, lineHeight: 1 }}>"</div>
      <Editable
        tag="blockquote"
        value={content.quote}
        onChange={v => onUpdate({ content_json: { ...content, quote: v } })}
        style={{ fontSize: '1.3em', color: colors.text, textAlign: 'center', fontStyle: 'italic', lineHeight: '1.6' }}
      />
      <Editable
        value={content.author}
        onChange={v => onUpdate({ content_json: { ...content, author: v } })}
        style={{ fontSize: '0.9em', color: colors.muted, textAlign: 'center' }}
      />
    </div>
  )
}

// ── Data ──
function DataSlide({ slide, colors, content, onUpdate }) {
  const stats = content.stats || []

  return (
    <div style={{ ...layout.standard, gap: '24px' }}>
      <Editable
        tag="h2"
        value={slide.title}
        onChange={v => onUpdate({ title: v })}
        style={{ fontSize: '1.6em', fontWeight: '700', color: colors.text }}
      />
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {stats.map((stat, i) => (
          <div key={i} style={{
            flex: '1 1 120px',
            background: `${colors.accent}15`,
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            border: `1px solid ${colors.accent}30`,
          }}>
            <Editable
              tag="div"
              value={stat.value}
              onChange={v => {
                const updated = [...stats]
                updated[i] = { ...stat, value: v }
                onUpdate({ content_json: { ...content, stats: updated } })
              }}
              style={{ fontSize: '2em', fontWeight: '800', color: colors.accent }}
            />
            <Editable
              tag="div"
              value={stat.label}
              onChange={v => {
                const updated = [...stats]
                updated[i] = { ...stat, label: v }
                onUpdate({ content_json: { ...content, stats: updated } })
              }}
              style={{ fontSize: '0.8em', color: colors.muted, marginTop: '4px' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Image ──
function ImageSlide({ slide, colors, content, onUpdate }) {
  return (
    <div style={{ ...layout.standard, gap: '16px' }}>
      <Editable
        tag="h2"
        value={slide.title}
        onChange={v => onUpdate({ title: v })}
        style={{ fontSize: '1.5em', fontWeight: '700', color: colors.text }}
      />
      {/* Placeholder de imagen — se implementa con upload en el futuro */}
      <div style={{
        flex: 1,
        background: `${colors.accent}10`,
        border: `2px dashed ${colors.accent}40`,
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        color: colors.muted,
        fontSize: '0.9em',
      }}>
        <span style={{ fontSize: '2em' }}>🖼️</span>
        <span>Imagen sugerida: {content.image_suggestion || 'sin sugerencia'}</span>
      </div>
      <Editable
        value={content.caption}
        onChange={v => onUpdate({ content_json: { ...content, caption: v } })}
        style={{ fontSize: '0.85em', color: colors.muted, textAlign: 'center', fontStyle: 'italic' }}
      />
    </div>
  )
}

// ── Closing ──
function ClosingSlide({ slide, colors, content, onUpdate }) {
  return (
    <div style={{ ...layout.centered, gap: '16px' }}>
      <Editable
        tag="h2"
        value={slide.title}
        onChange={v => onUpdate({ title: v })}
        style={{ fontSize: '2em', fontWeight: '700', color: colors.text, textAlign: 'center' }}
      />
      <Editable
        value={content.cta}
        onChange={v => onUpdate({ content_json: { ...content, cta: v } })}
        style={{ fontSize: '1em', color: colors.muted, textAlign: 'center' }}
      />
      <div style={{
        marginTop: '16px',
        padding: '10px 24px',
        background: colors.accent,
        color: '#fff',
        borderRadius: '24px',
        fontSize: '0.95em',
        fontWeight: '600',
      }}>
        <Editable
          value={content.button_label || 'Contactanos'}
          onChange={v => onUpdate({ content_json: { ...content, button_label: v } })}
          style={{ color: '#fff' }}
        />
      </div>
    </div>
  )
}

// ── Layouts reutilizables ──
const layout = {
  centered: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    height:         '100%',
    padding:        '32px',
  },
  standard: {
    display:       'flex',
    flexDirection: 'column',
    height:        '100%',
    padding:       '32px',
  },
}

// ── Estilos del canvas ──
const s = {
  canvas: {
    width:         '100%',
    aspectRatio:   '16/9',
    borderRadius:  'var(--radius-lg)',
    border:        '1px solid var(--color-border)',
    boxShadow:     'var(--shadow-lg)',
    display:       'flex',
    flexDirection: 'column',
    position:      'relative',
    overflow:      'hidden',
    fontFamily:    'var(--font-sans)',
  },
  accentBar: {
    height:    '5px',
    flexShrink: 0,
  },
  content: {
    flex:     1,
    overflow: 'hidden',
    display:  'flex',
    flexDirection: 'column',
  },
  slideNumber: {
    position:  'absolute',
    bottom:    '12px',
    right:     '16px',
    fontSize:  '11px',
    opacity:   0.4,
  },
}
