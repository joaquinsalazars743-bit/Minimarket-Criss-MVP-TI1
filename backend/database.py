
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Cargar las variables del archivo .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "No se encontró DATABASE_URL en el archivo .env"
    )

# Conexión con PostgreSQL en Supabase
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

# Administrador de sesiones de base de datos
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base para los modelos SQLAlchemy
Base = declarative_base()


# Dependencia para utilizar sesiones en FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Prueba básica de conexión
def probar_conexion():
    with engine.connect() as conexion:
        resultado = conexion.execute(
            text("SELECT current_database()")
        )
        return resultado.scalar()
