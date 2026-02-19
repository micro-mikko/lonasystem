from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from decimal import Decimal
from datetime import date
from models import Employee, SalaryRaise, SemesterUttag
from schemas import EmployeeCreate, EmployeeUpdate, SalaryRaiseCreate, SemesterUttagCreate


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


# ============ Semester ============

SEMESTER_DAGAR_PER_AR = 25


def create_semester_uttag(db: Session, uttag: SemesterUttagCreate):
    saldo = get_semester_saldo(db, uttag.employee_id, uttag.datum.year)
    if saldo < uttag.antal_dagar:
        return None
    db_uttag = SemesterUttag(
        employee_id=uttag.employee_id,
        antal_dagar=uttag.antal_dagar,
        datum=uttag.datum,
    )
    db.add(db_uttag)
    db.commit()
    db.refresh(db_uttag)
    return db_uttag


def get_semester_uttag(db: Session, employee_id: int = None, year: int = None, skip: int = 0, limit: int = 100):
    query = db.query(SemesterUttag)
    if employee_id:
        query = query.filter(SemesterUttag.employee_id == employee_id)
    if year:
        query = query.filter(extract("year", SemesterUttag.datum) == year)
    return query.order_by(SemesterUttag.datum.desc()).offset(skip).limit(limit).all()


def get_semester_saldo(db: Session, employee_id: int, year: int) -> int:
    """Beräknar semesterdagar kvar för anställd under ett år."""
    result = db.query(func.sum(SemesterUttag.antal_dagar)).filter(
        SemesterUttag.employee_id == employee_id,
        extract("year", SemesterUttag.datum) == year,
    ).scalar()
    uttagna = result or 0
    return SEMESTER_DAGAR_PER_AR - uttagna


def get_semester_saldon(db: Session, year: int = None):
    """Hämtar semesterbalans för alla anställda."""
    y = year or date.today().year
    employees = get_employees(db, limit=1000)
    result = []
    for emp in employees:
        uttagna = db.query(func.sum(SemesterUttag.antal_dagar)).filter(
            SemesterUttag.employee_id == emp.id,
            extract("year", SemesterUttag.datum) == y,
        ).scalar() or 0
        result.append({
            "employee_id": emp.id,
            "year": y,
            "dagar_tillagda": SEMESTER_DAGAR_PER_AR,
            "dagar_uttagna": uttagna,
            "saldo": SEMESTER_DAGAR_PER_AR - uttagna,
        })
    return result


# ============ Månadsrapport ============

def get_manadsrapport(db: Session, year: int, month: int):
    """Summerar lönekostnad, antal anställda och semesteruttag för en månad."""
    employees = get_employees(db, limit=1000)
    total_lon = sum(float(e.lon) for e in employees)
    semester_uttag = db.query(func.sum(SemesterUttag.antal_dagar)).filter(
        extract("year", SemesterUttag.datum) == year,
        extract("month", SemesterUttag.datum) == month,
    ).scalar() or 0
    return {
        "year": year,
        "month": month,
        "total_lonekostnad": Decimal(str(round(total_lon, 2))),
        "antal_anstallda": len(employees),
        "semester_uttag_dagar": int(semester_uttag),
    }
