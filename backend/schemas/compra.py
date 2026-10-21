
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict


class DetalleCompraCrear(BaseModel):
    id_producto: int = Field(gt=0)
    cantidad: int = Field(gt=0)
    precio_unitario: Decimal = Field(
        ge=0,
        max_digits=12,
        decimal_places=2
    )


class CompraCrear(BaseModel):
    id_usuario: int = Field(gt=0)
    proveedor: str = Field(min_length=1, max_length=150)
    detalles: list[DetalleCompraCrear] = Field(min_length=1)


class DetalleCompraRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_producto: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal


class CompraRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_usuario: int
    proveedor: str
    total: Decimal
    estado: str
