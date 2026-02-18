from sqlalchemy.orm import Session
from decimal import Decimal
from models import Employee, SalaryRaise
from schemas import EmployeeCreate, EmployeeUpdate, SalaryRaiseCreate


def get_employee(db: Session, employee_id: int):
    return db.query(Employee).filter(Employee.id == employee_id).first()


def get_employees(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Employee).offset(skip).limit(limit).all()


def get_employee_by_personnummer(db: Session, personnummer: str):
    return db.query(Employee).filter(Employee.personnummer == personnummer).first()


def create_employee(db: Session, employee: EmployeeCreate):
    db_employee = Employee(
        namn=employee.namn,
        personnummer=employee.personnummer,
        lon=employee.lon,
        avdelning=employee.avdelning
    )
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee


def update_employee(db: Session, employee_id: int, employee_update: EmployeeUpdate):
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return None
    update_data = employee_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_employee, key, value)
    db.commit()
    db.refresh(db_employee)
    return db_employee


def delete_employee(db: Session, employee_id: int):
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return False
    db.delete(db_employee)
    db.commit()
    return True


def create_salary_raise(db: Session, salary_raise: SalaryRaiseCreate):
    db_employee = get_employee(db, salary_raise.employee_id)
    if not db_employee:
        return None
    
    gammal_lon = db_employee.lon
    ny_lon = salary_raise.ny_lon
    
    if ny_lon <= gammal_lon:
        return None  # Ny lön måste vara högre
    
    procent_okning = float((ny_lon - gammal_lon) / gammal_lon * 100)
    
    db_salary_raise = SalaryRaise(
        employee_id=salary_raise.employee_id,
        gammal_lon=gammal_lon,
        ny_lon=ny_lon,
        procent_okning=Decimal(str(round(procent_okning, 2))),
        orsak=salary_raise.orsak
    )
    db.add(db_salary_raise)
    
    # Uppdatera anställdens lön
    db_employee.lon = ny_lon
    db.commit()
    db.refresh(db_salary_raise)
    return db_salary_raise


def get_salary_raises(db: Session, employee_id: int = None, skip: int = 0, limit: int = 100):
    query = db.query(SalaryRaise)
    if employee_id:
        query = query.filter(SalaryRaise.employee_id == employee_id)
    return query.order_by(SalaryRaise.created_at.desc()).offset(skip).limit(limit).all()
