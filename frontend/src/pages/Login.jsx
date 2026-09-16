// ================================================
//  SILOÉ — Página: Login
//
//  Flujo:
//  1. Usuario escribe email + contraseña
//  2. Se valida el formulario en el cliente
//  3. Se llama a authAPI.login()
//  4. Si el backend responde con el token JWT:
//     → se guarda en localStorage con la clave 'siloe_token'
//     → se redirige al dashboard
//  5. Si hay error → se muestra el mensaje
// ================================================

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import Button from '../components/UI/Button'
import Input  from '../components/UI/Input'

export default function LoginPage() {
  const navigate = useNavigate()

  // ── Estado del formulario ──
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  // ── Actualizar campo ──
  // Una sola función maneja todos los campos del form.
  // e.target.name coincide con el prop 'name' de cada Input.
  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    // Limpiar error del campo que el usuario está editando
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
    if (apiError)      setApiError('')
  }

  // ── Validación en el cliente ──
  // Corre antes de llamar a la API para no desperdiciar créditos
  // ni hacer llamadas innecesarias con datos vacíos.
  function validate() {
    const newErrors = {}
    if (!form.email.trim())
      newErrors.email = 'El email es requerido.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = 'Email inválido.'
    if (!form.password)
      newErrors.password = 'La contraseña es requerida.'
    else if (form.password.length < 6)
      newErrors.password = 'Mínimo 6 caracteres.'
    return newErrors
  }

  // ── Submit ──
  async function handleSubmit(e) {
    e.preventDefault()   // evitar que el browser recargue la página

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      setLoading(true)
      const response = await authAPI.login(form)

      // El backend devuelve { access_token: "...", token_type: "bearer" }
      const token = response.data.access_token
      localStorage.setItem('siloe_token', token)

      // Redirigir al dashboard después del login exitoso
      navigate('/dashboard', { replace: true })

    } catch (err) {
      // Mensaje de error del backend o mensaje genérico
      const msg = err.response?.data?.detail || 'Email o contraseña incorrectos.'
      setApiError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Render ──
  return (
    <div style={layout.page}>

      {/* Logo / marca */}
      <Link to="/" style={layout.logo}>
        <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '22px' }}>
          Siloé
        </span>
      </Link>

      {/* Card del formulario */}
      <div style={layout.card}>
        <div style={layout.header}>
          <h1 style={layout.title}>Bienvenido de nuevo</h1>
          <p style={layout.subtitle}>Ingresá a tu cuenta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} noValidate style={layout.form}>

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

          <Input
            label="Contraseña"
            name="password"
            type="password"
            icon="🔒"
            placeholder="Tu contraseña"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            required
          />

          {/* Error global de la API */}
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
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>

        </form>

        {/* Links de navegación */}
        <div style={layout.links}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            ¿No tenés cuenta?{' '}
          </span>
          <Link to="/register" style={layout.link}>
            Registrarse
          </Link>
        </div>
      </div>

      {/* Animación del spinner — definida en CSS global */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

    </div>
  )
}

// ── Estilos de la página ──
// Separados del JSX para mantenerlo legible.
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
  logo: {
    textDecoration: 'none',
  },
  card: {
    width:        '100%',
    maxWidth:     '400px',
    background:   'var(--color-bg-card)',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    padding:      '36px',
    boxShadow:    'var(--shadow-lg)',
    display:      'flex',
    flexDirection:'column',
    gap:          '28px',
  },
  header: {
    textAlign: 'center',
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
  apiError: {
    background:   'rgba(239, 68, 68, 0.1)',
    border:       '1px solid var(--color-danger)',
    borderRadius: 'var(--radius-md)',
    padding:      '10px 14px',
    fontSize:     '13px',
    color:        'var(--color-danger)',
  },
  links: {
    textAlign: 'center',
    fontSize:  '14px',
  },
  link: {
    color:          'var(--color-primary)',
    textDecoration: 'none',
    fontWeight:     '500',
  },
}
