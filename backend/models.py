
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    Numeric,
    ForeignKey,
    CheckConstraint,
    text,
)
from sqlalchemy.orm import relationship
from database import Base


class Rol(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(30), nullable=False, unique=True)
    descripcion = Column(String(150))
    estado = Column(Boolean, nullable=False, server_default=text("true"))

    usuarios = relationship("Usuario", back_populates="rol")


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    id_rol = Column(Integer, ForeignKey("roles.id"), nullable=False)
    estado = Column(Boolean, nullable=False, server_default=text("true"))
    fecha_registro = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    rol = relationship("Rol", back_populates="usuarios")
    compras = relationship("Compra", back_populates="usuario")
    ventas = relationship("Venta", back_populates="usuario")
    movimientos = relationship("MovimientoStock", back_populates="usuario")


class Producto(Base):
    __tablename__ = "productos"
    __table_args__ = (
        CheckConstraint("precio_compra >= 0"),
        CheckConstraint("precio_venta >= 0"),
        CheckConstraint("stock_actual >= 0"),
        CheckConstraint("stock_minimo >= 0"),
    )

    id = Column(Integer, primary_key=True)
    codigo = Column(String(50), nullable=False, unique=True)
    nombre = Column(String(120), nullable=False)
    descripcion = Column(Text)
    precio_compra = Column(Numeric(12, 2), nullable=False)
    precio_venta = Column(Numeric(12, 2), nullable=False)
    stock_actual = Column(Integer, nullable=False, server_default=text("0"))
    stock_minimo = Column(Integer, nullable=False, server_default=text("0"))
    estado = Column(Boolean, nullable=False, server_default=text("true"))
    fecha_registro = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    detalles_compra = relationship("DetalleCompra", back_populates="producto")
    detalles_venta = relationship("DetalleVenta", back_populates="producto")
    movimientos = relationship("MovimientoStock", back_populates="producto")


class Compra(Base):
    __tablename__ = "compras"

    id = Column(Integer, primary_key=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    proveedor = Column(String(150), nullable=False)
    fecha_compra = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    total = Column(Numeric(12, 2), nullable=False, server_default=text("0"))
    estado = Column(
        String(20),
        nullable=False,
        server_default=text("'REGISTRADA'"),
    )

    usuario = relationship("Usuario", back_populates="compras")
    detalles = relationship("DetalleCompra", back_populates="compra")


class DetalleCompra(Base):
    __tablename__ = "detalle_compras"

    id = Column(Integer, primary_key=True)
    id_compra = Column(Integer, ForeignKey("compras.id"), nullable=False)
    id_producto = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    compra = relationship("Compra", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalles_compra")


class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_venta = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    total = Column(Numeric(12, 2), nullable=False, server_default=text("0"))
    estado = Column(
        String(20),
        nullable=False,
        server_default=text("'REGISTRADA'"),
    )

    usuario = relationship("Usuario", back_populates="ventas")
    detalles = relationship("DetalleVenta", back_populates="venta")


class DetalleVenta(Base):
    __tablename__ = "detalle_ventas"

    id = Column(Integer, primary_key=True)
    id_venta = Column(Integer, ForeignKey("ventas.id"), nullable=False)
    id_producto = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    venta = relationship("Venta", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalles_venta")


class MovimientoStock(Base):
    __tablename__ = "movimientos_stock"

    id = Column(Integer, primary_key=True)
    id_producto = Column(Integer, ForeignKey("productos.id"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo = Column(String(20), nullable=False)
    cantidad = Column(Integer, nullable=False)
    stock_anterior = Column(Integer, nullable=False)
    stock_nuevo = Column(Integer, nullable=False)
    motivo = Column(String(200))
    fecha_movimiento = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    producto = relationship("Producto", back_populates="movimientos")
    usuario = relationship("Usuario", back_populates="movimientos")
