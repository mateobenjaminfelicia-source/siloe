"""
config.py — Configuración de Siloé.
Lee las variables de un archivo .env local (si existe) y del entorno del sistema.
El .env real NO se versiona. Para estructura ver .env.example.
"""

import os
from pathlib import Path

_BASE = Path(__file__).resolve().parent


def _load_dotenv(path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(_BASE / ".env")


def _get(key, default=""):
    return os.environ.get(key, default)


GEMINI_API_KEY = _get("GEMINI_API_KEY")
SECRET_KEY = _get("SECRET_KEY")

DB_CONFIG = {
    "host": _get("DB_HOST", "localhost"),
    "user": _get("DB_USER", "root"),
    "password": _get("DB_PASSWORD"),
    "database": _get("DB_NAME", "siloe"),
}