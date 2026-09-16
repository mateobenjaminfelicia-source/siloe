import mysql.connector
from mysql.connector import Error

from config import DB_CONFIG

DB_NAME = DB_CONFIG["database"]

def init_db():
    try:
        # 1. Conexión inicial sin base para crearla si no existe
        server_config = {k: v for k, v in DB_CONFIG.items() if k != "database"}
        conn = mysql.connector.connect(**server_config)
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
        print(f"Base de datos '{DB_NAME}' verificada/creada.")
        cursor.close()
        conn.close()

        # 2. Conexión a la base de datos específica para crear tablas
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Tabla de Usuarios
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100),
                email VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                credits INT NOT NULL DEFAULT 10,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Migración de columnas nuevas (para bases ya existentes)
        def ensure_column(table, column, definition):
            cursor.execute(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                (DB_NAME, table, column),
            )
            if cursor.fetchone()[0] == 0:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                print(f"  + Columna '{column}' agregada a '{table}'.")

        ensure_column("users", "name", "VARCHAR(100)")
        ensure_column("users", "credits", "INT NOT NULL DEFAULT 10")

        # Tabla de Presentaciones
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS presentations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                subtitle VARCHAR(255),
                content JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        print("Tablas 'users' y 'presentations' verificadas/creadas.")
        cursor.close()
        conn.close()
        print("Inicialización de base de datos completada con éxito.")

    except Error as e:
        print(f"Error conectando a MySQL: {e}")

if __name__ == "__main__":
    init_db()
