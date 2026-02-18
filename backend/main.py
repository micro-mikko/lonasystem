from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, get_db, Base
from models import Employee, SalaryRaise
from schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
    SalaryRaiseCreate, SalaryRaiseResponse
)
from crud import (
    get_employee, get_employees, create_employee, update_employee, delete_employee,
    get_employee_by_personnummer,
    create_salary_raise, get_salary_raises
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Lönesystem API",
    description="API för att hantera anställda och löneköningar",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Anställda ============

@app.get("/api/employees", response_model=list[EmployeeResponse])
def list_employees(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_employees(db, skip=skip, limit=limit)


@app.get("/api/employees/{employee_id}", response_model=EmployeeResponse)
def read_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Anställd hittades inte")
    return employee


@app.post("/api/employees", response_model=EmployeeResponse)
def add_employee(employee: EmployeeCreate, db: Session = Depends(get_db)):
    existing = get_employee_by_personnummer(db, employee.personnummer)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="En anställd med detta personnummer finns redan"
        )
    return create_employee(db, employee)


@app.put("/api/employees/{employee_id}", response_model=EmployeeResponse)
def modify_employee(employee_id: int, employee: EmployeeUpdate, db: Session = Depends(get_db)):
    if not get_employee(db, employee_id):
        raise HTTPException(status_code=404, detail="Anställd hittades inte")
    if employee.personnummer:
        existing = get_employee_by_personnummer(db, employee.personnummer)
        if existing and existing.id != employee_id:
            raise HTTPException(
                status_code=400,
                detail="En annan anställd har redan detta personnummer"
            )
    db_employee = update_employee(db, employee_id, employee)
    return db_employee


@app.delete("/api/employees/{employee_id}")
def remove_employee(employee_id: int, db: Session = Depends(get_db)):
    if not delete_employee(db, employee_id):
        raise HTTPException(status_code=404, detail="Anställd hittades inte")
    return {"message": "Anställd borttagen"}


# ============ Löneköningar ============

@app.get("/api/salary-raises", response_model=list[SalaryRaiseResponse])
def list_salary_raises(
    employee_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return get_salary_raises(db, employee_id=employee_id, skip=skip, limit=limit)


@app.post("/api/salary-raises", response_model=SalaryRaiseResponse)
def add_salary_raise(salary_raise: SalaryRaiseCreate, db: Session = Depends(get_db)):
    result = create_salary_raise(db, salary_raise)
    if not result:
        raise HTTPException(
            status_code=400,
            detail="Anställd hittades inte eller ny lön måste vara högre än nuvarande"
        )
    return result
