// ================================================
//  SILOÉ — Componente: EditorToolbar
//  Barra superior del editor. Muestra:
//    - Botón volver al Dashboard
//    - Título de la presentación (editable)
//    - Indicador de estado (guardado / sin guardar)
//    - Selector de fondo decorativo
//    - Acciones: Guardar, Presentar
//
//  Props:
//    title:            string — título editable
//    onTitleChange:    fn(v)  — cambio de título
//    background:       string — fondo decorativo actual
//    onBackgroundChange: fn(v)
//    isDirty:          bool   — hay cambios sin guardar
//    saving:           bool   — guardado en curso
//    onSave:           fn     — guardar cambios
//    onPresent:        fn     — ir al modo presentador
//    onBack:           fn     — volver al dashboard
// ================================================

import Button from '../UI/Button'
import { BACKGROUND_LIST, THEME_LIST } from '../../styles/slideThemes'

export default function EditorToolbar({
  title     = 'Sin título',
  onTitleChange,
  theme     = 'Minimal',
  onThemeChange,
  background = '',
  onBackgroundChange,
  isDirty   = false,
  saving    = false,
  onSave,
  onPresent,
  onDownload,
  onPrint,
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
          <input
            value={title}
            onChange={e => onTitleChange?.(e.target.value)}
            style={s.titleInput}
            aria-label="Título de la presentación"
          />
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

      {/* Derecha: tema + fondo + acciones */}
      <div style={s.right}>
        <div style={s.themePicker}>
          <span style={s.pickerLabel}>🎨</span>
          <select
            value={theme}
            onChange={e => onThemeChange?.(e.target.value)}
            style={s.pickerSelect}
            title="Tema visual de la presentación"
          >
            {THEME_LIST.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div style={s.backgroundPicker}>
          <span style={s.backgroundLabel}>🖼️</span>
          <select
            value={background}
            onChange={e => onBackgroundChange?.(e.target.value)}
            style={s.backgroundSelect}
            title="Fondo decorativo del slide"
          >
            {BACKGROUND_LIST.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
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
          variant="secondary"
          size="sm"
          onClick={onDownload}
        >
          📥 Descargar
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onPrint}
        >
          🖨️ Imprimir
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
    background:     'rgba(15, 15, 19, 0.9)',
    backdropFilter: 'blur(12px)',
    borderBottom:   '1px solid rgba(255,255,255,0.07)',
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
    color:      'rgba(255,255,255,0.6)',
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
  titleInput: {
    background:  'transparent',
    border:      'none',
    borderBottom:'1px solid transparent',
    color:       '#fff',
    fontSize:    '14px',
    fontWeight:  '600',
    padding:     '2px 4px',
    width:       '240px',
    outline:     'none',
    borderRadius: '4px',
  },
  statusBadge: {
    fontSize:   '11px',
    transition: 'color 0.2s',
    paddingLeft: '4px',
    color:      'rgba(255,255,255,0.5)',
  },
  right: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
    flexShrink: 0,
  },
  themePicker: {
    display:    'flex',
    alignItems: 'center',
    gap:        '6px',
    background: 'var(--color-bg-secondary)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding:    '4px 8px',
  },
  backgroundPicker: {
    display:    'flex',
    alignItems: 'center',
    gap:        '6px',
    background: 'var(--color-bg-secondary)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding:    '4px 8px',
  },
  pickerLabel: {
    fontSize: '13px',
  },
  backgroundLabel: {
    fontSize: '13px',
  },
  pickerSelect: {
    appearance:   'none',
    background:   'var(--color-bg-secondary)',
    border:       'none',
    outline:      'none',
    color:        'var(--color-text)',
    fontSize:     '12px',
    cursor:       'pointer',
    fontFamily:   'inherit',
    fontWeight:   '500',
    padding:      '2px 24px 2px 0',
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 4px center',
  },
  backgroundSelect: {
    appearance:   'none',
    background:   'var(--color-bg-secondary)',
    border:       'none',
    outline:      'none',
    color:        'var(--color-text)',
    fontSize:     '12px',
    cursor:       'pointer',
    fontFamily:   'inherit',
    fontWeight:   '500',
    padding:      '2px 24px 2px 0',
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 4px center',
  },
}
