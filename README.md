# Lönesystem

Ett fullstack lönesystem byggt med FastAPI (backend) och React med Tailwind CSS (frontend).

## Struktur

```
lonasystem/
├── backend/          # Python FastAPI
│   ├── main.py       # API-endpoints
│   ├── database.py   # Databaskonfiguration
│   ├── models.py     # SQLAlchemy-modeller
│   ├── schemas.py    # Pydantic-scheman
│   ├── crud.py       # CRUD-operationer
│   └── requirements.txt
├── frontend/         # React + Tailwind
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js    # API-klient
│   │   └── ...
│   └── package.json
└── README.md
```

## Krav

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

## Snabbstart

### 1. PostgreSQL

Skapa en databas:

```bash
createdb lonasystem
```

Eller med Docker:

```bash
docker run -d --name lonasystem-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=lonasystem -p 5432:5432 postgres:16
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Skapa `.env` (valfritt, standardvärden används annars):

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lonasystem
```

Starta servern:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API-dokumentation: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Öppna http://localhost:5173

## API-endpoints

### Anställda

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/employees` | Lista alla anställda |
| GET | `/api/employees/{id}` | Hämta en anställd |
| POST | `/api/employees` | Skapa anställd |
| PUT | `/api/employees/{id}` | Uppdatera anställd |
| DELETE | `/api/employees/{id}` | Ta bort anställd |

### Löneköningar

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/salary-raises` | Lista löneköningar (valfritt `?employee_id=`) |
| POST | `/api/salary-raises` | Registrera löneköning |

### Anställd (JSON)

```json
{
  "namn": "Anna Andersson",
  "personnummer": "19900101-1234",
  "lon": 35000,
  "avdelning": "IT"
}
```

### Löneköning (JSON)

```json
{
  "employee_id": 1,
  "ny_lon": 38000,
  "orsak": "Årlig löneökning"
}
```

## Licens

MIT
