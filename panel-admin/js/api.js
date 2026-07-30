// Reemplaza esta URL por la URL pública que te dio Render (sin la barra '/' al final)
const API_BASE = 'https://pupi-indumentaria-backend.onrender.com/api'; 

async function apiGet(ruta) {
  const res = await fetch(`${API_BASE}${ruta}`);
  if (!res.ok) throw new Error('Error de red');
  return await res.json();
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