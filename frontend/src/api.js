const BASE = '/api';

function getToken() {
  return sessionStorage.getItem('qm_token');
}

export function setToken(token) {
  if (token) sessionStorage.setItem('qm_token', token);
  else sessionStorage.removeItem('qm_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status}).`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  register: (username, password) => request('/auth/register', { method: 'POST', body: { username, password } }),
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/auth/me'),

  listQueues: () => request('/queues'),
  createQueue: (name) => request('/queues', { method: 'POST', body: { name } }),
  getQueue: (id) => request(`/queues/${id}`),
  deleteQueue: (id) => request(`/queues/${id}`, { method: 'DELETE' }),

  listTokens: (queueId) => request(`/queues/${queueId}/tokens`),
  addToken: (queueId, label, note) => request(`/queues/${queueId}/tokens`, { method: 'POST', body: { label, note } }),

  moveToken: (id, direction) => request(`/tokens/${id}/move`, { method: 'PATCH', body: { direction } }),
  assignToken: (id) => request(`/tokens/${id}/assign`, { method: 'POST' }),
  completeToken: (id) => request(`/tokens/${id}/complete`, { method: 'POST' }),
  cancelToken: (id) => request(`/tokens/${id}`, { method: 'DELETE' }),

  overviewAnalytics: () => request('/analytics/overview'),
  queueAnalytics: (id) => request(`/analytics/queue/${id}`)
};

export { getToken };
