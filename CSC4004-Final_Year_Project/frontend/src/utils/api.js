const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

const buildUrl = (path) => new URL(path, baseURL).toString();

const parseResponse = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const getStoredTokens = () => {
  const tokensRaw = localStorage.getItem('authTokens');
  if (!tokensRaw) return null;

  try {
    return JSON.parse(tokensRaw);
  } catch (error) {
    console.error('Failed to parse auth tokens', error);
    localStorage.removeItem('authTokens');
    return null;
  }
};

const createApiError = (response, data) => {
  const error = new Error(data?.detail || data?.message || `Request failed with status ${response.status}`);
  error.response = {
    status: response.status,
    data,
  };
  return error;
};

const refreshAccessToken = async () => {
  const tokens = getStoredTokens();
  if (!tokens?.refresh) return null;

  const response = await fetch(buildUrl('token/refresh/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });

  const data = await parseResponse(response);
  if (!response.ok) {
    localStorage.removeItem('authTokens');
    return null;
  }

  const newTokens = { ...tokens, access: data.access };
  localStorage.setItem('authTokens', JSON.stringify(newTokens));
  return newTokens;
};

const request = async (path, options = {}, retry = true) => {
  const tokens = getStoredTokens();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (tokens?.access) {
    headers.Authorization = `Bearer ${tokens.access}`;
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401 && retry && !path.includes('token/')) {
    const newTokens = await refreshAccessToken();
    if (newTokens?.access) {
      return request(path, options, false);
    }

    window.location.href = '/login';
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    throw createApiError(response, data);
  }

  return { data, status: response.status };
};

const withJsonBody = (data, options = {}) => ({
  ...options,
  body: data === undefined ? undefined : JSON.stringify(data),
});

const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, data, options) => request(path, withJsonBody(data, { ...options, method: 'POST' })),
  patch: (path, data, options) => request(path, withJsonBody(data, { ...options, method: 'PATCH' })),
  put: (path, data, options) => request(path, withJsonBody(data, { ...options, method: 'PUT' })),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

export default api;
