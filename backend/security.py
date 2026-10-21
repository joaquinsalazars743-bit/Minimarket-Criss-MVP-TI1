
import os
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models import Usuario


# Configuración de seguridad
SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "Falta configurar JWT_SECRET_KEY en el archivo .env"
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

password_hasher = PasswordHash.recommended()

bearer_scheme = HTTPBearer()


def verificar_password(password: str, password_hash: str) -> bool:
    """Comprueba una contraseña frente a su hash almacenado."""
    return password_hasher.verify(password, password_hash)


def crear_password_hash(password: str) -> str:
    """Genera un hash seguro para una contraseña."""
    return password_hasher.hash(password)


def crear_access_token(datos: dict) -> str:
    """Genera un JWT con vencimiento."""
    contenido = datos.copy()

    vencimiento = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    contenido.update({"exp": vencimiento})

    return jwt.encode(
        contenido,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def obtener_usuario_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    """Valida el JWT y obtiene al usuario autenticado."""

    error_credenciales = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="La sesión no es válida o ha expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credenciales.credentials

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        usuario_id = payload.get("sub")

        if usuario_id is None:
            raise error_credenciales

        usuario_id = int(usuario_id)

    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise error_credenciales

    usuario = db.query(Usuario).filter(
        Usuario.id == usuario_id,
        Usuario.estado.is_(True),
    ).first()

    if usuario is None:
        raise error_credenciales

    if usuario.rol is None or not usuario.rol.estado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El rol del usuario está inactivo.",
        )

    return usuario


def exigir_roles(*roles_permitidos: str):
    """Restringe el acceso a determinados roles."""

    def verificar_rol(
        usuario: Usuario = Depends(obtener_usuario_actual),
    ) -> Usuario:

        nombre_rol = usuario.rol.nombre.upper()

        if nombre_rol not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta operación.",
            )

        return usuario

    return verificar_rol
