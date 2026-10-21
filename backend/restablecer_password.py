
from getpass import getpass

from database import SessionLocal
from models import Usuario
from security import crear_password_hash

def restablecer_password():
    db = SessionLocal()

    try:
        email = input("Correo del administrador: ").strip().lower()
        password = getpass("Nueva contraseña: ")
        confirmar = getpass("Confirma la nueva contraseña: ")

        if len(password) < 8:
            print("La contraseña debe tener al menos 8 caracteres.")
            return

        if password != confirmar:
            print("Las contraseñas no coinciden.")
            return

        usuario = db.query(Usuario).filter(
            Usuario.email == email
        ).first()

        if usuario is None:
            print("No existe un usuario con ese correo.")
            return

        if usuario.id_rol != 1:
            print("El usuario no tiene el rol de administrador.")
            return

        usuario.password_hash = crear_password_hash(password)
        db.commit()

        print("Contraseña actualizada correctamente.")
        print("Ahora puedes probar el inicio de sesión en Swagger.")

    except Exception as e:
        db.rollback()
        print("No se pudo actualizar la contraseña.")
        print("Detalle:", str(e))

    finally:
        db.close()

if __name__ == "__main__":
    restablecer_password()
