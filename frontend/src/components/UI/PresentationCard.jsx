// ================================================
//  SILOÉ — Componente: PresentationCard
//  Tarjeta de presentación usada en Dashboard y Comunidad.
//
//  Props:
//    presentation: objeto con los datos de la presentación
//    mode: 'own' | 'community'
//      'own'       → muestra acciones de edición/eliminación
//      'community' → muestra likes, guardado y fork
//    onDelete, onPublish, onLike, onSave, onFork
// ================================================

import { useState }       from 'react'
import { useNavigate }    from 'react-router-dom'

// Colores de temas visuales — mapea el nombre al color de acento
const THEME_COLORS = {
  Minimal:    '#4F46E5',
  'Dark Mode':'#7C3AED',
  Corporate:  '#0D6EFD',
  Creative:   '#EA580C',
  Academic:   '#2B6CB0',
}

export default function PresentationCard({
  presentation,
  mode       = 'own',
  onDelete,
  onPublish,
  onLike,
  onSave,
  onFork,
}) {
  const navigate   = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const {
    id,
    title       = 'Sin título',
    theme       = 'Minimal',
    is_published = false,
    view_count   = 0,
    like_count   = 0,
    created_at,
    status,
  } = presentation

  const accentColor = THEME_COLORS[theme] || THEME_COLORS.Minimal

  // Formatear fecha legible
  const formattedDate = created_at
    ? new Date(created_at).toLocaleDateString('es-AR', {
        day: 'numeric', month: 'short', year: 'numeric'
      })
    : ''

  // Badge de estado
  const statusConfig = {
    ready: { label: 'Lista',      color: 'var(--color-success)' },
    draft: { label: 'Borrador',   color: 'var(--color-text-muted)' },
    error: { label: 'Error',      color: 'var(--color-danger)' },
  }
  const statusInfo = statusConfig[status] || statusConfig.draft

  return (
    <div style={s.card}>

      {/* Franja de color del tema — identidad visual de la presentación */}
      <div style={{ ...s.themeBand, background: accentColor }} />

      <div style={s.body}>

        {/* Header: título + menú */}
        <div style={s.cardHeader}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={s.title} title={title}>{title}</h3>
            <div style={s.meta}>
              <span style={{ ...s.statusDot, color: statusInfo.color }}>
                ● {statusInfo.label}
              </span>
              {formattedDate && (
                <span style={s.metaItem}>{formattedDate}</span>
              )}
              {is_published && (
                <span style={s.publishedBadge}>Publicada</span>
              )}
            </div>
          </div>

          {/* Menú de 3 puntos — solo en modo 'own' */}
          {mode === 'own' && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={s.menuBtn}
                aria-label="Más opciones"
              >
                ⋯
              </button>
              {menuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                    onClick={() => setMenuOpen(false)}
                  />
                  <div style={s.dropdown}>
                    <button style={s.dropItem}
                      onClick={() => { navigate(`/editor/${id}`); setMenuOpen(false) }}>
                      ✏️ Editar
                    </button>
                    <button style={s.dropItem}
                      onClick={() => { navigate(`/present/${id}`); setMenuOpen(false) }}>
                      ▶️ Presentar
                    </button>
                    {!is_published && (
                      <button style={s.dropItem}
                        onClick={() => { onPublish?.(id); setMenuOpen(false) }}>
                        🌐 Publicar en comunidad
                      </button>
                    )}
                    <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />
                    <button
                      style={{ ...s.dropItem, color: 'var(--color-danger)' }}
                      onClick={() => { onDelete?.(id); setMenuOpen(false) }}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Estadísticas */}
        <div style={s.stats}>
          <span style={s.stat}>👁️ {view_count}</span>
          <span style={s.stat}>❤️ {like_count}</span>
          <span style={s.statTheme}>🎨 {theme}</span>
        </div>

        {/* Acciones principales */}
        <div style={s.actions}>
          {mode === 'own' ? (
            <>
              <button
                style={s.actionBtn}
                onClick={() => navigate(`/editor/${id}`)}
              >
                ✏️ Editar
              </button>
              <button
                style={{ ...s.actionBtn, ...s.actionBtnSecondary }}
                onClick={() => navigate(`/present/${id}`)}
              >
                ▶️ Presentar
              </button>
            </>
          ) : (
            <>
              <button style={s.actionBtn} onClick={() => onLike?.(id)}>
                ❤️ Like
              </button>
              <button
                style={{ ...s.actionBtn, ...s.actionBtnSecondary }}
                onClick={() => onSave?.(id)}
              >
                🔖 Guardar
              </button>
              <button
                style={{ ...s.actionBtn, ...s.actionBtnSecondary }}
                onClick={() => onFork?.(id)}
              >
                🍴 Usar como base
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

const s = {
  card: {
    background:    'var(--color-bg-card)',
    border:        '1px solid var(--color-border)',
    borderRadius:  'var(--radius-lg)',
    overflow:      'hidden',
    display:       'flex',
    flexDirection: 'column',
    transition:    'border-color 0.18s, box-shadow 0.18s',
  },
  themeBand: {
    height:  '5px',
    flexShrink: 0,
  },
  body: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
  },
  cardHeader: {
    display:     'flex',
    alignItems:  'flex-start',
    gap:         '8px',
  },
  title: {
    fontSize:     '15px',
    fontWeight:   '600',
    color:        'var(--color-text)',
    margin:       0,
    overflow:     'hidden',
    textOverflow: 'ellipsis',
    whiteSpace:   'nowrap',
  },
  meta: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
    marginTop:  '4px',
    flexWrap:   'wrap',
  },
  statusDot: {
    fontSize: '11px',
  },
  metaItem: {
    fontSize: '11px',
    color:    'var(--color-text-muted)',
  },
  publishedBadge: {
    fontSize:     '10px',
    padding:      '1px 6px',
    background:   'rgba(34, 197, 94, 0.15)',
    color:        'var(--color-success)',
    borderRadius: '10px',
    border:       '1px solid rgba(34, 197, 94, 0.3)',
  },
  menuBtn: {
    background: 'none',
    border:     'none',
    cursor:     'pointer',
    color:      'var(--color-text-muted)',
    fontSize:   '20px',
    padding:    '0 4px',
    lineHeight: 1,
    flexShrink: 0,
  },
  dropdown: {
    position:     'absolute',
    top:          '28px',
    right:        0,
    width:        '200px',
    background:   'var(--color-bg-card)',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow:    'var(--shadow-lg)',
    overflow:     'hidden',
    zIndex:       10,
    padding:      '4px',
  },
  dropItem: {
    display:    'block',
    width:      '100%',
    padding:    '8px 12px',
    background: 'none',
    border:     'none',
    cursor:     'pointer',
    fontSize:   '13px',
    color:      'var(--color-text)',
    textAlign:  'left',
    borderRadius: 'var(--radius-sm)',
  },
  stats: {
    display: 'flex',
    gap:     '12px',
  },
  stat: {
    fontSize: '12px',
    color:    'var(--color-text-muted)',
  },
  statTheme: {
    fontSize:  '12px',
    color:     'var(--color-text-muted)',
    marginLeft: 'auto',
  },
  actions: {
    display: 'flex',
    gap:     '8px',
  },
  actionBtn: {
    flex:         1,
    padding:      '7px 0',
    background:   'var(--color-primary)',
    color:        '#fff',
    border:       'none',
    borderRadius: 'var(--radius-md)',
    fontSize:     '13px',
    fontWeight:   '500',
    cursor:       'pointer',
  },
  actionBtnSecondary: {
    background:   'var(--color-bg-secondary)',
    color:        'var(--color-text)',
    border:       '1px solid var(--color-border)',
  },
}
