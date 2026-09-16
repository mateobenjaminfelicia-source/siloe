// ================================================
//  SILOÉ — Componente: Button
//  Botón reutilizable con variantes y estado de carga.
//  Props:
//    variant: 'primary' | 'secondary' | 'ghost' | 'danger'
//    size:    'sm' | 'md' | 'lg'
//    loading: true/false — muestra spinner y bloquea el clic
//    disabled, onClick, type, children, style, className
// ================================================

const styles = {
  base: {
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '8px',
    fontWeight:     '500',
    borderRadius:   'var(--radius-md)',
    border:         '1px solid transparent',
    cursor:         'pointer',
    transition:     'all 0.18s ease',
    whiteSpace:     'nowrap',
    userSelect:     'none',
  },
  sizes: {
    sm: { fontSize: '13px', padding: '6px 12px',  height: '32px' },
    md: { fontSize: '15px', padding: '10px 20px', height: '42px' },
    lg: { fontSize: '16px', padding: '13px 28px', height: '50px' },
  },
  variants: {
    primary: {
      background:  'var(--color-primary)',
      color:       '#fff',
      borderColor: 'var(--color-primary)',
    },
    secondary: {
      background:  'var(--color-bg-card)',
      color:       'var(--color-text)',
      borderColor: 'var(--color-border)',
    },
    ghost: {
      background:  'transparent',
      color:       'var(--color-text-muted)',
      borderColor: 'transparent',
    },
    danger: {
      background:  'var(--color-danger)',
      color:       '#fff',
      borderColor: 'var(--color-danger)',
    },
  },
  disabled: {
    opacity: '0.45',
    cursor:  'not-allowed',
  },
}

export default function Button({
  children,
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled = false,
  type     = 'button',
  onClick,
  style,
  className,
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={className}
      style={{
        ...styles.base,
        ...styles.sizes[size],
        ...styles.variants[variant],
        ...(isDisabled ? styles.disabled : {}),
        ...style,
      }}
    >
      {/* Spinner de carga */}
      {loading && (
        <span
          aria-hidden="true"
          style={{
            width: '14px', height: '14px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </button>
  )
}
