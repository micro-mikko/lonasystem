from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import date

from database import engine, get_db, Base
from models import Employee, SalaryRaise, SemesterUttag
from schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
    SalaryRaiseCreate, SalaryRaiseResponse,
    SemesterUttagCreate, SemesterUttagResponse,
    SkatteberakningResponse, ManadsrapportResponse,
)
from crud import (
    get_employee, get_employees, create_employee, update_employee, delete_employee,
    get_employee_by_personnummer,
    create_salary_raise, get_salary_raises,
    create_semester_uttag, get_semester_uttag, get_semester_saldon,
    get_manadsrapport,
)

from tax import calculate_monthly_tax
from pdf_service import generate_payslip_pdf

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Lönesystem API",
    description="API för att hantera anställda och löneköningar",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ],
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


# ============ Lönespec PDF ============

@app.get("/api/employees/{employee_id}/payslip")
def get_payslip_pdf(
    employee_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2030),
    db: Session = Depends(get_db),
):
    employee = get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Anställd hittades inte")
    pdf_bytes = generate_payslip_pdf(
        namn=employee.namn,
        personnummer=employee.personnummer,
        lon=employee.lon,
        avdelning=employee.avdelning,
        month=month,
        year=year,
    )
    filename = f"lonespec_{employee.namn.replace(' ', '_')}_{year}_{month:02d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ============ Skatteberäkning ============

@app.get("/api/tax/calculate", response_model=SkatteberakningResponse)
def calculate_tax_endpoint(
    employee_id: int = Query(None),
    lon: float = Query(None),
    db: Session = Depends(get_db),
):
    """Beräknar skatt. Ange employee_id eller lon (månadslön)."""
    if employee_id:
        employee = get_employee(db, employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Anställd hittades inte")
        bruttolon = employee.lon
    elif lon is not None:
        from decimal import Decimal
        bruttolon = Decimal(str(lon))
    else:
        raise HTTPException(status_code=400, detail="Ange employee_id eller lon")
    kommunal, statlig, total_skatt = calculate_monthly_tax(bruttolon)
    nettolon = bruttolon - total_skatt
    return SkatteberakningResponse(
        bruttolon=bruttolon,
        kommunalskatt=kommunal,
        statlig_skatt=statlig,
        total_skatt=total_skatt,
        nettolon=nettolon,
    )


# ============ Semester ============

@app.get("/api/semester/saldo")
def list_semester_saldon(
    year: int = Query(default=None),
    db: Session = Depends(get_db),
):
    y = year or date.today().year
    return get_semester_saldon(db, y)


@app.get("/api/semester/uttag", response_model=list[SemesterUttagResponse])
def list_semester_uttag(
    employee_id: int = None,
    year: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return get_semester_uttag(db, employee_id=employee_id, year=year, skip=skip, limit=limit)


@app.post("/api/semester/uttag", response_model=SemesterUttagResponse)
def add_semester_uttag(uttag: SemesterUttagCreate, db: Session = Depends(get_db)):
    result = create_semester_uttag(db, uttag)
    if not result:
        raise HTTPException(
            status_code=400,
            detail="Otillräckligt semesterdagar kvar eller ogiltig anställd"
        )
    return result


# ============ Månadsrapport ============

@app.get("/api/reports/monthly", response_model=ManadsrapportResponse)
def get_monthly_report(
    year: int = Query(..., ge=2020, le=2030),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
):
    return get_manadsrapport(db, year, month)
