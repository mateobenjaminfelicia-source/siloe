// ================================================
//  SILOÉ — Página: Register
//
//  Diferencias respecto a Login:
//  1. Campo "nombre" adicional
//  2. Confirmación de contraseña (solo en el cliente,
//     el backend no la necesita)
//  3. Lectura del parámetro ?ref= de la URL para el
//     programa de referidos — si alguien llegó con un
//     link de referido, se envía al backend automáticamente
//  4. Después del registro exitoso, el backend ya
//     devuelve el token directo (no hace falta login aparte)
// ================================================

import { useState }                    from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authAPI }                     from '../services/api'
import Button                          from '../components/UI/Button'
import Input                           from '../components/UI/Input'

export default function RegisterPage() {
  const navigate      = useNavigate()
  const [searchParams] = useSearchParams()

  // Si la URL trae ?ref=ABC123, lo capturamos ahora.
  // useSearchParams es el hook de React Router para leer
  // query params sin tocar window.location manualmente.
  const referralCode = searchParams.get('ref') || ''

  // ── Estado del formulario ──
  const [form, setForm] = useState({
    name:            '',
    email:           '',
    password:        '',
    confirmPassword: '',
  })
  const [errors,   setErrors]   = useState({})
  const [apiError, setApiError] = useState('')
  const [loading,  setLoading]  = useState(false)

  // ── Actualizar campo ──
  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
    if (apiError)     setApiError('')
  }

  // ── Validación en el cliente ──
  function validate() {
    const e = {}

    if (!form.name.trim())
      e.name = 'El nombre es requerido.'
    else if (form.name.trim().length < 2)
      e.name = 'Mínimo 2 caracteres.'

    if (!form.email.trim())
      e.email = 'El email es requerido.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Email inválido.'

    if (!form.password)
      e.password = 'La contraseña es requerida.'
    else if (form.password.length < 6)
      e.password = 'Mínimo 6 caracteres.'

    // La confirmación se valida solo si la contraseña es válida
    if (!e.password && form.password !== form.confirmPassword)
      e.confirmPassword = 'Las contraseñas no coinciden.'

    return e
  }

  // ── Submit ──
  async function handleSubmit(e) {
    e.preventDefault()

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      setLoading(true)

      // Armamos el payload para el backend.
      // confirmPassword NO se envía — es solo validación visual.
      // referral_code se envía solo si existe.
      const payload = {
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        ...(referralCode && { referral_code: referralCode }),
      }

      const response = await authAPI.register(payload)
      const token    = response.data.access_token
      localStorage.setItem('siloe_token', token)

      navigate('/dashboard', { replace: true })

    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al crear la cuenta. Intentá de nuevo.'
      setApiError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Indicador de fuerza de contraseña ──
  // Retroalimentación visual inmediata sin esperar al submit.
  function getPasswordStrength(password) {
    if (!password) return null
    let score = 0
    if (password.length >= 8)             score++
    if (/[A-Z]/.test(password))           score++
    if (/[0-9]/.test(password))           score++
    if (/[^a-zA-Z0-9]/.test(password))   score++

    if (score <= 1) return { label: 'Débil',   color: 'var(--color-danger)',  width: '25%' }
    if (score === 2) return { label: 'Regular', color: 'var(--color-accent)',  width: '50%' }
    if (score === 3) return { label: 'Buena',   color: '#3b82f6',              width: '75%' }
    return              { label: 'Fuerte',  color: 'var(--color-success)', width: '100%' }
  }

  const strength = getPasswordStrength(form.password)

  // ── Render ──
  return (
    <div style={layout.page}>

      <Link to="/" style={{ textDecoration: 'none' }}>
        <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '22px' }}>
          Siloé
        </span>
      </Link>

      <div style={layout.card}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={layout.title}>Crear cuenta</h1>
          <p style={layout.subtitle}>
            {referralCode
              ? '🎉 Alguien te invitó — vas a recibir créditos extra al registrarte'
              : 'Empezá gratis, sin tarjeta de crédito'}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate style={layout.form}>

          <Input
            label="Nombre"
            name="name"
            type="text"
            icon="👤"
            placeholder="Tu nombre"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            required
          />

          <Input
            label="Email"
            name="email"
            type="email"
            icon="✉️"
            placeholder="tu@email.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            required
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Input
              label="Contraseña"
              name="password"
              type="password"
              icon="🔒"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              required
            />

            {/* Barra de fuerza — aparece mientras escribe */}
            {strength && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{
                  height: '4px', borderRadius: '2px',
                  background: 'var(--color-border)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: '2px',
                    width: strength.width,
                    background: strength.color,
                    transition: 'width 0.3s, background 0.3s',
                  }} />
                </div>
                <span style={{ fontSize: '11px', color: strength.color }}>
                  Contraseña {strength.label}
                </span>
              </div>
            )}
          </div>

          <Input
            label="Confirmar contraseña"
            name="confirmPassword"
            type="password"
            icon="🔑"
            placeholder="Repetí la contraseña"
            value={form.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            required
          />

          {/* Código de referido — solo se muestra si no vino por URL */}
          {!referralCode && (
            <Input
              label="Código de invitación (opcional)"
              name="referralCodeManual"
              type="text"
              icon="🎟️"
              placeholder="Si alguien te invitó, pegalo acá"
              value={form.referralCodeManual || ''}
              onChange={e => setForm(prev => ({
                ...prev, referralCodeManual: e.target.value.toUpperCase()
              }))}
            />
          )}

          {/* Si vino por URL mostramos el código capturado */}
          {referralCode && (
            <div style={layout.referralBadge}>
              🎟️ Código de invitación: <strong>{referralCode}</strong>
            </div>
          )}

          {apiError && (
            <div style={layout.apiError}>
              ⚠️ {apiError}
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            size="lg"
            style={{ width: '100%', marginTop: '4px' }}
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          </Button>

          <p style={layout.terms}>
            Al registrarte aceptás nuestros{' '}
            <Link to="/terms" style={layout.link}>Términos de uso</Link>
            {' '}y la{' '}
            <Link to="/privacy" style={layout.link}>Política de privacidad</Link>.
          </p>

        </form>

        <div style={{ textAlign: 'center' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            ¿Ya tenés cuenta?{' '}
          </span>
          <Link to="/login" style={layout.link}>
            Iniciar sesión
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

    </div>
  )
}

const layout = {
  page: {
    minHeight:      '100vh',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '24px',
    gap:            '32px',
    background: 'transparent',
  },
  card: {
    width:         '100%',
    maxWidth:      '420px',
    background:    'var(--color-bg-card)',
    border:        '1px solid var(--color-border)',
    borderRadius:  'var(--radius-xl)',
    padding:       '36px',
    boxShadow:     'var(--shadow-lg)',
    display:       'flex',
    flexDirection: 'column',
    gap:           '24px',
  },
  title: {
    fontSize:     '22px',
    fontWeight:   '600',
    color:        'var(--color-text)',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '14px',
    color:    'var(--color-text-muted)',
  },
  form: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '16px',
  },
  referralBadge: {
    background:   'rgba(124, 92, 252, 0.12)',
    border:       '1px solid rgba(124, 92, 252, 0.3)',
    borderRadius: 'var(--radius-md)',
    padding:      '10px 14px',
    fontSize:     '13px',
    color:        'var(--color-primary)',
  },
  apiError: {
    background:   'rgba(239, 68, 68, 0.1)',
    border:       '1px solid var(--color-danger)',
    borderRadius: 'var(--radius-md)',
    padding:      '10px 14px',
    fontSize:     '13px',
    color:        'var(--color-danger)',
  },
  terms: {
    fontSize:  '12px',
    color:     'var(--color-text-muted)',
    textAlign: 'center',
    lineHeight: '1.6',
  },
  link: {
    color:          'var(--color-primary)',
    textDecoration: 'none',
    fontWeight:     '500',
  },
}
