
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class DetalleVentaCrear(BaseModel):
    id_producto: int = Field(gt=0)
    cantidad: int = Field(gt=0)


class VentaCrear(BaseModel):
    id_usuario: int = Field(gt=0)
    detalles: list[DetalleVentaCrear] = Field(min_length=1)


class DetalleVentaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_producto: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal


class VentaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_usuario: int
    total: Decimal
    estado: str
