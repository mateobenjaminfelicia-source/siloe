// ================================================
//  SILOÉ — Página: Editor
//
//  Layout base del editor de presentaciones.
//  Esta página orquesta tres zonas:
//    - Toolbar:      acciones globales (guardar, presentar, etc.)
//    - SlidePanel:   lista de slides a la izquierda
//    - Canvas:       zona central donde se ve y edita el slide activo
//    - AIPanel:      panel derecho de edición con IA (por implementar)
//
//  Estado central:
//    presentation   → datos completos traídos de la API
//    slides         → array de slides (se edita localmente antes de guardar)
//    activeIndex    → índice del slide activo en el canvas
//    isDirty        → hay cambios sin guardar (muestra aviso)
//    saving         → petición de guardado en curso
// ================================================

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate }           from 'react-router-dom'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { presentationsAPI }                 from '../services/api'
import { resolveSlideStyle, THEME_LIST } from '../styles/slideThemes'
import EditorToolbar                        from '../components/Editor/EditorToolbar'
import SlidePanel                           from '../components/Editor/SlidePanel'
import SlideCanvas                          from '../components/Editor/SlideCanvas'
import AIPanel                              from '../components/Editor/AIPanel'
import Button                               from '../components/UI/Button'

export default function EditorPage() {
  const { id }   = useParams()   // ID de la presentación en la URL
  const navigate = useNavigate()

  // ── Estado principal ──
  const [presentation, setPresentation] = useState(null)
  const [slides,       setSlides]       = useState([])
  const [title,        setTitle]        = useState('')
  const [theme,        setTheme]        = useState('Minimal')
  const [background,   setBackground]   = useState('')
  const [activeIndex,  setActiveIndex]  = useState(0)
  const [isDirty,      setIsDirty]      = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  // ── Carga de la presentación ──
  useEffect(() => {
    if (!id) return
    loadPresentation()
  }, [id])

  async function loadPresentation() {
    try {
      setLoading(true)
      setError('')
      const response = await presentationsAPI.getById(id)
      setPresentation(response.data)
      setSlides(response.data.slides || [])
      setTitle(response.data.title || '')
      setTheme(response.data.theme || 'Minimal')
      setBackground(response.data.background || '')
    } catch (err) {
      setError('No se pudo cargar la presentación.')
    } finally {
      setLoading(false)
    }
  }

  // ── Guardar cambios ──
  // useCallback evita que esta función se recree en cada render,
  // importante porque la pasamos como prop a componentes hijos.
  const handleSave = useCallback(async () => {
    if (!isDirty) return
    try {
      setSaving(true)
      await presentationsAPI.update(id, { title, theme, background, slides })
      setIsDirty(false)
    } catch {
      alert('Error al guardar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }, [id, slides, title, theme, background, isDirty])

const handleDownload = useCallback(async () => {
  // Landscape A4: 297mm x 210mm (16:9 perfecto para slides)
  const pdf = new jsPDF('l', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()   // 297
  const pageHeight = pdf.internal.pageSize.getHeight() // 210

  // Container oculto para renderizar slides (1280x720 = 16:9)
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '1280px'
  container.style.height = '720px'
  container.style.overflow = 'hidden'
  document.body.appendChild(container)

  // Helper: extraer color sólido de un linear-gradient
  const solidBgFromGradient = (grad) => {
    if (!grad || !grad.includes('linear-gradient')) return grad || '#FFFFFF'
    const match = grad.match(/#[0-9a-fA-F]{3,8}/)
    return match ? match[0] : '#FFFFFF'
  }

  // Renderiza el contenido HTML según slide_type + content_json (igual que SlideCanvas)
  const renderSlideHtml = (slide, style) => {
    const c = slide.content_json || {}
    const t = slide.title || 'Sin título'
    const textColor = style.text
    const accent = style.accent
    const muted = style.muted

    const baseTitle = `<h1 style="margin:0 0 24px;font-size:48px;font-weight:700;line-height:1.2;color:${textColor};letter-spacing:-1px;word-wrap:break-word;">${t}</h1>`

    switch (slide.slide_type) {
      case 'title': {
        const sub = c.subtitle || ''
        return baseTitle + (sub ? `<div style="font-size:24px;color:${muted};line-height:1.5;">${sub.replace(/\n/g,'<br>')}</div>` : '')
      }
      case 'bullets': {
        const bullets = c.bullets || []
        if (bullets.length === 0) return baseTitle
        return baseTitle + `<ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:14px;font-size:24px;line-height:1.6;color:${textColor};">
          ${bullets.map(b => `<li style="display:flex;align-items:flex-start;gap:12px;"><span style="color:${accent};font-weight:700;flex-shrink:0;margin-top:2px;">→</span><span>${b}</span></li>`).join('')}
        </ul>`
      }
      case 'text': {
        const body = c.body || ''
        return baseTitle + (body ? `<div style="font-size:22px;line-height:1.7;color:${textColor};white-space:pre-wrap;word-wrap:break-word;">${body.replace(/\n/g,'<br>')}</div>` : '')
      }
      case 'two_col': {
        const leftTitle = c.left_title || ''
        const leftBody = c.left_body || ''
        const rightTitle = c.right_title || ''
        const rightBody = c.right_body || ''
        return baseTitle + `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;font-size:20px;line-height:1.6;color:${textColor};">
            <div>
              ${leftTitle ? `<div style="font-weight:600;color:${accent};margin-bottom:8px;font-size:18px;">${leftTitle}</div>` : ''}
              <div>${leftBody.replace(/\n/g,'<br>')}</div>
            </div>
            <div style="border-left:2px solid ${accent}33;padding-left:32px;">
              ${rightTitle ? `<div style="font-weight:600;color:${accent};margin-bottom:8px;font-size:18px;">${rightTitle}</div>` : ''}
              <div>${rightBody.replace(/\n/g,'<br>')}</div>
            </div>
          </div>`
      }
      case 'quote': {
        const quote = c.quote || ''
        const author = c.author || ''
        return baseTitle + (quote ? `
          <div style="font-size:28px;line-height:1.5;color:${textColor};font-style:italic;position:relative;padding-left:24px;border-left:4px solid ${accent};">
            "${quote}"
            ${author ? `<div style="margin-top:16px;font-size:18px;color:${muted};font-style:normal;">— ${author}</div>` : ''}
          </div>` : '')
      }
      case 'data': {
        const metric = c.metric || ''
        const value = c.value || ''
        const desc = c.description || ''
        return baseTitle + `
          <div style="font-size:64px;font-weight:700;color:${accent};line-height:1;">${value}</div>
          ${metric ? `<div style="font-size:24px;color:${muted};margin-top:8px;">${metric}</div>` : ''}
          ${desc ? `<div style="font-size:20px;color:${textColor};margin-top:16px;">${desc.replace(/\n/g,'<br>')}</div>` : ''}`
      }
      case 'image': {
        const imgUrl = c.image_url || ''
        const caption = c.caption || ''
        return baseTitle + (imgUrl ? `
          <div style="width:100%;height:55%;display:flex;align-items:center;justify-content:center;background:#f0f0f0;border-radius:12px;overflow:hidden;">
            <img src="${imgUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />
          </div>
          ${caption ? `<div style="margin-top:16px;font-size:18px;color:${muted};text-align:center;">${caption}</div>` : ''}` : '')
      }
      case 'closing': {
        const sub = c.subtitle || ''
        const cta = c.cta || ''
        return baseTitle + `
          ${sub ? `<div style="font-size:24px;color:${muted};margin-bottom:24px;">${sub.replace(/\n/g,'<br>')}</div>` : ''}
          ${cta ? `<div style="font-size:22px;color:${accent};font-weight:600;">${cta}</div>` : ''}`
      }
      default:
        return baseTitle + `<div style="color:${muted};font-size:20px;">Tipo de slide: ${slide.slide_type}</div>`
    }
  }

  for (let i = 0; i < slides.length; i++) {
    if (i > 0) pdf.addPage()

    const slide = slides[i]
    const theme = presentation?.theme || 'Minimal'
    const bgKey = background || presentation?.background || ''
    const style = resolveSlideStyle(theme, bgKey)
    const bgSolid = solidBgFromGradient(style.bg)

    // Render slide HTML igual que presenter
    container.innerHTML = `
      <div style="
        width: 1280px;
        height: 720px;
        font-family: 'Inter', system-ui, sans-serif;
        background: ${bgSolid};
        color: ${style.text};
        position: relative;
        overflow: hidden;
      ">
        <!-- Capa decorativa (geometric shapes) -->
        <div style="
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        ">
          ${(style.shapes || []).map((shape, si) => `
            <div style="
              position: absolute;
              top: ${shape.top || 'auto'};
              bottom: ${shape.bottom || 'auto'};
              left: ${shape.left || 'auto'};
              right: ${shape.right || 'auto'};
              width: ${shape.size};
              height: ${shape.size};
              border-radius: ${shape.kind === 'blob' ? '38%' : shape.kind === 'ring' ? '50%' : '50%'};
              ${shape.kind === 'ring' 
                ? `border: ${shape.border || '2px'} solid ${shape.color}; background: transparent;`
                : `background: ${shape.color}; ${shape.blur ? `filter: blur(${shape.blur});` : ''}`}
              opacity: ${shape.opacity || 0.15};
            "></div>
          `).join('')}
        </div>

        <!-- Accent bar top -->
        <div style="
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 6px;
          background: ${style.accent};
          z-index: 1;
        "></div>

        <!-- Content area -->
        <div style="
          position: absolute;
          inset: 0;
          padding: 60px 80px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          z-index: 1;
          box-sizing: border-box;
        ">
          ${renderSlideHtml(slide, style)}
        </div>

        <!-- Slide number bottom right -->
        <div style="
          position: absolute;
          bottom: 30px;
          right: 40px;
          font-size: 14px;
          color: ${style.text};
          opacity: 0.4;
          font-weight: 500;
        ">${i + 1} / ${slides.length}</div>
      </div>
    `

    await new Promise(r => setTimeout(r, 100))

    const canvas = await html2canvas(container.firstElementChild, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: bgSolid,
    })

    const imgData = canvas.toDataURL('image/png', 1.0)
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight)
  }

  document.body.removeChild(container)
  pdf.save(`${title || 'presentacion'}.pdf`)
}, [title, slides, presentation, background])

const handlePrint = useCallback(() => {
  window.print()
}, [])

  // Guardado automático con Ctrl+S
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave])

  // ── Actualizar un slide ──
  // Recibe el índice y los campos a modificar.
  // El spread (...slide, ...changes) preserva los campos
  // que no se están editando.
  function updateSlide(index, changes) {
    setSlides(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...changes }
      return updated
    })
    setIsDirty(true)
  }

  // ── Reordenar slides ──
  function moveSlide(fromIndex, toIndex) {
    setSlides(prev => {
      const updated = [...prev]
      const [moved]  = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })
    setActiveIndex(toIndex)
    setIsDirty(true)
  }

  // ── Render: estados de carga y error ──
  if (loading) return <EditorSkeleton />
  if (error)   return (
    <div style={s.centered}>
      <p style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>⚠️ {error}</p>
      <Button variant="secondary" onClick={() => navigate('/dashboard')}>
        Volver al Dashboard
      </Button>
    </div>
  )

  const activeSlide = slides[activeIndex]

  return (
    <div style={s.page}>

      {/* ── Toolbar superior ── */}
      <EditorToolbar
        title={title}
        onTitleChange={v => { setTitle(v); setIsDirty(true) }}
        theme={theme}
        onThemeChange={v => { setTheme(v); setIsDirty(true) }}
        background={background}
        onBackgroundChange={v => { setBackground(v); setIsDirty(true) }}
        isDirty={isDirty}
        saving={saving}
        onSave={handleSave}
        onDownload={handleDownload}
        onPrint={handlePrint}
        onPresent={() => navigate(`/present/${id}`)}
        onBack={() => navigate('/dashboard')}
      />

      {/* ── Cuerpo del editor ── */}
      <div style={s.body}>

        {/* Panel izquierdo: lista de slides */}
        <SlidePanel
          slides={slides}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          onMove={moveSlide}
        />

        {/* Canvas central: slide activo */}
        <main style={s.canvas}>
          {activeSlide ? (
            <SlideCanvas
              slide={activeSlide}
              theme={theme}
              background={background}
              onUpdate={(changes) => updateSlide(activeIndex, changes)}
            />
          ) : (
            <p style={{ color: 'var(--color-text-muted)' }}>
              Sin slides disponibles.
            </p>
          )}
        </main>

        {/* Panel derecho: IA inline */}
        <AIPanel
          slide={activeSlide}
          onUpdate={(changes) => updateSlide(activeIndex, changes)}
          presentationId={id}
        />

      </div>

      {/* Aviso de cambios sin guardar */}
      {isDirty && (
        <div style={s.dirtyBanner}>
          <span>Tenés cambios sin guardar</span>
          <Button size="sm" onClick={handleSave} loading={saving}>
            Guardar ahora
          </Button>
        </div>
      )}

    </div>
  )
}

// ── Skeleton del Editor ──
// Se muestra mientras carga la presentación.
// Replica las tres zonas del layout real.
function EditorSkeleton() {
  return (
    <div style={{ ...s.page, pointerEvents: 'none' }}>
      <div style={{ ...s.toolbar, background: 'var(--color-bg-card)' }} />
      <div style={s.body}>
        <div style={{ ...s.slidePanel, background: 'var(--color-bg-card)' }} />
        <div style={{ ...s.canvas,    background: 'var(--color-bg-secondary)' }} />
        <div style={{ ...s.aiPanel,   background: 'var(--color-bg-card)' }} />
      </div>
      <style>{`@keyframes shimmer{0%{opacity:.4}50%{opacity:.7}100%{opacity:.4}}`}</style>
    </div>
  )
}

// ── Estilos ──
const TOOLBAR_H   = '56px'
const PANEL_W     = '220px'
const AI_PANEL_W  = '280px'

const s = {
  page: {
    height:        '100vh',
    display:       'flex',
    flexDirection: 'column',
    background:    'transparent',
    overflow:      'hidden',   // el scroll lo manejan las zonas internas
  },
  toolbar: {
    height:     TOOLBAR_H,
    flexShrink: 0,
  },
  body: {
    flex:     1,
    display:  'grid',
    // Tres columnas: panel slides | canvas | panel IA
    gridTemplateColumns: `${PANEL_W} 1fr ${AI_PANEL_W}`,
    overflow: 'hidden',
  },
  slidePanel: {
    borderRight: '1px solid var(--color-border)',
    overflowY:   'auto',
  },
  canvas: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    background:     'var(--color-bg-secondary)',
    overflowY:      'auto',
    padding:        '32px',
  },
  slidePreview: {
    width:        '100%',
    maxWidth:     '800px',
    aspectRatio:  '16/9',
    background:   'var(--color-bg-card)',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    display:      'flex',
    flexDirection:'column',
    alignItems:   'center',
    justifyContent:'center',
    padding:      '32px',
    boxShadow:    'var(--shadow-lg)',
  },
  aiPanel: {
    borderLeft: '1px solid var(--color-border)',
    overflowY:  'auto',
  },
  centered: {
    height:         '100vh',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
  },
  dirtyBanner: {
    position:       'fixed',
    bottom:         '24px',
    left:           '50%',
    transform:      'translateX(-50%)',
    background:     'var(--color-bg-card)',
    border:         '1px solid var(--color-border)',
    borderRadius:   'var(--radius-lg)',
    padding:        '10px 16px',
    display:        'flex',
    alignItems:     'center',
    gap:            '12px',
    boxShadow:      'var(--shadow-lg)',
    fontSize:       '13px',
    color:          'var(--color-text-muted)',
    zIndex:         50,
  },
}
