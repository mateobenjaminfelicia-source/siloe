"""
ai_service.py — Módulo de IA de Siloé
======================================
Responsabilidad: generar presentaciones completas usando la API de Gemini.
NO guarda en base de datos — eso es tarea del router.

Flujo:
    1. _generate_structure()     → Gemini devuelve esqueleto JSON (títulos, tipos de slide)
    2. _generate_slides_content() → Gemini enriquece cada slide con contenido completo
    3. generate_presentation()   → orquesta ambos pasos y devuelve el resultado final
"""

import json
import time
from typing import Optional
from google import genai
from google.genai import errors

from config import GEMINI_API_KEY

# ---------------------------------------------------------------------------
# Cliente y configuración
# ---------------------------------------------------------------------------

client = genai.Client(
    api_key=GEMINI_API_KEY
)

MODEL = "gemini-2.5-flash"

# Tipos de slide válidos (deben coincidir con los del frontend)
VALID_SLIDE_TYPES = {"title", "bullets", "text", "two_col", "quote", "data", "image", "closing"}


# ---------------------------------------------------------------------------
# Prompts del sistema
# ---------------------------------------------------------------------------

STRUCTURE_SYSTEM_PROMPT = """
Eres un experto en diseño de presentaciones profesionales.
Tu tarea es analizar el prompt del usuario y generar la ESTRUCTURA de una presentación.

Debes devolver ÚNICAMENTE un objeto JSON válido, sin texto adicional, sin bloques de código, sin explicaciones.

El JSON debe tener este formato exacto:
{
  "title": "Título principal de la presentación",
  "subtitle": "Subtítulo o descripción breve",
  "language": "es",
  "tone": "profesional",
  "audience": "audiencia detectada",
  "theme_suggestion": "modern | minimal | corporate | creative | dark",
  "slides": [
    {
      "slide_order": 1,
      "slide_type": "title",
      "title": "Título del slide",
      "key_points": ["punto 1", "punto 2"],
      "speaker_notes": "Nota opcional para el orador"
    }
  ]
}

Tipos de slide disponibles:
- title    → Portada (siempre debe ser el primero)
- bullets  → Lista de puntos clave
- text     → Párrafo explicativo
- two_col  → Dos columnas de contenido
- quote    → Cita o frase destacada
- data     → Estadísticas o datos numéricos
- image    → Slide visual con caption
- closing  → Cierre / llamado a la acción (siempre debe ser el último)

Reglas:
- El primer slide SIEMPRE es de tipo "title"
- El último slide SIEMPRE es de tipo "closing"
- Cantidad de slides: entre 5 y 12 según la complejidad del tema
- Los key_points son títulos/ideas breves, NO el contenido completo (eso viene después)
- Si el usuario especifica cantidad de slides, respeta ese número
"""

CONTENT_SYSTEM_PROMPT = """
Eres un experto en comunicación y diseño de contenido para presentaciones.
Tu tarea es enriquecer los slides de una presentación con contenido completo y de alta calidad.

Recibirás la estructura de una presentación en JSON y debes devolver ÚNICAMENTE un array JSON
con el contenido enriquecido de cada slide. Sin texto adicional, sin bloques de código.

Para cada slide, devuelve un objeto con este formato:
{
  "slide_order": 1,
  "slide_type": "bullets",
  "title": "Título del slide",
  "content_json": { ... },
  "speaker_notes": "Notas ampliadas para el orador"
}

El campo "content_json" varía según el tipo de slide (usa EXACTAMENTE estos nombres de campo, el frontend depende de ellos):

- title:
  { "subtitle": "Subtítulo de la portada" }

- bullets:
  { "bullets": ["punto completo 1", "punto 2", ...] }

- text:
  { "body": "Párrafo completo de 3-5 oraciones." }

- two_col:
  { "left_title": "...", "left_body": "..." , "right_title": "...", "right_body": "..." }

- quote:
  { "quote": "La cita completa aquí.", "author": "Autor o fuente" }

- data:
  { "stats": [{ "value": "95%", "label": "descripción" }] }

- image:
  { "caption": "Descripción de la imagen", "image_suggestion": "Qué imagen ilustraría este slide" }

- closing:
  { "cta": "Mensaje de cierre o llamado a la acción", "button_label": "Texto del botón" }

Reglas:
- El contenido debe ser coherente con el tema y tono de la presentación
- Lenguaje claro, directo y apropiado para la audiencia
- NO inventes datos estadísticos — si el slide es tipo "data", usa datos plausibles con fuente indicada
- Mantén el idioma detectado en toda la presentación
"""


# ---------------------------------------------------------------------------
# Helper: llamada unificada a Gemini
# ---------------------------------------------------------------------------

def _call_gemini(system_prompt: str, user_message: str) -> str:
    """
    Centraliza todas las llamadas a Gemini.
    Gemini no tiene parámetro 'system' nativo en el SDK básico,
    así que lo inyectamos como prefijo del mensaje del usuario.
    Incluye reintentos automáticos para errores 503 (alta demanda).

    Returns:
        El texto crudo de la respuesta.
    """
    full_prompt = f"{system_prompt}\n\n---\n\n{user_message}"

    max_retries = 3
    base_delay = 2  # segundos

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=full_prompt
            )
            return response.text.strip()

        except errors.ServerError as e:
            if e.code == 503 and attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)  # backoff exponencial: 2s, 4s, 8s
                print(f"Gemini 503 (intento {attempt + 1}/{max_retries}). Reintentando en {delay}s...")
                time.sleep(delay)
                continue
            raise
        except Exception as e:
            # Otros errores no se reintentan
            raise


# ---------------------------------------------------------------------------
# Funciones privadas
# ---------------------------------------------------------------------------

def generate_structure(
    prompt: str,
    num_slides: Optional[int] = None,
    language: str = "es",
    instructions: Optional[str] = None
) -> dict:
    """
    Llamado a Gemini: analiza el prompt y devuelve la estructura
    de la presentación como dict Python (deserializado desde JSON).
    """
    user_message = f"Crea la estructura de una presentación sobre: {prompt}"


    if num_slides:
        user_message += f"\nCantidad de slides solicitada: {num_slides}"

    user_message += f"\nIdioma preferido: {language}"

    # ── Instrucciones personalizadas del usuario ──
    if instructions and instructions.strip():
        user_message += (
            f"\n\nInstrucciones personalizadas del autor (respetalas SIEMPRE):\n"
            f"{instructions.strip()}"
        )

    raw_text = _call_gemini(STRUCTURE_SYSTEM_PROMPT, user_message)

    # Gemini a veces envuelve el JSON en ```json ... ``` — lo limpiamos
    raw_text = _strip_code_fences(raw_text)

    try:
        structure = json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Gemini no devolvió JSON válido en el paso de estructura.\n"
            f"Error: {e}\n"
            f"Respuesta recibida: {raw_text[:500]}"
        )

    required_keys = {"title", "slides"}
    if not required_keys.issubset(structure.keys()):
        raise ValueError(
            f"La estructura generada no tiene las claves requeridas. "
            f"Claves presentes: {list(structure.keys())}"
        )

    if not isinstance(structure["slides"], list) or len(structure["slides"]) == 0:
        raise ValueError("La estructura no contiene slides válidos.")

    # Incluimos las instrucciones en la estructura para que persistan en el flujo de dos pasos
    return {
        **structure,
        "instructions": instructions
    }


def generate_slides_content(structure: dict, instructions: Optional[str] = None) -> list[dict]:
    """
    Llamado a Gemini: toma la estructura y genera el contenido
    completo de todos los slides en un único llamado (batch).
    """

    user_message = (
        f"Enriquece el contenido de esta presentación:\n\n"
        f"{json.dumps(structure, ensure_ascii=False, indent=2)}"
    )

    # ── Instrucciones personalizadas del usuario ──
    actual_instructions = instructions or structure.get("instructions")
    if actual_instructions and actual_instructions.strip():
        user_message += (
            f"\n\nInstrucciones personalizadas del autor (respetalas SIEMPRE):\n"
            f"{actual_instructions.strip()}"
        )

    raw_text = _call_gemini(CONTENT_SYSTEM_PROMPT, user_message)
    raw_text = _strip_code_fences(raw_text)

    try:
        enriched_slides = json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Gemini no devolvió JSON válido en el paso de contenido.\n"
            f"Error: {e}\n"
            f"Respuesta recibida: {raw_text[:500]}"
        )

    if not isinstance(enriched_slides, list):
        raise ValueError(
            f"Se esperaba un array de slides, pero se recibió: {type(enriched_slides)}"
        )

    return enriched_slides


def assemble_presentation(structure: dict, enriched_slides: list[dict]) -> dict:
    """
    Combina los metadatos de la estructura con el contenido enriquecido.
    Resultado final listo para ser devuelto al router.
    """

    content_map = {slide["slide_order"]: slide for slide in enriched_slides}

    assembled_slides = []
    for skeleton_slide in structure["slides"]:
        order = skeleton_slide["slide_order"]
        enriched = content_map.get(order, {})

        assembled_slides.append({
            "slide_order":   order,
            "slide_type":    skeleton_slide.get("slide_type", "text"),
            "title":         skeleton_slide.get("title", "") or enriched.get("title", ""),
            "content_json":  enriched.get("content_json", {}),
            "speaker_notes": enriched.get("speaker_notes") or skeleton_slide.get("speaker_notes", ""),
            "image_url":     None,
        })

    return {
        "title":            structure.get("title", ""),
        "subtitle":         structure.get("subtitle", ""),
        "language":         structure.get("language", "es"),
        "tone":             structure.get("tone", ""),
        "audience":         structure.get("audience", ""),
        "theme_suggestion": structure.get("theme_suggestion", "modern"),
        "theme":            THEME_MAP.get(structure.get("theme_suggestion", "").lower(), "Minimal"),
        "background":       BACKGROUND_MAP.get(
                                THEME_MAP.get(structure.get("theme_suggestion", "").lower(), "Minimal"),
                                "aurora"
                            ),
        "slides":           assembled_slides,
    }


# Mapa de tema sugerido por la IA → nombre de tema del frontend
THEME_MAP = {
    "modern":   "Minimal",
    "minimal":  "Minimal",
    "dark":     "Dark Mode",
    "corporate": "Corporate",
    "creative": "Creative",
    "academic": "Academic",
}

# Tema del frontend → fondo decorativo por defecto
# Así ninguna presentación nueva queda sin color ni figuras.
BACKGROUND_MAP = {
    "Minimal":    "pearl",
    "Dark Mode":  "aurora",
    "Corporate":  "ocean",
    "Creative":   "sunset",
    "Academic":   "forest",
}


# ---------------------------------------------------------------------------
# Utilidad: limpiar bloques de código que Gemini suele agregar
# ---------------------------------------------------------------------------

def _strip_code_fences(text: str) -> str:
    """
    Gemini frecuentemente envuelve JSON en ```json ... ```.
    Esta función los elimina para que json.loads() no explote.
    """
    if text.startswith("```"):
        lines = text.splitlines()
        # Saca la primera línea (```json o ```) y la última (```)
        lines = lines[1:] if lines[0].startswith("```") else lines
        lines = lines[:-1] if lines and lines[-1].strip() == "```" else lines
        return "\n".join(lines).strip()
    return text


# ---------------------------------------------------------------------------
# Función pública principal
# ---------------------------------------------------------------------------

def generate_presentation(
    prompt: str,
    num_slides: Optional[int] = None,
    language: str = "es",
    instructions: Optional[str] = None
) -> dict:
    """
    Orquestador principal. Ejecuta el flujo completo de generación en dos pasos.
    Esta es la única función que el router debe llamar.
    """
    # ── Paso 1: Estructura ────────────────────────────────────────────────
    structure = generate_structure(
        prompt=prompt,
        num_slides=num_slides,
        language=language,
        instructions=instructions
    )

    # ── Paso 2: Contenido ─────────────────────────────────────────────────
    enriched_slides = generate_slides_content(structure, instructions=instructions)


    # ── Paso 3: Ensamblado ────────────────────────────────────────────────
    presentation = assemble_presentation(structure, enriched_slides)

    return presentation


if __name__ == "__main__":
    result = generate_presentation(
        prompt="Historia de la inteligencia artificial",
        num_slides=6
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))