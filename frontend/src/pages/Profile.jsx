// ================================================
//  SILOÉ — Página: Profile
//  Perfil público del creador. URL: /u/:userId
//  Muestra: avatar, nombre, bio, presentaciones publicadas.
// ================================================

import { useState, useEffect }  from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { usersAPI, communityAPI }       from '../services/api'
import Navbar           from '../components/UI/Navbar'
import PresentationCard from '../components/UI/PresentationCard'
import Button           from '../components/UI/Button'

export default function ProfilePage() {
  const { userId } = useParams()
  const navigate   = useNavigate()

  const [profile,       setProfile]       = useState(null)
  const [presentations, setPresentations] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [likedIds,      setLikedIds]      = useState(new Set())
  const [savedIds,      setSavedIds]      = useState(new Set())

  const isLoggedIn = !!localStorage.getItem('siloe_token')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const response = await usersAPI.getProfile(userId)
        setProfile(response.data.user)
        setPresentations(response.data.presentations || [])
      } catch (err) {
        setError(err.response?.status === 404 ? 'not_found' : 'generic')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  function requireAuth() {
    if (!isLoggedIn) { navigate('/login'); return false }
    return true
  }

  async function handleLike(id) {
    if (!requireAuth()) return
    const isLiked = likedIds.has(id)
    setLikedIds(prev => { const n = new Set(prev); isLiked ? n.delete(id) : n.add(id); return n })
    setPresentations(prev => prev.map(p => p.id === id ? { ...p, like_count: p.like_count + (isLiked ? -1 : 1) } : p))
    try { isLiked ? await communityAPI.unlike(id) : await communityAPI.like(id) }
    catch {
      setLikedIds(prev => { const n = new Set(prev); isLiked ? n.add(id) : n.delete(id); return n })
      setPresentations(prev => prev.map(p => p.id === id ? { ...p, like_count: p.like_count + (isLiked ? 1 : -1) } : p))
    }
  }

  async function handleSave(id) {
    if (!requireAuth()) return
    try { await communityAPI.save(id); setSavedIds(prev => new Set([...prev, id])) }
    catch { alert('No se pudo guardar.') }
  }

  if (loading) return <div style={s.centered}><p style={{ color: 'var(--color-text-muted)' }}>Cargando perfil...</p></div>

  if (error === 'not_found') return (
    <div style={s.centered}>
      <span style={{ fontSize: '48px' }}>👤</span>
      <h2 style={{ color: 'var(--color-text)', fontSize: '20px' }}>Usuario no encontrado</h2>
      <Button onClick={() => navigate('/community')}>Ver comunidad</Button>
    </div>
  )

  if (error) return (
    <div style={s.centered}>
      <p style={{ color: 'var(--color-danger)' }}>⚠️ No se pudo cargar el perfil.</p>
      <Button variant="secondary" onClick={() => navigate(-1)}>Volver</Button>
    </div>
  )

  const initial = profile?.name?.[0]?.toUpperCase() || '?'

  return (
    <div style={s.page}>
      {isLoggedIn && <Navbar />}
      <main style={s.main}>

        {/* Header del perfil */}
        <div style={s.profileHeader}>
          <div style={s.avatar}>{initial}</div>
          <div style={s.profileInfo}>
            <h1 style={s.name}>{profile?.name}</h1>
            {profile?.bio && <p style={s.bio}>{profile.bio}</p>}
            <p style={s.joinDate}>
              En Siloé desde {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
                : '—'}
            </p>
          </div>
        </div>

        {/* Presentaciones publicadas */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>
            Presentaciones de {profile?.name?.split(' ')[0]}
            <span style={s.count}>{presentations.length}</span>
          </h2>

          {presentations.length === 0 ? (
            <div style={s.empty}>
              <span style={{ fontSize: '32px' }}>📂</span>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                Este usuario no tiene presentaciones publicadas aún.
              </p>
            </div>
          ) : (
            <div style={s.grid}>
              {presentations.map(p => (
                <PresentationCard
                  key={p.id}
                  presentation={{ ...p, _isLiked: likedIds.has(p.id), _isSaved: savedIds.has(p.id) }}
                  mode="community"
                  onLike={handleLike}
                  onSave={handleSave}
                />
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}

const s = {
  page:    { minHeight: '100vh', background: 'transparent', display: 'flex', flexDirection: 'column' },
  main:    { maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column', gap: '40px' },
  profileHeader: { display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' },
  avatar: { width: '72px', height: '72px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', fontSize: '28px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  profileInfo: { display: 'flex', flexDirection: 'column', gap: '6px' },
  name:    { fontSize: '22px', fontWeight: '700', color: 'var(--color-text)', margin: 0 },
  bio:     { fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', maxWidth: '480px' },
  joinDate:{ fontSize: '12px', color: 'var(--color-text-muted)' },
  section: { display: 'flex', flexDirection: 'column', gap: '16px' },
  sectionTitle: { fontSize: '18px', fontWeight: '600', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '10px' },
  count:   { fontSize: '13px', fontWeight: '400', color: 'var(--color-text-muted)', background: 'var(--color-bg-secondary)', padding: '2px 8px', borderRadius: '10px' },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  empty:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '48px 24px', textAlign: 'center' },
  centered:{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'transparent', padding: '24px' },
}
