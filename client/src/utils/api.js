const BASE = '';

// Token management
const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');

export const setTokens = (accessToken, refreshToken) => {
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// Refresh access token menggunakan refresh token
let refreshPromise = null;

async function refreshAccessToken() {
  // Hindari multiple refresh requests bersamaan
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  refreshPromise = fetch(`${BASE}/api/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok || !data.accessToken) {
        clearTokens();
        throw new Error('Refresh failed');
      }
      setTokens(data.accessToken, null);
      return data.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function request(url, options = {}) {
  const accessToken = getAccessToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const config = { ...options, headers };

  let res = await fetch(`${BASE}${url}`, config);

  // Jika 401 dan ada refresh token, coba refresh
  if (res.status === 401 && getRefreshToken()) {
    try {
      const newToken = await refreshAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${BASE}${url}`, { ...options, headers });
    } catch {
      // Refresh gagal, bersihkan tokens
      clearTokens();
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}: ${res.statusText}`);
  return data;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
};
