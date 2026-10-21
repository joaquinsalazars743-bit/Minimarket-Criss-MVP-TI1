
from getpass import getpass

from database import SessionLocal
from models import Usuario
from security import verificar_password

def verificar_administrador():
    db = SessionLocal()

    try:
        email = input("Correo del administrador: ").strip().lower()
        password = getpass("Contraseña que deseas comprobar: ")

        usuario = db.query(Usuario).filter(
            Usuario.email == email
        ).first()

        if usuario is None:
            print("RESULTADO: No existe un usuario con ese correo.")
            return

        print("Usuario encontrado: Sí")
        print("Estado activo:", usuario.estado)
        print("Rol:", usuario.rol.nombre if usuario.rol else "Sin rol")

        if verificar_password(password, usuario.password_hash):
            print("RESULTADO: La contraseña coincide.")
        else:
            print("RESULTADO: La contraseña NO coincide.")

    except Exception as e:
        print("No se pudo realizar la verificación.")
        print("Error:", str(e))

    finally:
        db.close()

if __name__ == "__main__":
    verificar_administrador()
