
from getpass import getpass

from database import SessionLocal
from models import Usuario
from pwdlib import PasswordHash

def crear_administrador():
    db = SessionLocal()

    try:
        email = input("Correo del administrador: ").strip().lower()

        existente = db.query(Usuario).filter(
            Usuario.email == email
        ).first()

        if existente:
            print("Ya existe un usuario con ese correo.")
            return

        nombre = input("Nombre del administrador: ").strip()
        password = getpass("Contraseña del administrador: ")
        confirmar = getpass("Confirma la contraseña: ")

        if not nombre or not email:
            print("El nombre y el correo son obligatorios.")
            return

        if len(password) < 8:
            print("La contraseña debe tener al menos 8 caracteres.")
            return

        if password != confirmar:
            print("Las contraseñas no coinciden.")
            return

        password_hash = PasswordHash.recommended().hash(password)

        usuario = Usuario(
            nombre=nombre,
            email=email,
            password_hash=password_hash,
            id_rol=1,
            estado=True
        )

        db.add(usuario)
        db.commit()

        print("Administrador creado correctamente.")
        print("ID:", usuario.id)
        print("Correo:", usuario.email)
        print("Rol: ADMINISTRADOR")

    except Exception as e:
        db.rollback()
        print("No se pudo crear el administrador.")
        print("Detalle:", str(e))

    finally:
        db.close()

if __name__ == "__main__":
    crear_administrador()
