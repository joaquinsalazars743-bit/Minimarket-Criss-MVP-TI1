from pydantic import BaseModel, ConfigDict, Field
from decimal import Decimal
from typing import Optional


class ProductoBase(BaseModel):
    codigo: str = Field(min_length=1, max_length=50)
    nombre: str = Field(min_length=1, max_length=120)
    descripcion: Optional[str] = None
    precio_compra: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    precio_venta: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    stock_actual: int = Field(default=0, ge=0)
    stock_minimo: int = Field(default=0, ge=0)


class ProductoCrear(ProductoBase):
    pass


class ProductoRespuesta(ProductoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    estado: bool