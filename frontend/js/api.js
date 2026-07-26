// Como el backend sirve también el frontend, usamos rutas relativas.
const API_BASE = '/api';

async function apiGet(ruta, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${ruta}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red');
  return data;
}

async function apiEnviar(ruta, metodo, cuerpo, token, esFormData = false) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!esFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${ruta}`, {
    method: metodo,
    headers,
    body: esFormData ? cuerpo : JSON.stringify(cuerpo)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red');
  return data;
}

window.api = { apiGet, apiEnviar };
