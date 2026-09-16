// ================================================
//  SILOÉ — Componente: EditorToolbar
//  Barra superior del editor. Muestra:
//    - Botón volver al Dashboard
//    - Título de la presentación (editable en el futuro)
//    - Indicador de estado (guardado / sin guardar)
//    - Acciones: Guardar, Presentar
//
//  Props:
//    title:     string — título de la presentación
//    isDirty:   bool   — hay cambios sin guardar
//    saving:    bool   — guardado en curso
//    onSave:    fn     — guardar cambios
//    onPresent: fn     — ir al modo presentador
//    onBack:    fn     — volver al dashboard
// ================================================

import Button from '../UI/Button'

export default function EditorToolbar({
  title     = 'Sin título',
  isDirty   = false,
  saving    = false,
  onSave,
  onPresent,
  onBack,
}) {
  return (
    <header style={s.toolbar}>

      {/* Izquierda: volver + título */}
      <div style={s.left}>
        <button onClick={onBack} style={s.backBtn} title="Volver al dashboard">
          ← 
        </button>
        <div style={s.titleGroup}>
          <span style={s.title}>{title}</span>
          {/* Indicador de estado */}
          <span style={{
            ...s.statusBadge,
            color:      isDirty ? 'var(--color-accent)' : 'var(--color-success)',
          }}>
            {saving   ? '⏳ Guardando...'   :
             isDirty  ? '● Sin guardar'     :
                        '✓ Guardado'}
          </span>
        </div>
      </div>

      {/* Derecha: acciones */}
      <div style={s.right}>
        <Button
          variant="secondary"
          size="sm"
          onClick={onSave}
          loading={saving}
          disabled={!isDirty}
        >
          Guardar
        </Button>
        <Button
          size="sm"
          onClick={onPresent}
        >
          ▶ Presentar
        </Button>
      </div>

    </header>
  )
}

const s = {
  toolbar: {
    height:         '56px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '0 16px',
    background:     'var(--color-bg-card)',
    borderBottom:   '1px solid var(--color-border)',
    flexShrink:     0,
    zIndex:         10,
  },
  left: {
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
    minWidth:   0,
  },
  backBtn: {
    background: 'none',
    border:     'none',
    color:      'var(--color-text-muted)',
    fontSize:   '18px',
    cursor:     'pointer',
    padding:    '4px 8px',
    borderRadius: 'var(--radius-sm)',
    flexShrink: 0,
  },
  titleGroup: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '1px',
    minWidth:      0,
  },
  title: {
    fontSize:     '14px',
    fontWeight:   '600',
    color:        'var(--color-text)',
    overflow:     'hidden',
    textOverflow: 'ellipsis',
    whiteSpace:   'nowrap',
  },
  statusBadge: {
    fontSize:   '11px',
    transition: 'color 0.2s',
  },
  right: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
    flexShrink: 0,
  },
}
