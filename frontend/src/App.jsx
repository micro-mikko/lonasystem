import { useState, useEffect } from 'react'
import { api } from './api'

function App() {
  const [employees, setEmployees] = useState([])
  const [salaryRaises, setSalaryRaises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('employees')
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [showRaiseForm, setShowRaiseForm] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)

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

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([loadEmployees(), loadSalaryRaises()])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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

        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'employees'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Anställda
          </button>
          <button
            onClick={() => setActiveTab('raises')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'raises'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Löneköningar
          </button>
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
                          <div className="flex gap-2 justify-end">
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
      </main>

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
