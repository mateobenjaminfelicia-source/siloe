// SILOÉ — Página: 404
import { Link } from 'react-router-dom'
import Button   from '../components/UI/Button'

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh', background: 'transparent',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '20px', padding: '24px', textAlign: 'center',
    }}>
      <span style={{ fontSize: '64px' }}>🗺️</span>
      <h1 style={{ fontSize: '72px', fontWeight: '800', color: 'var(--color-primary)', lineHeight: 1 }}>404</h1>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text)' }}>
        Esta página no existe
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', maxWidth: '320px', lineHeight: '1.6' }}>
        El link puede estar roto o la página fue movida.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/"><Button variant="secondary">Ir al inicio</Button></Link>
        <Link to="/community"><Button>Ver comunidad</Button></Link>
      </div>
    </div>
  )
}
