
from decimal import Decimal
import os


from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from models import (
    Producto,
    Usuario,
    Compra,
    DetalleCompra,
    MovimientoStock,
    Venta,
    DetalleVenta,
)
from security import (
    verificar_password,
    crear_access_token,
    obtener_usuario_actual,
    exigir_roles,
)
from schemas.producto import ProductoCrear, ProductoRespuesta
from schemas.compra import CompraCrear
from schemas.venta import VentaCrear


app = FastAPI(
    title="Sistema Minimarket Criss",
    description="API para gestionar productos, compras, ventas y stock.",
    version="1.0.0",
)


# --------------------------------------------------
# AUTENTICACIÓN
# --------------------------------------------------

class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=150)
    password: str = Field(min_length=1, max_length=128)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
origenes = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origenes)

@app.post("/api/v1/auth/login", tags=["Autenticación"])
def iniciar_sesion(
    datos: LoginRequest,
    db: Session = Depends(get_db),
):
    email = datos.email.strip().lower()

    usuario = db.query(Usuario).filter(
        Usuario.email == email
    ).first()

    if (
        usuario is None
        or not usuario.estado
        or not verificar_password(
            datos.password,
            usuario.password_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
        )

    if usuario.rol is None or not usuario.rol.estado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El rol del usuario está inactivo.",
        )

    token = crear_access_token({"sub": str(usuario.id)})

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": usuario.id,
            "nombre": usuario.nombre,
            "email": usuario.email,
            "rol": usuario.rol.nombre,
        },
    }


@app.get("/")
def inicio():
    return {
        "mensaje": "API de Minimarket Criss funcionando correctamente"
    }


# --------------------------------------------------
# PRODUCTOS
# --------------------------------------------------

@app.get(
    "/api/v1/productos",
    response_model=list[ProductoRespuesta],
    tags=["Productos"],
)
def listar_productos(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    return (
        db.query(Producto)
        .filter(Producto.estado.is_(True))
        .order_by(Producto.id.desc())
        .all()
    )


@app.get(
    "/api/v1/productos/{producto_id}",
    response_model=ProductoRespuesta,
    tags=["Productos"],
)
def obtener_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    producto = db.query(Producto).filter(
        Producto.id == producto_id,
        Producto.estado.is_(True),
    ).first()

    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado.",
        )

    return producto


@app.post(
    "/api/v1/productos",
    response_model=ProductoRespuesta,
    status_code=status.HTTP_201_CREATED,
    tags=["Productos"],
)
def crear_producto(
    datos: ProductoCrear,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        exigir_roles("ADMINISTRADOR", "ENCARGADO_ALMACEN")
    ),
):
    producto = Producto(**datos.model_dump())

    db.add(producto)

    try:
        db.commit()
        db.refresh(producto)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pudo registrar el producto. Verifica que el código no esté duplicado.",
        )

    return producto


@app.put(
    "/api/v1/productos/{producto_id}",
    response_model=ProductoRespuesta,
    tags=["Productos"],
)
def actualizar_producto(
    producto_id: int,
    datos: ProductoCrear,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        exigir_roles("ADMINISTRADOR", "ENCARGADO_ALMACEN")
    ),
):
    producto = db.query(Producto).filter(
        Producto.id == producto_id,
        Producto.estado.is_(True),
    ).first()

    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado.",
        )

    for campo, valor in datos.model_dump().items():
        setattr(producto, campo, valor)

    try:
        db.commit()
        db.refresh(producto)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pudo actualizar el producto. Verifica que el código no esté duplicado.",
        )

    return producto


@app.patch(
    "/api/v1/productos/{producto_id}/desactivar",
    response_model=ProductoRespuesta,
    tags=["Productos"],
)
def desactivar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        exigir_roles("ADMINISTRADOR", "ENCARGADO_ALMACEN")
    ),
):
    producto = db.query(Producto).filter(
        Producto.id == producto_id,
        Producto.estado.is_(True),
    ).first()

    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado o ya inactivo.",
        )

    producto.estado = False
    db.commit()
    db.refresh(producto)

    return producto


# --------------------------------------------------
# COMPRAS
# --------------------------------------------------

@app.post(
    "/api/v1/compras",
    status_code=status.HTTP_201_CREATED,
    tags=["Compras"],
)
def registrar_compra(
    datos: CompraCrear,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        exigir_roles("ADMINISTRADOR", "ENCARGADO_ALMACEN")
    ),
):
    try:
        if not datos.proveedor.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El proveedor es obligatorio.",
            )

        compra = Compra(
            id_usuario=usuario.id,
            proveedor=datos.proveedor.strip(),
            total=Decimal("0.00"),
            estado="REGISTRADA",
        )

        db.add(compra)
        db.flush()

        total_compra = Decimal("0.00")

        for detalle in datos.detalles:
            producto = (
                db.query(Producto)
                .filter(
                    Producto.id == detalle.id_producto,
                    Producto.estado.is_(True),
                )
                .with_for_update()
                .first()
            )

            if producto is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"El producto con ID {detalle.id_producto} "
                        "no existe o está inactivo."
                    ),
                )

            subtotal = detalle.precio_unitario * detalle.cantidad
            stock_anterior = producto.stock_actual
            stock_nuevo = stock_anterior + detalle.cantidad

            db.add(
                DetalleCompra(
                    id_compra=compra.id,
                    id_producto=producto.id,
                    cantidad=detalle.cantidad,
                    precio_unitario=detalle.precio_unitario,
                    subtotal=subtotal,
                )
            )

            producto.precio_compra = detalle.precio_unitario
            producto.stock_actual = stock_nuevo

            db.add(
                MovimientoStock(
                    id_producto=producto.id,
                    id_usuario=usuario.id,
                    tipo="ENTRADA",
                    cantidad=detalle.cantidad,
                    stock_anterior=stock_anterior,
                    stock_nuevo=stock_nuevo,
                    motivo=f"Compra #{compra.id}",
                )
            )

            total_compra += subtotal

        compra.total = total_compra
        db.commit()
        db.refresh(compra)

        return {
            "mensaje": "Compra registrada correctamente.",
            "id": compra.id,
            "id_usuario": compra.id_usuario,
            "proveedor": compra.proveedor,
            "total": compra.total,
            "estado": compra.estado,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo registrar la compra. Verifica la configuración y los datos.",
        )


@app.get("/api/v1/compras", tags=["Compras"])
def listar_compras(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        exigir_roles("ADMINISTRADOR", "ENCARGADO_ALMACEN")
    ),
):
    compras = (
        db.query(Compra)
        .order_by(Compra.id.desc())
        .all()
    )

    return [
        {
            "id": compra.id,
            "id_usuario": compra.id_usuario,
            "proveedor": compra.proveedor,
            "fecha_compra": compra.fecha_compra,
            "total": compra.total,
            "estado": compra.estado,
        }
        for compra in compras
    ]


# --------------------------------------------------
# VENTAS
# --------------------------------------------------

@app.post(
    "/api/v1/ventas",
    status_code=status.HTTP_201_CREATED,
    tags=["Ventas"],
)
def registrar_venta(
    datos: VentaCrear,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        exigir_roles("ADMINISTRADOR", "VENDEDOR")
    ),
):
    try:
        venta = Venta(
            id_usuario=usuario.id,
            total=Decimal("0.00"),
            estado="REGISTRADA",
        )

        db.add(venta)
        db.flush()

        total_venta = Decimal("0.00")

        for detalle in datos.detalles:
            producto = (
                db.query(Producto)
                .filter(
                    Producto.id == detalle.id_producto,
                    Producto.estado.is_(True),
                )
                .with_for_update()
                .first()
            )

            if producto is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"El producto con ID {detalle.id_producto} "
                        "no existe o está inactivo."
                    ),
                )

            if producto.stock_actual < detalle.cantidad:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Stock insuficiente para {producto.nombre}. "
                        f"Stock disponible: {producto.stock_actual}."
                    ),
                )

            precio_unitario = producto.precio_venta
            subtotal = precio_unitario * detalle.cantidad

            stock_anterior = producto.stock_actual
            stock_nuevo = stock_anterior - detalle.cantidad

            db.add(
                DetalleVenta(
                    id_venta=venta.id,
                    id_producto=producto.id,
                    cantidad=detalle.cantidad,
                    precio_unitario=precio_unitario,
                    subtotal=subtotal,
                )
            )

            producto.stock_actual = stock_nuevo

            db.add(
                MovimientoStock(
                    id_producto=producto.id,
                    id_usuario=usuario.id,
                    tipo="SALIDA",
                    cantidad=detalle.cantidad,
                    stock_anterior=stock_anterior,
                    stock_nuevo=stock_nuevo,
                    motivo=f"Venta #{venta.id}",
                )
            )

            total_venta += subtotal

        venta.total = total_venta
        db.commit()
        db.refresh(venta)

        return {
            "mensaje": "Venta registrada correctamente.",
            "id": venta.id,
            "id_usuario": venta.id_usuario,
            "total": venta.total,
            "estado": venta.estado,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo registrar la venta. Verifica la configuración y los datos.",
        )


@app.get("/api/v1/ventas", tags=["Ventas"])
def listar_ventas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        exigir_roles("ADMINISTRADOR", "VENDEDOR")
    ),
):
    ventas = (
        db.query(Venta)
        .order_by(Venta.id.desc())
        .all()
    )

    return [
        {
            "id": venta.id,
            "id_usuario": venta.id_usuario,
            "fecha_venta": venta.fecha_venta,
            "total": venta.total,
            "estado": venta.estado,
        }
        for venta in ventas
    ]


# --------------------------------------------------
# STOCK Y MOVIMIENTOS
# --------------------------------------------------

@app.get("/api/v1/stock/movimientos", tags=["Stock"])
def listar_movimientos_stock(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        exigir_roles("ADMINISTRADOR", "ENCARGADO_ALMACEN")
    ),
):
    movimientos = (
        db.query(MovimientoStock, Producto.nombre)
        .join(
            Producto,
            MovimientoStock.id_producto == Producto.id,
        )
        .order_by(MovimientoStock.id.desc())
        .all()
    )

    return [
        {
            "id": movimiento.id,
            "id_producto": movimiento.id_producto,
            "nombre_producto": nombre_producto,
            "id_usuario": movimiento.id_usuario,
            "tipo": movimiento.tipo,
            "cantidad": movimiento.cantidad,
            "stock_anterior": movimiento.stock_anterior,
            "stock_nuevo": movimiento.stock_nuevo,
            "motivo": movimiento.motivo or "Sin motivo registrado",
            "fecha_movimiento": movimiento.fecha_movimiento,
        }
        for movimiento, nombre_producto in movimientos
    ]
