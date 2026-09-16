// ================================================
//  SILOÉ — Componente: Navbar
//  Barra superior presente en todas las páginas
//  autenticadas. Muestra:
//    - Logo con link al home
//    - Créditos del usuario (badge)
//    - Link a la comunidad
//    - Avatar con menú desplegable
//
//  Props:
//    credits: número de créditos del usuario
//    userName: nombre del usuario
//    onLogout: función a llamar al cerrar sesión
// ================================================

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

export default function Navbar({ credits = 0, userName = '', onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const initial = userName ? userName[0].toUpperCase() : '?'

  function handleLogout() {
    localStorage.removeItem('siloe_token')
    onLogout?.()
    navigate('/login', { replace: true })
  }

  function handleLogoClick(e) {
    e.preventDefault()
    navigate('/', { state: { reverseHome: true, from: location.pathname } })
  }

  return (
    <>
      <nav style={s.nav}>
        {/* Izquierda: Logo */}
        <a href="/" onClick={handleLogoClick} style={s.logo}>
          Siloé
        </a>

        {/* Centro: Links de navegación */}
        <div style={s.navLinks}>
          <Link to="/dashboard"  style={s.navLink}>Mis presentaciones</Link>
          <Link to="/generate"   style={s.navLink}>✨ Generador</Link>
          <Link to="/community"  style={s.navLink}>Comunidad</Link>
          <Link to="/donations"  style={s.navLink}>Donaciones</Link>
        </div>

        {/* Derecha: Créditos + Avatar */}
        <div style={s.right}>
          <Link to="/generate" style={s.generateBtn}>
            ✨ Generar
          </Link>
          {/* Badge de créditos */}
          <div style={s.creditsBadge} title="Tus créditos de IA disponibles">
            <span style={{ fontSize: '14px' }}>⚡</span>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>{credits}</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>créditos</span>
          </div>

          {/* Avatar con menú */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menú de usuario"
              aria-expanded={menuOpen}
              style={s.avatar}
            >
              {initial}
            </button>

            {menuOpen && (
              <>
                {/* Overlay invisible para cerrar al hacer clic afuera */}
                <div
                  style={s.overlay}
                  onClick={() => setMenuOpen(false)}
                />
                <div style={s.menu}>
                  <div style={s.menuHeader}>
                    <span style={{ fontWeight: '500', color: 'var(--color-text)' }}>
                      {userName}
                    </span>
                  </div>
                  <div style={s.menuDivider} />
                  <Link
                    to="/dashboard"
                    style={s.menuItem}
                    onClick={() => setMenuOpen(false)}
                  >
                    📁 Mis presentaciones
                  </Link>
                  <button style={s.menuItemBtn} onClick={handleLogout}>
                    🚪 Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </nav>

      {/* Espaciador para que el contenido no quede debajo del nav fijo */}
      <div style={{ height: '64px' }} />
    </>
  )
}

const s = {
  nav: {
    position:       'fixed',
    top:            0, left: 0, right: 0,
    height:         '64px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '0 24px',
    background:     'rgba(15, 15, 19, 0.85)',
    backdropFilter: 'blur(12px)',
    borderBottom:   '1px solid var(--color-border)',
    zIndex:         100,
  },
  logo: {
    textDecoration: 'none',
    fontWeight:     '700',
    fontSize:       '20px',
    color:          'var(--color-primary)',
    letterSpacing:  '-0.5px',
  },
  navLinks: {
    display: 'flex',
    gap:     '8px',
  },
  navLink: {
    textDecoration: 'none',
    color:          'var(--color-text-muted)',
    fontSize:       '14px',
    padding:        '6px 12px',
    borderRadius:   'var(--radius-md)',
    transition:     'color 0.15s, background 0.15s',
  },
  right: {
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
  },
  creditsBadge: {
    display:      'flex',
    alignItems:   'center',
    gap:          '5px',
    padding:      '5px 12px',
    background:   'var(--color-bg-card)',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
  },
  avatar: {
    width:          '36px',
    height:         '36px',
    borderRadius:   '50%',
    background:     'var(--color-primary)',
    color:          '#fff',
    fontWeight:     '700',
    fontSize:       '15px',
    border:         'none',
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
  },
  generateBtn: {
    textDecoration: 'none',
    background:     'linear-gradient(45deg, #7c5cfc, #5c9cfc)',
    color:           '#fff',
    fontSize:       '13px',
    fontWeight:     '700',
    padding:         '6px 16px',
    borderRadius:   'var(--radius-lg)',
    transition:      'transform 0.2s, box-shadow 0.2s',
    boxShadow:       '0 4px 12px rgba(124, 92, 252, 0.3)',
    cursor:          'pointer',
  },
  overlay: {
    position: 'fixed',
    inset:    0,
    zIndex:   99,
  },
  menu: {
    position:     'absolute',
    top:          '44px',
    right:        0,
    width:        '200px',
    background:   'var(--color-bg-card)',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow:    'var(--shadow-lg)',
    overflow:     'hidden',
    zIndex:       100,
  },
  menuHeader: {
    padding:  '12px 16px',
    fontSize: '13px',
  },
  menuDivider: {
    height:     '1px',
    background: 'var(--color-border)',
  },
  menuItem: {
    display:        'block',
    padding:        '10px 16px',
    fontSize:       '14px',
    color:          'var(--color-text)',
    textDecoration: 'none',
    cursor:         'pointer',
  },
  menuItemBtn: {
    display:    'block',
    width:      '100%',
    padding:    '10px 16px',
    fontSize:   '14px',
    color:      'var(--color-danger)',
    background: 'none',
    border:     'none',
    cursor:     'pointer',
    textAlign:  'left',
  },
}
