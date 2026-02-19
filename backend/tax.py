"""
Svensk skatteberäkning.
- Kommunalskatt: 32% av brutto
- Statlig skatt: 20% av belopp över 540 000 kr/år (45 000 kr/månad)
"""

from decimal import Decimal


def calculate_tax(annual_salary: Decimal) -> tuple[Decimal, Decimal, Decimal]:
    """
    Beräknar skatt för årslön.
    Returnerar (kommunalskatt, statlig_skatt, total_skatt).
    """
    annual = float(annual_salary)
    kommunal = annual * 0.32
    statlig_grans = 540_000
    statlig = max(0, (annual - statlig_grans) * 0.20) if annual > statlig_grans else 0
    total = kommunal + statlig
    return (
        Decimal(str(round(kommunal, 2))),
        Decimal(str(round(statlig, 2))),
        Decimal(str(round(total, 2))),
    )


def calculate_monthly_tax(monthly_salary: Decimal) -> tuple[Decimal, Decimal, Decimal]:
    """
    Beräknar skatt för månaden (månadslön).
    Returnerar (kommunalskatt, statlig_skatt, total_skatt) för månaden.
    """
    monthly = float(monthly_salary)
    annual = monthly * 12
    kommunal = monthly * 0.32
    statlig_annual = max(0, (annual - 540_000) * 0.20) if annual > 540_000 else 0
    statlig = statlig_annual / 12
    total = kommunal + statlig
    return (
        Decimal(str(round(kommunal, 2))),
        Decimal(str(round(statlig, 2))),
        Decimal(str(round(total, 2))),
    )
