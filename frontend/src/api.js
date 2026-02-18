const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Något gick fel');
  }
  return res.json();
}

export const api = {
  employees: {
    list: () => request('/employees'),
    get: (id) => request(`/employees/${id}`),
    create: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
  },
  salaryRaises: {
    list: (employeeId) => request(employeeId ? `/salary-raises?employee_id=${employeeId}` : '/salary-raises'),
    create: (data) => request('/salary-raises', { method: 'POST', body: JSON.stringify(data) }),
  },
};
