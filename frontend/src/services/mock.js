// ================================================
//  SILOÉ — Mock Service
//  Simula respuestas del backend para desarrollo
//  frontend sin necesidad de tener el backend activo.
//
//  Activar: VITE_MOCK=true en .env
//  Desactivar cuando el backend de Mateo esté listo.
// ================================================

export const IS_MOCK = import.meta.env.VITE_MOCK === 'true'

// ── Datos falsos ──
const MOCK_USER = {
  id:         1,
  name:       'Usuario Demo',
  email:      'demo@siloe.app',
  ai_credits: 10,
  balance:    10,
  created_at: new Date().toISOString(),
}

const MOCK_TOKEN = 'mock-jwt-token-demo'

// Temas visuales disponibles
const THEMES = ['Minimal', 'Dark Mode', 'Corporate', 'Creative', 'Academic']

// ── Generador de presentación falsa ──
function makeMockPresentation(id, prompt = '', instructions = '') {
  return {
    id,
    user_id:      1,
    title:        prompt ? `Presentación: ${prompt.slice(0, 40)}` : `Presentación de ejemplo ${id}`,
    prompt_original: prompt,
    instructions_original: instructions,
    theme:        THEMES[id % THEMES.length],
    visibility:   'private',
    is_published: id % 3 === 0,
    view_count:   Math.floor(Math.random() * 200),
    like_count:   Math.floor(Math.random() * 50),
    download_count: Math.floor(Math.random() * 30),
    share_token:  `mock-token-${id}`,
    status:       'ready',
    created_at:   new Date(Date.now() - id * 86400000).toISOString(),
    slides: [
      {
        id: id * 10 + 1,
        presentation_id: id,
        slide_order: 0,
        slide_type: 'title',
        title: prompt ? `${prompt.slice(0, 30)}` : 'Título de la presentación',
        content_json: { subtitle: 'Subtítulo generado por IA · Siloé' },
        speaker_notes: 'Estas son las notas del orador para el slide de título.',
        image_url: null,
        manually_edited: false,
      },
      {
        id: id * 10 + 2,
        presentation_id: id,
        slide_order: 1,
        slide_type: 'bullets',
        title: 'Puntos clave',
        content_json: {
          bullets: [
            'Primer punto importante del tema',
            'Segundo punto con información relevante',
            'Tercer punto que refuerza el mensaje principal',
            'Conclusión parcial de esta sección',
          ]
        },
        speaker_notes: 'Recordar mencionar el contexto de cada punto.',
        image_url: null,
        manually_edited: false,
      },
      {
        id: id * 10 + 3,
        presentation_id: id,
        slide_order: 2,
        slide_type: 'two_col',
        title: 'Comparativa',
        content_json: {
          left_title:  'Antes',
          left_body:   'Descripción del estado anterior o punto de partida del análisis.',
          right_title: 'Después',
          right_body:  'Descripción del estado mejorado o resultado esperado.',
        },
        speaker_notes: '',
        image_url: null,
        manually_edited: false,
      },
      {
        id: id * 10 + 4,
        presentation_id: id,
        slide_order: 3,
        slide_type: 'data',
        title: 'Números que importan',
        content_json: {
          stats: [
            { value: '85%',  label: 'Satisfacción' },
            { value: '3x',   label: 'Crecimiento' },
            { value: '120+', label: 'Usuarios' },
          ]
        },
        speaker_notes: 'Estos datos son de la última medición trimestral.',
        image_url: null,
        manually_edited: false,
      },
      {
        id: id * 10 + 5,
        presentation_id: id,
        slide_order: 4,
        slide_type: 'quote',
        title: 'Inspiración',
        content_json: {
          quote:  'La mejor forma de predecir el futuro es crearlo.',
          author: '— Peter Drucker',
        },
        speaker_notes: '',
        image_url: null,
        manually_edited: false,
      },
      {
        id: id * 10 + 6,
        presentation_id: id,
        slide_order: 5,
        slide_type: 'closing',
        title: '¡Gracias!',
        content_json: {
          cta:          '¿Preguntas o comentarios?',
          button_label: 'Contactanos',
        },
        speaker_notes: 'Abrir espacio para preguntas del público.',
        image_url: null,
        manually_edited: false,
      },
    ],
  }
}

// ── Presentaciones en memoria (persisten en la sesión) ──
let mockPresentations = [
  makeMockPresentation(1, 'Inteligencia artificial en educación'),
  makeMockPresentation(2, 'Marketing digital para pymes'),
  makeMockPresentation(3, 'Estrategia de producto 2025'),
]
let nextId = 4

// ── Mock handlers ──
export const mockHandlers = {

  // AUTH
  'POST /auth/login': () => ({
    data: { access_token: MOCK_TOKEN, token_type: 'bearer', user: MOCK_USER }
  }),
  'POST /auth/register': () => ({
    data: { access_token: MOCK_TOKEN, token_type: 'bearer', user: MOCK_USER }
  }),

  // PRESENTACIONES
  'GET /presentations/': () => ({
    data: mockPresentations
  }),
  'GET /presentations/:id': (id) => ({
    data: mockPresentations.find(p => p.id === Number(id))
      || makeMockPresentation(Number(id))
  }),
  'POST /presentations/generate': (_, body) => {
    const newPres = makeMockPresentation(nextId++, body?.prompt || '', body?.instructions || '')
    mockPresentations.unshift(newPres)
    // Simular descuento de 1 crédito
    MOCK_USER.ai_credits = Math.max(0, MOCK_USER.ai_credits - 1)
    MOCK_USER.balance    = MOCK_USER.ai_credits
    return { data: newPres }
  },
  'PUT /presentations/:id': (id, body) => {
    mockPresentations = mockPresentations.map(p =>
      p.id === Number(id) ? { ...p, ...body, updated_at: new Date().toISOString() } : p
    )
    return { data: mockPresentations.find(p => p.id === Number(id)) }
  },
  'DELETE /presentations/:id': (id) => {
    mockPresentations = mockPresentations.filter(p => p.id !== Number(id))
    return { data: { ok: true } }
  },
  'POST /presentations/:id/publish': (id) => {
    mockPresentations = mockPresentations.map(p =>
      p.id === Number(id) ? { ...p, is_published: true, visibility: 'community' } : p
    )
    MOCK_USER.ai_credits += 3
    MOCK_USER.balance     = MOCK_USER.ai_credits
    return { data: { ok: true } }
  },

  // USUARIO / CRÉDITOS
  'GET /users/me/credits': () => ({
    data: { balance: MOCK_USER.ai_credits, name: MOCK_USER.name, transactions: [] }
  }),
  'GET /users/:id/profile': (id) => ({
    data: {
      user:          MOCK_USER,
      presentations: mockPresentations.filter(p => p.is_published),
    }
  }),

  // COMUNIDAD
  'GET /community/': () => ({
    data: {
      items: mockPresentations.filter(p => p.is_published).concat([
        makeMockPresentation(100, 'Presentación pública de ejemplo'),
        makeMockPresentation(101, 'Diseño de interfaces modernas'),
      ]),
      total: 5,
    }
  }),
  'POST /community/:id/like':   () => ({ data: { ok: true } }),
  'DELETE /community/:id/like': () => ({ data: { ok: true } }),
  'POST /community/:id/save':   () => ({ data: { ok: true } }),
  'POST /presentations/:id/fork': (id) => {
    const original = mockPresentations.find(p => p.id === Number(id))
      || makeMockPresentation(Number(id))
    const forked = { ...original, id: nextId++, title: `Copia de ${original.title}`, is_published: false }
    mockPresentations.unshift(forked)
    return { data: forked }
  },

  // TEMPLATES
  'GET /templates/': () => ({
    data: ['Minimal','Dark Mode','Corporate','Creative','Academic'].map((name, i) => ({
      id: i + 1, name, description: `Tema ${name}`, is_public: true
    }))
  }),

  // DONACIONES
  'POST /donations/': (_, body) => {
    MOCK_USER.ai_credits += body?.credits_granted || 0
    MOCK_USER.balance     = MOCK_USER.ai_credits
    return { data: { ok: true, credits_granted: body?.credits_granted } }
  },
}
