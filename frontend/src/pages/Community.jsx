// ================================================
//  SILOÉ — Página: Community
//  Explorador de presentaciones públicas.
//
//  Secciones:
//    - Barra de búsqueda + filtros por tag
//    - Selector de orden (reciente, popular, destacadas)
//    - Grilla de PresentationCard en modo 'community'
//    - Paginación simple (página anterior / siguiente)
//
//  Acciones disponibles por card:
//    - Like / unlike
//    - Guardar en favoritos
//    - Fork (usar como base — redirige al editor con copia)
//
//  Estado de carga:
//    loading → skeletons
//    vacío   → mensaje con CTA al generador
//    error   → mensaje con reintentar
//
//  Acceso:
//    Pública — se puede explorar sin login.
//    Para dar like, guardar o forkear → redirige al login.
// ================================================

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams }     from 'react-router-dom'
import { communityAPI, presentationsAPI }   from '../services/api'
import Navbar           from '../components/UI/Navbar'
import PresentationCard from '../components/UI/PresentationCard'
import Button           from '../components/UI/Button'

// Tags predefinidos — coinciden con los insertados en el schema
const TAGS = [
  'Todos',
  'Negocios', 'Educación', 'Tecnología', 'Marketing',
  'Diseño', 'Ciencia', 'Arte', 'Salud',
  'Pitch', 'Informe', 'Tutorial', 'Propuesta',
]

const ORDER_OPTIONS = [
  { value: 'recent',   label: '🕐 Más recientes' },
  { value: 'popular',  label: '🔥 Más populares' },
  { value: 'featured', label: '⭐ Destacadas' },
]

const PAGE_SIZE = 12

export default function CommunityPage() {
  const navigate                    = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Estado de filtros (sincronizado con la URL) ──
  // Usar la URL como fuente de verdad permite compartir
  // búsquedas y que el botón atrás del browser funcione.
  const [search,   setSearch]   = useState(searchParams.get('q')    || '')
  const [activeTag, setActiveTag] = useState(searchParams.get('tag') || 'Todos')
  const [order,    setOrder]    = useState(searchParams.get('order') || 'recent')
  const [page,     setPage]     = useState(Number(searchParams.get('page')) || 1)

  // ── Estado de datos ──
  const [presentations, setPresentations] = useState([])
  const [total,         setTotal]         = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')

  // ── Estado de acciones ──
  // Set de IDs con like/guardado activo para feedback visual inmediato
  const [likedIds, setLikedIds]   = useState(new Set())
  const [savedIds, setSavedIds]   = useState(new Set())
  const [actionLoading, setActionLoading] = useState(null) // ID en proceso

  // ── Cargar presentaciones ──
  const loadPresentations = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const params = {
        q:       search    || undefined,
        tag:     activeTag !== 'Todos' ? activeTag : undefined,
        order,
        page,
        limit:   PAGE_SIZE,
      }

      const response = await communityAPI.explore(params)
      setPresentations(response.data.items)
      setTotal(response.data.total)

    } catch {
      setError('No se pudo cargar la comunidad. Revisá tu conexión.')
    } finally {
      setLoading(false)
    }
  }, [search, activeTag, order, page])

  useEffect(() => { loadPresentations() }, [loadPresentations])

  // ── Sincronizar filtros con la URL ──
  useEffect(() => {
    const params = {}
    if (search)            params.q     = search
    if (activeTag !== 'Todos') params.tag   = activeTag
    if (order !== 'recent') params.order = order
    if (page > 1)          params.page  = page
    setSearchParams(params, { replace: true })
  }, [search, activeTag, order, page, setSearchParams])

  // ── Verificar si el usuario está logueado ──
  function requireAuth(action) {
    const token = localStorage.getItem('siloe_token')
    if (!token) {
      navigate('/login')
      return false
    }
    return true
  }

  // ── Like / Unlike ──
  async function handleLike(id) {
    if (!requireAuth()) return
    if (actionLoading) return

    const isLiked = likedIds.has(id)
    setActionLoading(id)

    // Optimistic update — actualizamos la UI antes de la respuesta
    // Si falla, revertimos
    setLikedIds(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(id) : next.add(id)
      return next
    })
    setPresentations(prev =>
      prev.map(p => p.id === id
        ? { ...p, like_count: p.like_count + (isLiked ? -1 : 1) }
        : p
      )
    )

    try {
      isLiked
        ? await communityAPI.unlike(id)
        : await communityAPI.like(id)
    } catch {
      // Revertir si falló
      setLikedIds(prev => {
        const next = new Set(prev)
        isLiked ? next.add(id) : next.delete(id)
        return next
      })
      setPresentations(prev =>
        prev.map(p => p.id === id
          ? { ...p, like_count: p.like_count + (isLiked ? 1 : -1) }
          : p
        )
      )
    } finally {
      setActionLoading(null)
    }
  }

  // ── Guardar en favoritos ──
  async function handleSave(id) {
    if (!requireAuth()) return
    if (actionLoading) return

    setActionLoading(id)
    try {
      await communityAPI.save(id)
      setSavedIds(prev => new Set([...prev, id]))
    } catch {
      alert('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Fork — usar como base ──
  async function handleFork(id) {
    if (!requireAuth()) return
    if (actionLoading) return

    setActionLoading(id)
    try {
      // El backend crea una copia de la presentación
      // con parent_presentation_id apuntando al original
      const response = await presentationsAPI.fork(id)
      navigate(`/editor/${response.data.id}`)
    } catch {
      alert('No se pudo copiar la presentación. Intentá de nuevo.')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Cambio de filtros (resetea la página a 1) ──
  function handleTagChange(tag) {
    setActiveTag(tag)
    setPage(1)
  }

  function handleOrderChange(newOrder) {
    setOrder(newOrder)
    setPage(1)
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    setPage(1)
    loadPresentations()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const isLoggedIn = !!localStorage.getItem('siloe_token')

  return (
    <div style={s.page}>
      {isLoggedIn && <Navbar />}

      <main style={s.main}>

        {/* ── Encabezado ── */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Comunidad</h1>
            <p style={s.subtitle}>
              Explorá presentaciones creadas por otros usuarios. Guardalas, dales like o usalas como base para las tuyas.
            </p>
          </div>
          {!isLoggedIn && (
            <Button onClick={() => navigate('/register')}>
              Crear cuenta gratis →
            </Button>
          )}
        </div>

        {/* ── Barra de búsqueda + orden ── */}
        <div style={s.controls}>
          <form onSubmit={handleSearchSubmit} style={s.searchForm}>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar presentaciones..."
              style={s.searchInput}
            />
            <Button type="submit" variant="secondary" size="sm">
              Buscar
            </Button>
          </form>

          <select
            value={order}
            onChange={e => handleOrderChange(e.target.value)}
            style={s.orderSelect}
          >
            {ORDER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* ── Filtros por tag ── */}
        <div style={s.tagsRow}>
          {TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagChange(tag)}
              style={{
                ...s.tagBtn,
                ...(activeTag === tag ? s.tagBtnActive : {}),
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* ── Contador de resultados ── */}
        {!loading && !error && (
          <p style={s.resultsCount}>
            {total === 0
              ? 'Sin resultados'
              : `${total} presentación${total !== 1 ? 'es' : ''}`
            }
            {activeTag !== 'Todos' && ` en ${activeTag}`}
            {search && ` para "${search}"`}
          </p>
        )}

        {/* ── Estado: cargando ── */}
        {loading && (
          <div style={s.grid}>
            {Array.from({ length: PAGE_SIZE }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Estado: error ── */}
        {!loading && error && (
          <div style={s.stateBox}>
            <p style={{ color: 'var(--color-danger)', marginBottom: '12px' }}>
              ⚠️ {error}
            </p>
            <Button variant="secondary" onClick={loadPresentations}>
              Reintentar
            </Button>
          </div>
        )}

        {/* ── Estado: sin resultados ── */}
        {!loading && !error && presentations.length === 0 && (
          <div style={s.stateBox}>
            <span style={{ fontSize: '40px' }}>🔍</span>
            <p style={{ color: 'var(--color-text-muted)' }}>
              No hay presentaciones que coincidan con tu búsqueda.
            </p>
            <Button variant="secondary" onClick={() => {
              setSearch(''); setActiveTag('Todos'); setPage(1)
            }}>
              Limpiar filtros
            </Button>
          </div>
        )}

        {/* ── Grilla de presentaciones ── */}
        {!loading && !error && presentations.length > 0 && (
          <>
            <div style={s.grid}>
              {presentations.map(p => (
                <PresentationCard
                  key={p.id}
                  presentation={{
                    ...p,
                    // Inyectamos el estado local de like/guardado
                    // para feedback visual sin recargar desde la API
                    like_count: p.like_count + (likedIds.has(p.id) ? 0 : 0),
                    _isLiked:   likedIds.has(p.id),
                    _isSaved:   savedIds.has(p.id),
                  }}
                  mode="community"
                  onLike={handleLike}
                  onSave={handleSave}
                  onFork={handleFork}
                />
              ))}
            </div>

            {/* ── Paginación ── */}
            {totalPages > 1 && (
              <div style={s.pagination}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                >
                  ← Anterior
                </Button>

                <div style={s.pageNumbers}>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    // Ventana deslizante de 5 páginas centrada en la actual
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                    const pageNum = start + i
                    return pageNum <= totalPages ? (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        style={{
                          ...s.pageBtn,
                          ...(pageNum === page ? s.pageBtnActive : {}),
                        }}
                      >
                        {pageNum}
                      </button>
                    ) : null
                  })}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page === totalPages}
                >
                  Siguiente →
                </Button>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  )
}

// ── Skeleton Card ──
function SkeletonCard() {
  return (
    <div style={{
      background:   'var(--color-bg-card)',
      border:       '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow:     'hidden',
      height:       '190px',
    }}>
      <div style={{ height: '5px', background: 'var(--color-border)' }} />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[140, 80, '100%'].map((w, i) => (
          <div key={i} style={{
            width: w, height: i === 2 ? '11px' : i === 0 ? '16px' : '11px',
            background: 'var(--color-border)',
            borderRadius: '4px',
            animation: 'shimmer 1.4s ease-in-out infinite',
          }} />
        ))}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {['33%', '33%', '33%'].map((w, i) => (
            <div key={i} style={{
              width: w, height: '32px',
              background: 'var(--color-border)',
              borderRadius: 'var(--radius-md)',
              animation: 'shimmer 1.4s ease-in-out infinite',
            }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes shimmer{0%{opacity:.4}50%{opacity:.8}100%{opacity:.4}}`}</style>
    </div>
  )
}

// ── Estilos ──
const s = {
  page: {
    minHeight:     '100vh',
    background:    'transparent',
    display:       'flex',
    flexDirection: 'column',
  },
  main: {
    maxWidth:      '1100px',
    width:         '100%',
    margin:        '0 auto',
    padding:       '32px 24px 64px',
    display:       'flex',
    flexDirection: 'column',
    gap:           '20px',
  },
  header: {
    display:     'flex',
    alignItems:  'flex-start',
    justifyContent: 'space-between',
    gap:         '16px',
    flexWrap:    'wrap',
  },
  title: {
    fontSize:     '24px',
    fontWeight:   '700',
    color:        'var(--color-text)',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize:  '14px',
    color:     'var(--color-text-muted)',
    maxWidth:  '540px',
    lineHeight:'1.6',
  },
  controls: {
    display:    'flex',
    gap:        '12px',
    flexWrap:   'wrap',
  },
  searchForm: {
    display: 'flex',
    gap:     '8px',
    flex:    1,
    minWidth:'200px',
  },
  searchInput: {
    flex:         1,
    padding:      '9px 14px',
    background:   'var(--color-bg-card)',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color:        'var(--color-text)',
    fontSize:     '14px',
    outline:      'none',
  },
  orderSelect: {
    padding:      '9px 14px',
    background:   'var(--color-bg-card)',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color:        'var(--color-text)',
    fontSize:     '14px',
    cursor:       'pointer',
    outline:      'none',
  },
  tagsRow: {
    display:  'flex',
    flexWrap: 'wrap',
    gap:      '8px',
  },
  tagBtn: {
    padding:      '5px 14px',
    background:   'var(--color-bg-card)',
    border:       '1px solid var(--color-border)',
    borderRadius: '20px',
    fontSize:     '13px',
    color:        'var(--color-text-muted)',
    cursor:       'pointer',
    transition:   'all 0.15s',
    whiteSpace:   'nowrap',
  },
  tagBtnActive: {
    background:  'rgba(124,92,252,0.15)',
    borderColor: 'rgba(124,92,252,0.4)',
    color:       'var(--color-primary)',
    fontWeight:  '500',
  },
  resultsCount: {
    fontSize: '13px',
    color:    'var(--color-text-muted)',
  },
  grid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap:                 '16px',
  },
  stateBox: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           '16px',
    padding:       '64px 24px',
    textAlign:     'center',
  },
  pagination: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '8px',
    marginTop:      '8px',
  },
  pageNumbers: {
    display: 'flex',
    gap:     '4px',
  },
  pageBtn: {
    width:        '36px',
    height:       '36px',
    background:   'var(--color-bg-card)',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color:        'var(--color-text-muted)',
    fontSize:     '13px',
    cursor:       'pointer',
  },
  pageBtnActive: {
    background:  'var(--color-primary)',
    borderColor: 'var(--color-primary)',
    color:       '#fff',
    fontWeight:  '600',
  },
}
