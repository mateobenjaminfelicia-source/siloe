// ================================================
//  SILOÉ — Componente: Input
//  Campo de texto reutilizable con label, error y ícono.
//  Props:
//    label:       texto del label
//    error:       mensaje de error (string) — pinta el campo en rojo
//    icon:        emoji o texto pequeño a la izquierda
//    type:        'text' | 'email' | 'password' | etc.
//    value, onChange, placeholder, disabled, required, name
// ================================================

import { useState } from 'react'

export default function Input({
  label,
  error,
  icon,
  type     = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  name,
  style,
}) {
  // Para password: botón que alterna visibilidad
  const [showPass, setShowPass] = useState(false)
  const inputType = type === 'password' ? (showPass ? 'text' : 'password') : type

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>

      {/* Label */}
      {label && (
        <label style={{
          fontSize:    '13px',
          fontWeight:  '500',
          color:       error ? 'var(--color-danger)' : 'var(--color-text-muted)',
          userSelect:  'none',
        }}>
          {label}{required && <span style={{ color: 'var(--color-danger)', marginLeft: '3px' }}>*</span>}
        </label>
      )}

      {/* Wrapper del input */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>

        {/* Ícono izquierdo */}
        {icon && (
          <span style={{
            position:   'absolute',
            left:       '12px',
            fontSize:   '16px',
            lineHeight: '1',
            pointerEvents: 'none',
            opacity:    0.6,
          }}>
            {icon}
          </span>
        )}

        <input
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={{
            width:           '100%',
            padding:         icon ? '10px 12px 10px 38px' : '10px 12px',
            paddingRight:    type === 'password' ? '44px' : '12px',
            background:      'var(--color-bg-secondary)',
            border:          `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
            borderRadius:    'var(--radius-md)',
            color:           'var(--color-text)',
            fontSize:        '15px',
            outline:         'none',
            transition:      'border-color 0.18s',
            opacity:         disabled ? 0.5 : 1,
            cursor:          disabled ? 'not-allowed' : 'text',
          }}
          onFocus={e => {
            if (!error) e.target.style.borderColor = 'var(--color-primary)'
          }}
          onBlur={e => {
            e.target.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border)'
          }}
        />

        {/* Botón mostrar/ocultar contraseña */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPass(p => !p)}
            aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={{
              position:   'absolute',
              right:      '10px',
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              fontSize:   '16px',
              opacity:    0.5,
              padding:    '4px',
            }}
          >
            {showPass ? '🙈' : '👁️'}
          </button>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <span style={{ fontSize: '12px', color: 'var(--color-danger)' }}>
          {error}
        </span>
      )}
    </div>
  )
}
