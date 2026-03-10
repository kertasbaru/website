const BASE = '';

async function request(url, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  const res = await fetch(`${BASE}${url}`, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}: ${res.statusText}`);
  return data;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
};
