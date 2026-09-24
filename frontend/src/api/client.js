const API = ''; // Vite proxy handles routing to localhost:5000

export const apiFetch = async (url, options = {}) => {
  const token = sessionStorage.getItem('super_token');
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API}${url}`, { ...options, headers });

  if (res.status === 401) {
    sessionStorage.removeItem('super_token');
    sessionStorage.removeItem('super_username');
    window.location.href = '/login';
    return res;
  }

  return res;
};
