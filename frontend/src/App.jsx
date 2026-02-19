import { useState, useEffect } from 'react'
import { api } from './api'

const TAB_OPTIONS = [
  { id: 'employees', label: 'Anställda' },
  { id: 'raises', label: 'Löneköningar' },
  { id: 'semester', label: 'Semester' },
  { id: 'report', label: 'Månadsrapport' },
]

function App() {
  const [employees, setEmployees] = useState([])
  const [salaryRaises, setSalaryRaises] = useState([])
  const [semesterSaldo, setSemesterSaldo] = useState([])
  const [semesterUttag, setSemesterUttag] = useState([])
  const [monthlyReport, setMonthlyReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('employees')
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [showRaiseForm, setShowRaiseForm] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showPayslipModal, setShowPayslipModal] = useState(false)
  const [payslipEmployee, setPayslipEmployee] = useState(null)
  const [showSemesterUttagForm, setShowSemesterUttagForm] = useState(false)
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1)
  const [semesterYear, setSemesterYear] = useState(new Date().getFullYear())
  const [reportLoading, setReportLoading] = useState(false)

  const loadEmployees = async () => {
    try {
      const data = await api.employees.list()
      setEmployees(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const loadSalaryRaises = async () => {
    try {
      const data = await api.salaryRaises.list()
      setSalaryRaises(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const loadSemesterData = async () => {
    try {
      const [saldo, uttag] = await Promise.all([
        api.semester.saldo(semesterYear),
        api.semester.uttagList(null, semesterYear),
      ])
      setSemesterSaldo(saldo)
      setSemesterUttag(uttag)
    } catch (err) {
      setError(err.message)
    }
  }

  const loadMonthlyReport = async () => {
    setReportLoading(true)
    try {
      const data = await api.reports.monthly(reportYear, reportMonth)
      setMonthlyReport(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setReportLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([loadEmployees(), loadSalaryRaises()])
      } catch (err) {
        setError(err?.message || 'Kunde inte ladda data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (activeTab === 'semester') loadSemesterData()
  }, [activeTab, semesterYear])

  useEffect(() => {
    if (activeTab === 'report') loadMonthlyReport()
  }, [activeTab, reportYear, reportMonth])

  const handleEmployeeSubmit = async (formData) => {
    try {
      if (editingEmployee) {
        await api.employees.update(editingEmployee.id, formData)
      } else {
        await api.employees.create(formData)
      }
      await loadEmployees()
      setShowEmployeeForm(false)
      setEditingEmployee(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteEmployee = async (id) => {
    if (!confirm('Är du säker på att du vill ta bort denna anställd?')) return
    try {
      await api.employees.delete(id)
      await loadEmployees()
      await loadSalaryRaises()
      if (activeTab === 'semester') loadSemesterData()
      if (activeTab === 'report') loadMonthlyReport()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRaiseSubmit = async (formData) => {
    try {
      await api.salaryRaises.create(formData)
      await loadEmployees()
      await loadSalaryRaises()
      setShowRaiseForm(false)
      setSelectedEmployee(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDownloadPayslip = async (emp, month, year) => {
    try {
      const blob = await api.employees.payslipPdf(emp.id, month, year)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lonespec_${emp.namn.replace(/\s/g, '_')}_${year}_${String(month).padStart(2, '0')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setShowPayslipModal(false)
      setPayslipEmployee(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSemesterUttagSubmit = async (formData) => {
    try {
      await api.semester.uttagCreate(formData)
      await loadSemesterData()
      setShowSemesterUttagForm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
    }).format(Number(value))
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('sv-SE')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Laddar...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-800">Lönesystem</h1>
          <p className="text-slate-500 mt-1">Hantera anställda och löneköningar</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-500 hover:text-red-700 underline"
            >
              Stäng
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-8">
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'employees' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-800">Anställda</h2>
              <button
                onClick={() => {
                  setEditingEmployee(null)
                  setShowEmployeeForm(true)
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
              >
                + Lägg till anställd
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {employees.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  Inga anställda registrerade. Klicka på &quot;Lägg till anställd&quot; för att börja.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-4 font-semibold text-slate-600">Namn</th>
                      <th className="text-left px-6 py-4 font-semibold text-slate-600">Personnummer</th>
                      <th className="text-left px-6 py-4 font-semibold text-slate-600">Avdelning</th>
                      <th className="text-right px-6 py-4 font-semibold text-slate-600">Lön</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-medium text-slate-800">{emp.namn}</td>
                        <td className="px-6 py-4 text-slate-600">{emp.personnummer}</td>
                        <td className="px-6 py-4 text-slate-600">{emp.avdelning}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-800">
                          {formatCurrency(emp.lon)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2 justify-end">
                            <button
                              onClick={() => {
                                setPayslipEmployee(emp)
                                setShowPayslipModal(true)
                              }}
                              className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                            >
                              Lönespec PDF
                            </button>
                            <button
                              onClick={() => {
                                setEditingEmployee(emp)
                                setShowEmployeeForm(true)
                              }}
                              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                            >
                              Redigera
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEmployee(emp)
                                setShowRaiseForm(true)
                              }}
                              className="text-green-600 hover:text-green-700 text-sm font-medium"
                            >
                              Löneköning
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Ta bort
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'raises' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-800">Löneköningar</h2>
              <button
                onClick={() => {
                  setSelectedEmployee(null)
                  setShowRaiseForm(true)
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
              >
                + Registrera löneköning
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {salaryRaises.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  Inga löneköningar registrerade.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-4 font-semibold text-slate-600">Anställd ID</th>
                      <th className="text-right px-6 py-4 font-semibold text-slate-600">Gammal lön</th>
                      <th className="text-right px-6 py-4 font-semibold text-slate-600">Ny lön</th>
                      <th className="text-right px-6 py-4 font-semibold text-slate-600">Ökning</th>
                      <th className="text-left px-6 py-4 font-semibold text-slate-600">Orsak</th>
                      <th className="text-left px-6 py-4 font-semibold text-slate-600">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryRaises.map((r) => {
                      const emp = employees.find((e) => e.id === r.employee_id)
                      return (
                        <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-medium text-slate-800">
                            {emp ? emp.namn : `#${r.employee_id}`}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600">
                            {formatCurrency(r.gammal_lon)}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-800">
                            {formatCurrency(r.ny_lon)}
                          </td>
                          <td className="px-6 py-4 text-right text-green-600 font-medium">
                            +{Number(r.procent_okning)}%
                          </td>
                          <td className="px-6 py-4 text-slate-600">{r.orsak || '-'}</td>
                          <td className="px-6 py-4 text-slate-600">{formatDate(r.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'semester' && (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <h2 className="text-xl font-semibold text-slate-800">Semesterhantering</h2>
              <div className="flex gap-2 items-center">
                <label className="text-sm text-slate-600">År:</label>
                <select
                  value={semesterYear}
                  onChange={(e) => setSemesterYear(Number(e.target.value))}
                  className="px-3 py-2 border border-slate-200 rounded-lg"
                >
                  {[2024, 2025, 2026].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowSemesterUttagForm(true)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
                >
                  + Registrera semesteruttag
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Anställd</th>
                    <th className="text-right px-6 py-4 font-semibold text-slate-600">Tillagda (25/år)</th>
                    <th className="text-right px-6 py-4 font-semibold text-slate-600">Uttagna</th>
                    <th className="text-right px-6 py-4 font-semibold text-slate-600">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterSaldo.map((s) => {
                    const emp = employees.find((e) => e.id === s.employee_id)
                    return (
                      <tr key={s.employee_id} className="border-b border-slate-100">
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {emp ? emp.namn : `#${s.employee_id}`}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">{s.dagar_tillagda}</td>
                        <td className="px-6 py-4 text-right text-slate-600">{s.dagar_uttagna}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-800">{s.saldo}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {semesterSaldo.length === 0 && (
                <div className="p-12 text-center text-slate-500">Inga anställda med semesterdata.</div>
              )}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <h3 className="px-6 py-4 font-semibold text-slate-800 border-b border-slate-200">Semesteruttag {semesterYear}</h3>
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Anställd</th>
                    <th className="text-right px-6 py-4 font-semibold text-slate-600">Dagar</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterUttag.map((u) => {
                    const emp = employees.find((e) => e.id === u.employee_id)
                    return (
                      <tr key={u.id} className="border-b border-slate-100">
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {emp ? emp.namn : `#${u.employee_id}`}
                        </td>
                        <td className="px-6 py-4 text-right">{u.antal_dagar}</td>
                        <td className="px-6 py-4 text-slate-600">{formatDate(u.datum)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {semesterUttag.length === 0 && (
                <div className="p-8 text-center text-slate-500">Inga semesteruttag registrerade.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <h2 className="text-xl font-semibold text-slate-800">Månadsrapport</h2>
              <div className="flex gap-2 items-center">
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(Number(e.target.value))}
                  className="px-3 py-2 border border-slate-200 rounded-lg"
                >
                  {[2024, 2025, 2026].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(Number(e.target.value))}
                  className="px-3 py-2 border border-slate-200 rounded-lg"
                >
                  {[
                    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
                    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
                  ].map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
            {reportLoading ? (
              <div className="p-12 text-center text-slate-500">Laddar rapport...</div>
            ) : monthlyReport ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <p className="text-sm text-slate-500">Total lönekostnad</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {formatCurrency(monthlyReport.total_lonekostnad)}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <p className="text-sm text-slate-500">Antal anställda</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {monthlyReport.antal_anstallda}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <p className="text-sm text-slate-500">Semesteruttag (dagar)</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {monthlyReport.semester_uttag_dagar}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500">Välj månad och år.</div>
            )}
          </div>
        )}
      </main>

      {showPayslipModal && payslipEmployee && (
        <PayslipModal
          employee={payslipEmployee}
          onClose={() => {
            setShowPayslipModal(false)
            setPayslipEmployee(null)
          }}
          onDownload={handleDownloadPayslip}
        />
      )}

      {showSemesterUttagForm && (
        <SemesterUttagModal
          employees={employees}
          semesterSaldo={semesterSaldo}
          onClose={() => setShowSemesterUttagForm(false)}
          onSubmit={handleSemesterUttagSubmit}
        />
      )}

      {showEmployeeForm && (
        <EmployeeFormModal
          employee={editingEmployee}
          onClose={() => {
            setShowEmployeeForm(false)
            setEditingEmployee(null)
          }}
          onSubmit={handleEmployeeSubmit}
        />
      )}

      {showRaiseForm && (
        <RaiseFormModal
          employees={employees}
          preselectedEmployee={selectedEmployee}
          onClose={() => {
            setShowRaiseForm(false)
            setSelectedEmployee(null)
          }}
          onSubmit={handleRaiseSubmit}
        />
      )}
    </div>
  )
}

function EmployeeFormModal({ employee, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    namn: employee?.namn ?? '',
    personnummer: employee?.personnummer ?? '',
    lon: employee?.lon ?? '',
    avdelning: employee?.avdelning ?? '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      lon: parseFloat(formData.lon) || 0,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">
          {employee ? 'Redigera anställd' : 'Lägg till anställd'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Namn</label>
            <input
              type="text"
              value={formData.namn}
              onChange={(e) => setFormData({ ...formData, namn: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Personnummer</label>
            <input
              type="text"
              value={formData.personnummer}
              onChange={(e) => setFormData({ ...formData, personnummer: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="YYYYMMDD-XXXX"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Lön (SEK)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.lon}
              onChange={(e) => setFormData({ ...formData, lon: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Avdelning</label>
            <input
              type="text"
              value={formData.avdelning}
              onChange={(e) => setFormData({ ...formData, avdelning: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              {employee ? 'Spara' : 'Lägg till'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PayslipModal({ employee, onClose, onDownload }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const handleDownload = (e) => {
    e.preventDefault()
    onDownload(employee, month, year)
  }

  const months = [
    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Ladda ner lönespec PDF</h3>
        <p className="text-slate-600 mb-4">{employee.namn}</p>
        <form onSubmit={handleDownload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Månad</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg"
            >
              {months.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">År</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
              Avbryt
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
              Ladda ner PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SemesterUttagModal({ employees, semesterSaldo, onClose, onSubmit }) {
  const now = new Date()
  const [formData, setFormData] = useState({
    employee_id: employees[0]?.id ?? '',
    antal_dagar: 1,
    datum: now.toISOString().slice(0, 10),
  })

  const selectedSaldo = semesterSaldo.find((s) => s.employee_id === Number(formData.employee_id))
  const maxDagar = selectedSaldo?.saldo ?? 0

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      employee_id: Number(formData.employee_id),
      antal_dagar: Number(formData.antal_dagar),
      datum: formData.datum,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Registrera semesteruttag</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Anställd</label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              required
            >
              <option value="">Välj anställd</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.namn}</option>
              ))}
            </select>
          </div>
          {selectedSaldo !== undefined && (
            <p className="text-sm text-slate-500">Tillgängliga dagar: {selectedSaldo.saldo}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Antal dagar</label>
            <input
              type="number"
              min="1"
              max={maxDagar}
              value={formData.antal_dagar}
              onChange={(e) => setFormData({ ...formData, antal_dagar: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Datum</label>
            <input
              type="date"
              value={formData.datum}
              onChange={(e) => setFormData({ ...formData, datum: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              required
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
              Avbryt
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
              Registrera
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RaiseFormModal({ employees, preselectedEmployee, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    employee_id: preselectedEmployee?.id ?? (employees[0]?.id ?? ''),
    ny_lon: preselectedEmployee ? String(preselectedEmployee.lon) : '',
    orsak: '',
  })

  const selectedEmp = employees.find((e) => e.id === Number(formData.employee_id))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      employee_id: Number(formData.employee_id),
      ny_lon: parseFloat(formData.ny_lon) || 0,
      orsak: formData.orsak || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Registrera löneköning</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Anställd</label>
            <select
              value={formData.employee_id}
              onChange={(e) => {
                const emp = employees.find((x) => x.id === Number(e.target.value))
                setFormData({
                  ...formData,
                  employee_id: e.target.value,
                  ny_lon: emp ? String(emp.lon) : formData.ny_lon,
                })
              }}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">Välj anställd</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.namn} ({emp.avdelning}) - {new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(Number(emp.lon))}
                </option>
              ))}
            </select>
          </div>
          {selectedEmp && (
            <p className="text-sm text-slate-500">
              Nuvarande lön: {new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(Number(selectedEmp.lon))}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Ny lön (SEK)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.ny_lon}
              onChange={(e) => setFormData({ ...formData, ny_lon: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Orsak (valfritt)</label>
            <input
              type="text"
              value={formData.orsak}
              onChange={(e) => setFormData({ ...formData, orsak: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="t.ex. Årlig löneökning"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Registrera
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default App
