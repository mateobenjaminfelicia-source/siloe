// ================================================
//  SILOÉ — Página: Donations
//  Sección de donaciones para sostener el proyecto.
//
//  Muestra:
//    - Explicación del modelo gratuito y por qué donar
//    - Opciones de monto con créditos correspondientes
//    - Formulario de donación (conecta con donationsAPI)
//    - Agradecimiento post-donación
// ================================================

import { useState }      from 'react'
import { Link }          from 'react-router-dom'
import { donationsAPI }  from '../services/api'
import Navbar            from '../components/UI/Navbar'
import Button            from '../components/UI/Button'

const DONATION_OPTIONS = [
  { amount: 2,  credits: 5,  label: '☕ Café',       description: '+5 créditos' },
  { amount: 5,  credits: 15, label: '🍕 Pizza',      description: '+15 créditos' },
  { amount: 10, credits: 35, label: '🚀 Impulso',    description: '+35 créditos' },
  { amount: 25, credits: 100,label: '💎 Patrocinador',description: '+100 créditos' },
]

export default function DonationsPage() {
  const [selected,   setSelected]   = useState(null)   // opción seleccionada
  const [custom,     setCustom]     = useState('')      // monto personalizado
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [error,      setError]      = useState('')

  const isLoggedIn = !!localStorage.getItem('siloe_token')

  const finalAmount  = custom ? parseFloat(custom) : selected?.amount
  const finalCredits = custom
    ? Math.floor(parseFloat(custom) * 3.5)   // ~3.5 créditos por dólar en monto custom
    : selected?.credits

  async function handleDonate() {
    if (!isLoggedIn) { window.location.href = '/login'; return }
    if (!finalAmount || finalAmount < 1) { setError('El monto mínimo es $1.'); return }

    try {
      setLoading(true)
      setError('')
      await donationsAPI.create({
        amount:          finalAmount,
        currency:        'USD',
        credits_granted: finalCredits,
        platform:        'manual',
      })
      setSuccess(true)
    } catch {
      setError('No se pudo procesar la donación. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div style={s.page}>
      {isLoggedIn && <Navbar />}
      <div style={s.successBox}>
        <span style={{ fontSize: '56px' }}>🎉</span>
        <h2 style={s.successTitle}>¡Muchas gracias!</h2>
        <p style={s.successText}>
          Tu donación de <strong>${finalAmount}</strong> ayuda a mantener Siloé gratuito para todos.
          Se acreditaron <strong>{finalCredits} créditos</strong> en tu cuenta.
        </p>
        <Link to="/dashboard">
          <Button>Ir a mis presentaciones</Button>
        </Link>
      </div>
    </div>
  )

  return (
    <div style={s.page}>
      {isLoggedIn && <Navbar />}
      <main style={s.main}>

        {/* Encabezado */}
        <div style={s.header}>
          <h1 style={s.title}>Apoyá a Siloé</h1>
          <p style={s.subtitle}>
            Siloé es completamente gratuito. Los costos de la IA los pagamos de nuestro bolsillo.
            Si te resulta útil y querés que siga creciendo, cualquier donación ayuda mucho —
            y a cambio recibís créditos extra para generar más presentaciones.
          </p>
        </div>

        {/* Opciones de monto */}
        <div style={s.optionsGrid}>
          {DONATION_OPTIONS.map(opt => (
            <button
              key={opt.amount}
              onClick={() => { setSelected(opt); setCustom('') }}
              style={{
                ...s.optionCard,
                ...(selected?.amount === opt.amount && !custom ? s.optionCardActive : {}),
              }}
            >
              <span style={s.optionLabel}>{opt.label}</span>
              <span style={s.optionAmount}>${opt.amount}</span>
              <span style={s.optionCredits}>{opt.description}</span>
            </button>
          ))}
        </div>

        {/* Monto personalizado */}
        <div style={s.customRow}>
          <span style={s.customLabel}>O ingresá un monto:</span>
          <div style={s.customInputWrapper}>
            <span style={s.customCurrency}>$</span>
            <input
              type="number"
              min="1"
              step="1"
              value={custom}
              onChange={e => { setCustom(e.target.value); setSelected(null) }}
              placeholder="Otro monto"
              style={s.customInput}
            />
          </div>
          {custom && parseFloat(custom) >= 1 && (
            <span style={s.customCredits}>
              ≈ {Math.floor(parseFloat(custom) * 3.5)} créditos
            </span>
          )}
        </div>

        {/* Resumen y botón */}
        <div style={s.summary}>
          {finalAmount && (
            <p style={s.summaryText}>
              Donando <strong>${finalAmount}</strong> recibís <strong>{finalCredits} créditos</strong> de IA.
            </p>
          )}
          {error && <p style={s.errorText}>⚠️ {error}</p>}
          <Button
            size="lg"
            loading={loading}
            disabled={!finalAmount || finalAmount < 1}
            onClick={handleDonate}
            style={{ minWidth: '200px' }}
          >
            {isLoggedIn ? `Donar $${finalAmount || '—'}` : 'Ingresá para donar'}
          </Button>
          <p style={s.disclaimer}>
            Los pagos son procesados de forma segura. Los créditos se acreditan inmediatamente.
          </p>
        </div>

        {/* Qué financia */}
        <div style={s.financeSection}>
          <h3 style={s.financeTitle}>¿En qué se usa tu donación?</h3>
          <div style={s.financeGrid}>
            {[
              { icon: '🤖', label: 'API de IA',       desc: 'Cada presentación generada tiene un costo real de API.' },
              { icon: '🖥️', label: 'Servidores',      desc: 'Hosting, base de datos y ancho de banda.' },
              { icon: '✨', label: 'Nuevas funciones', desc: 'Tiempo de desarrollo para seguir mejorando Siloé.' },
            ].map(item => (
              <div key={item.label} style={s.financeCard}>
                <span style={{ fontSize: '24px' }}>{item.icon}</span>
                <div>
                  <div style={s.financeCardTitle}>{item.label}</div>
                  <div style={s.financeCardDesc}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}

const s = {
  page:    { minHeight: '100vh', background: 'transparent', display: 'flex', flexDirection: 'column' },
  main:    { maxWidth: '680px', width: '100%', margin: '0 auto', padding: '40px 24px 80px', display: 'flex', flexDirection: 'column', gap: '36px' },
  header:  { textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' },
  title:   { fontSize: '28px', fontWeight: '700', color: 'var(--color-text)' },
  subtitle:{ fontSize: '15px', color: 'var(--color-text-muted)', lineHeight: '1.7' },
  optionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  optionCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '20px', background: 'var(--color-bg-card)', border: '2px solid var(--color-border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' },
  optionCardActive: { borderColor: 'var(--color-primary)', background: 'rgba(124,92,252,0.08)' },
  optionLabel:   { fontSize: '14px', fontWeight: '600', color: 'var(--color-text)' },
  optionAmount:  { fontSize: '24px', fontWeight: '800', color: 'var(--color-primary)' },
  optionCredits: { fontSize: '12px', color: 'var(--color-text-muted)' },
  customRow:    { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  customLabel:  { fontSize: '14px', color: 'var(--color-text-muted)', flexShrink: 0 },
  customInputWrapper: { display: 'flex', alignItems: 'center', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  customCurrency: { padding: '0 10px', color: 'var(--color-text-muted)', fontSize: '15px', fontWeight: '600' },
  customInput:  { padding: '9px 12px 9px 0', background: 'transparent', border: 'none', color: 'var(--color-text)', fontSize: '15px', outline: 'none', width: '100px' },
  customCredits:{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: '500' },
  summary:      { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '28px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', textAlign: 'center' },
  summaryText:  { fontSize: '15px', color: 'var(--color-text)' },
  errorText:    { fontSize: '13px', color: 'var(--color-danger)' },
  disclaimer:   { fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.5' },
  financeSection:{ display: 'flex', flexDirection: 'column', gap: '16px' },
  financeTitle: { fontSize: '16px', fontWeight: '600', color: 'var(--color-text)' },
  financeGrid:  { display: 'flex', flexDirection: 'column', gap: '10px' },
  financeCard:  { display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 16px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' },
  financeCardTitle: { fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', marginBottom: '3px' },
  financeCardDesc:  { fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' },
  successBox:   { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '40px 24px', textAlign: 'center' },
  successTitle: { fontSize: '24px', fontWeight: '700', color: 'var(--color-text)' },
  successText:  { fontSize: '15px', color: 'var(--color-text-muted)', lineHeight: '1.7', maxWidth: '400px' },
}
