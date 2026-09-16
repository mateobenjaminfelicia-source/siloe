from fastapi import FastAPI, HTTPException, Depends, status, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import bcrypt
import jwt
from datetime import datetime, timedelta
import json

from database import get_db_connection
from ai_service import generate_presentation, generate_structure, generate_slides_content, assemble_presentation
from config import SECRET_KEY

# --- CONFIGURACIÓN ---
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

app = FastAPI(title="Siloé API")

# CORS para que el frontend de React pueda conectar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción restringir a la URL del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS Pydantic ---
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    referral_code: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class PresentationRequest(BaseModel):
    prompt: str
    num_slides: Optional[int] = None
    language: str = "es"

# --- UTILIDADES DE AUTENTICACIÓN ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub") # Retorna el user_id
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

def get_token(authorization: str = Header(default="")):
    """Extrae el token JWT del header Authorization: Bearer <token>."""
    if authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Falta el header de autorización",
    )

# --- RUTAS DE AUTENTICACIÓN ---

@app.post("/auth/register")
def register(user: UserRegister):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Error de DB")
    cursor = conn.cursor()
    try:
        hashed = hash_password(user.password)
        # El frontend usa email; lo duplicamos en 'username' por el esquema de DB
        credits = 10
        if user.referral_code:
            credits += 5
        cursor.execute(
            "INSERT INTO users (username, name, email, password_hash, credits) VALUES (%s, %s, %s, %s, %s)",
            (user.email, user.name, user.email, hashed, credits)
        )
        user_id = cursor.lastrowid
        conn.commit()
        token = create_access_token({"sub": str(user_id)})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {"id": user_id, "name": user.name, "email": user.email, "ai_credits": credits, "balance": credits},
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/auth/login")
def login(user: UserLogin):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Error de DB")
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, name, email, password_hash, credits FROM users WHERE email = %s", (user.email,))
    db_user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = create_access_token({"sub": str(db_user["id"])})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": db_user["id"],
            "name": db_user["name"],
            "email": db_user["email"],
            "ai_credits": db_user["credits"],
            "balance": db_user["credits"],
        },
    }

# --- RUTAS DE PRESENTACIONES ---

@app.post("/presentations/generate")
def generate(req: PresentationRequest, token: str = Depends(get_token)):
    """Genera una presentación completa en un solo paso (flujo Dashboard)."""
    user_id = get_current_user(token)
    try:
        presentation_data = generate_presentation(
            prompt=req.prompt,
            num_slides=req.num_slides,
            language=req.language
        )
        presentation_data.setdefault("status", "ready")
        presentation_data.setdefault("is_published", False)

        conn = get_db_connection()
        if not conn: raise HTTPException(status_code=500, detail="Error de DB")
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO presentations (user_id, title, subtitle, content) VALUES (%s, %s, %s, %s)",
                (user_id, presentation_data["title"], presentation_data.get("subtitle", ""), json.dumps(presentation_data))
            )
            presentation_id = cursor.lastrowid
            # Descontar 1 crédito por la generación
            cursor.execute("UPDATE users SET credits = GREATEST(credits - 1, 0) WHERE id = %s", (user_id,))
            conn.commit()
            return {"id": presentation_id, **presentation_data}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error guardando en DB: {str(e)}")
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando presentación: {str(e)}")

@app.post("/presentations/structure")
def create_structure(req: PresentationRequest, token: str = Depends(get_token)):
    """Genera la estructura (paso 1 del generador paso a paso)."""
    get_current_user(token) # Validar token
    try:
        structure = generate_structure(
            prompt=req.prompt,
            num_slides=req.num_slides,
            language=req.language
        )
        return structure
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando estructura: {str(e)}")

@app.post("/presentations/finalize")
def finalize_presentation(structure: dict, token: str = Depends(get_token)):
    """Toma la estructura (posiblemente editada) y genera el contenido final."""
    user_id = get_current_user(token)
    try:
        # 1. Generar contenido final basado en la estructura editada por el usuario
        enriched_slides = generate_slides_content(structure)

        # 2. Ensamblar la presentación usando la lógica de ai_service
        presentation_data = assemble_presentation(structure, enriched_slides)
        presentation_data.setdefault("status", "ready")
        presentation_data.setdefault("is_published", False)

        # 3. Guardar en MySQL
        conn = get_db_connection()
        if not conn: raise HTTPException(status_code=500, detail="Error de DB")
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO presentations (user_id, title, subtitle, content) VALUES (%s, %s, %s, %s)",
                (user_id, presentation_data["title"], presentation_data.get("subtitle", ""), json.dumps(presentation_data))
            )
            presentation_id = cursor.lastrowid
            cursor.execute("UPDATE users SET credits = GREATEST(credits - 1, 0) WHERE id = %s", (user_id,))
            conn.commit()
            # El frontend espera la presentación directamente en res.data
            return {"id": presentation_id, **presentation_data}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error guardando en DB: {str(e)}")
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finalizando presentación: {str(e)}")

@app.get("/presentations")
def list_presentations(token: str = Depends(get_token)):
    user_id = get_current_user(token)
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Error de DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, title, created_at, content FROM presentations WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
        results = cursor.fetchall()
        for row in results:
            try:
                content = json.loads(row["content"]) if isinstance(row["content"], str) else row["content"]
            except (json.JSONDecodeError, TypeError):
                content = {}
            row.update(content)
            row.pop("content", None)
            row.setdefault("theme", "Minimal")
            row.setdefault("status", "ready")
            row.setdefault("is_published", False)
            row.setdefault("view_count", 0)
            row.setdefault("like_count", 0)
        return results
    finally:
        cursor.close()
        conn.close()

@app.get("/presentations/{pres_id}")
def get_presentation(pres_id: int, token: str = Depends(get_token)):
    user_id = get_current_user(token)
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Error de DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM presentations WHERE id = %s AND user_id = %s", (pres_id, user_id))
        res = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    if not res: raise HTTPException(status_code=404, detail="Presentación no encontrada")

    # Parsear el contenido JSON y exponerlo a nivel raíz (el editor usa res.slides)
    try:
        content = json.loads(res["content"]) if isinstance(res["content"], str) else res["content"]
    except (json.JSONDecodeError, TypeError):
        content = {}
    res.update(content)
    res.pop("content", None)
    return res

@app.put("/presentations/{pres_id}")
def update_presentation(pres_id: int, body: dict, token: str = Depends(get_token)):
    """Actualiza el contenido de una presentación (guardar desde el editor)."""
    user_id = get_current_user(token)
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Error de DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT content FROM presentations WHERE id = %s AND user_id = %s", (pres_id, user_id))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Presentación no encontrada")

        try:
            current = json.loads(row["content"]) if isinstance(row["content"], str) else row["content"]
        except (json.JSONDecodeError, TypeError):
            current = {}

        current.update(body)

        cursor.execute(
            "UPDATE presentations SET title = %s, subtitle = %s, content = %s WHERE id = %s AND user_id = %s",
            (current.get("title", ""), current.get("subtitle", ""), json.dumps(current), pres_id, user_id)
        )
        conn.commit()
        return {"id": pres_id, **current}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error actualizando presentación: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@app.delete("/presentations/{pres_id}")
def delete_presentation(pres_id: int, token: str = Depends(get_token)):
    user_id = get_current_user(token)
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Error de DB")
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM presentations WHERE id = %s AND user_id = %s", (pres_id, user_id))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Presentación no encontrada")
        return {"ok": True}
    finally:
        cursor.close()
        conn.close()

@app.post("/presentations/{pres_id}/publish")
def publish_presentation(pres_id: int, token: str = Depends(get_token)):
    user_id = get_current_user(token)
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Error de DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT content FROM presentations WHERE id = %s AND user_id = %s", (pres_id, user_id))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Presentación no encontrada")
        try:
            content = json.loads(row["content"]) if isinstance(row["content"], str) else row["content"]
        except (json.JSONDecodeError, TypeError):
            content = {}
        content["is_published"] = True
        content["visibility"] = "community"
        cursor.execute(
            "UPDATE presentations SET content = %s WHERE id = %s AND user_id = %s",
            (json.dumps(content), pres_id, user_id)
        )
        # Recompensa por publicar
        cursor.execute("UPDATE users SET credits = credits + 3 WHERE id = %s", (user_id,))
        conn.commit()
        return {"ok": True, **content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error publicando presentación: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@app.get("/users/me/credits")
def get_my_credits(token: str = Depends(get_token)):
    user_id = get_current_user(token)
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Error de DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT name, credits FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        return {
            "balance": user["credits"],
            "name": user["name"],
            "transactions": [],
        }
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)