from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime, date
from typing import Optional


class EmployeeBase(BaseModel):
    namn: str = Field(..., min_length=1, max_length=100)
    personnummer: str = Field(..., min_length=10, max_length=12)
    lon: Decimal = Field(..., ge=0)
    avdelning: str = Field(..., min_length=1, max_length=100)


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    namn: Optional[str] = Field(None, min_length=1, max_length=100)
    personnummer: Optional[str] = Field(None, min_length=10, max_length=12)
    lon: Optional[Decimal] = Field(None, ge=0)
    avdelning: Optional[str] = Field(None, min_length=1, max_length=100)


class EmployeeResponse(EmployeeBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SalaryRaiseBase(BaseModel):
    ny_lon: Decimal = Field(..., ge=0)
    orsak: Optional[str] = Field(None, max_length=255)


class SalaryRaiseCreate(SalaryRaiseBase):
    employee_id: int


class SalaryRaiseResponse(SalaryRaiseBase):
    id: int
    employee_id: int
    gammal_lon: Decimal
    procent_okning: Decimal
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SemesterUttagCreate(BaseModel):
    employee_id: int
    antal_dagar: int = Field(..., ge=1, le=365)
    datum: date


class SemesterUttagResponse(BaseModel):
    id: int
    employee_id: int
    antal_dagar: int
    datum: date
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SemesterSaldoResponse(BaseModel):
    employee_id: int
    year: int
    dagar_tillagda: int = 25
    dagar_uttagna: int
    saldo: int


class ManadsrapportResponse(BaseModel):
    year: int
    month: int
    total_lonekostnad: Decimal
    antal_anstallda: int
    semester_uttag_dagar: int


class SkatteberakningResponse(BaseModel):
    bruttolon: Decimal
    kommunalskatt: Decimal
    statlig_skatt: Decimal
    total_skatt: Decimal
    nettolon: Decimal
