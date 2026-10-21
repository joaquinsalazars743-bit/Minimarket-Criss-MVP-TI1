
from sqlalchemy import text
from database import engine, probar_conexion

try:
    nombre_bd = probar_conexion()

    with engine.connect() as conexion:
        tablas = conexion.execute(
            text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
        ).scalars().all()

    print("CONEXION EXITOSA")
    print(f"Base de datos: {nombre_bd}")
    print("Tablas encontradas:")

    for tabla in tablas:
        print(f"- {tabla}")

except Exception as error:
    print("ERROR DE CONEXION")
    print(error)
