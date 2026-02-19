// I utveckling: använd backend direkt (fungerar bättre med Cursor preview)
const API_BASE = import.meta.env.DEV
  ? 'http://localhost:8000/api'
  : '/api';
const TIMEOUT_MS = 8000;

async function request(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Något gick fel');
    }
    return res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Servern svarar inte. Kontrollera att backend körs på port 8000.');
    }
    throw err;
  }
}

async function requestBlob(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Något gick fel');
  }
  return res.blob();
}

export const api = {
  employees: {
    list: () => request('/employees'),
    get: (id) => request(`/employees/${id}`),
    create: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
    payslipPdf: (id, month, year) =>
      requestBlob(`/employees/${id}/payslip?month=${month}&year=${year}`),
  },
  salaryRaises: {
    list: (employeeId) => request(employeeId ? `/salary-raises?employee_id=${employeeId}` : '/salary-raises'),
    create: (data) => request('/salary-raises', { method: 'POST', body: JSON.stringify(data) }),
  },
  tax: {
    calculate: (employeeId) => request(`/tax/calculate?employee_id=${employeeId}`),
  },
  semester: {
    saldo: (year) => request(year ? `/semester/saldo?year=${year}` : '/semester/saldo'),
    uttagList: (employeeId, year) => {
      let url = '/semester/uttag?';
      if (employeeId) url += `employee_id=${employeeId}&`;
      if (year) url += `year=${year}`;
      return request(url.replace(/\?$/, '') || '/semester/uttag');
    },
    uttagCreate: (data) => request('/semester/uttag', { method: 'POST', body: JSON.stringify(data) }),
  },
  reports: {
    monthly: (year, month) => request(`/reports/monthly?year=${year}&month=${month}`),
  },
};
