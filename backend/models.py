from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    namn = Column(String(100), nullable=False)
    personnummer = Column(String(12), unique=True, nullable=False, index=True)
    lon = Column(Numeric(12, 2), nullable=False)
    avdelning = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    salary_raises = relationship("SalaryRaise", back_populates="employee")


class SalaryRaise(Base):
    __tablename__ = "salary_raises"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    gammal_lon = Column(Numeric(12, 2), nullable=False)
    ny_lon = Column(Numeric(12, 2), nullable=False)
    procent_okning = Column(Numeric(5, 2), nullable=False)
    orsak = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", back_populates="salary_raises")
