const TOKEN_KEY = 'pupi_admin_token';
let productosAdmin = [];
let editandoId = null;
let fotosActualesAConservar = [];

function getToken() { return localStorage.getItem(TOKEN_KEY); }

function mostrarPanel() {
  document.getElementById('vista-login').style.display = 'none';
  document.getElementById('vista-panel').style.display = 'block';
  cargarProductosAdmin();
  cargarConfig();
}

function mostrarLogin() {
  document.getElementById('vista-panel').style.display = 'none';
  document.getElementById('vista-login').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  if (getToken()) mostrarPanel(); else mostrarLogin();

  // --- Login ---
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const usuario = document.getElementById('login-usuario').value;
    const clave = document.getElementById('login-clave').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';
    try {
      const data = await api.apiEnviar('/auth/login', 'POST', { username: usuario, password: clave });
      localStorage.setItem(TOKEN_KEY, data.token);
      mostrarPanel();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  document.getElementById('btn-salir').addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY);
    mostrarLogin();
  });

  // --- Tabs ---
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-productos').style.display = tab.dataset.tab === 'productos' ? 'block' : 'none';
      document.getElementById('tab-config').style.display = tab.dataset.tab === 'config' ? 'block' : 'none';
    });
  });

  // --- Preview de fotos nuevas ---
  document.getElementById('producto-imagenes').addEventListener('change', (e) => {
    const preview = document.getElementById('preview-fotos');
    preview.innerHTML = '';
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.createElement('img');
        img.src = ev.target.result;
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  // --- Guardar producto (crear o editar) ---
  document.getElementById('form-producto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('producto-error');
    errorEl.textContent = '';

    const formData = new FormData();
    formData.append('nombre', document.getElementById('producto-nombre').value);
    formData.append('categoria', document.getElementById('producto-categoria').value);
    formData.append('subcategoria', document.getElementById('producto-subcategoria').value);
    formData.append('precio', document.getElementById('producto-precio').value);
    formData.append('descuento', document.getElementById('producto-descuento').value || 0);
    formData.append('activo', document.getElementById('producto-activo').value);
    formData.append('descripcion', document.getElementById('producto-descripcion').value);

    const archivos = document.getElementById('producto-imagenes').files;
    Array.from(archivos).forEach(file => formData.append('imagenes', file));

    try {
      if (editandoId) {
        await api.apiEnviar(`/productos/${editandoId}`, 'PUT', formData, getToken(), true);
        mostrarNotificacionAdmin('Producto actualizado');
      } else {
        await api.apiEnviar('/productos', 'POST', formData, getToken(), true);
        mostrarNotificacionAdmin('Producto agregado');
      }
      cancelarEdicion();
      cargarProductosAdmin();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  document.getElementById('btn-cancelar-edicion').addEventListener('click', cancelarEdicion);

  // --- Configuración ---
  document.getElementById('form-config').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('config-error');
    errorEl.textContent = '';
    try {
      await api.apiEnviar('/config', 'PUT', {
        whatsapp_numero: document.getElementById('config-whatsapp').value.replace(/\D/g, ''),
        nombre_tienda: document.getElementById('config-nombre').value,
        mensaje_saludo: document.getElementById('config-mensaje').value
      }, getToken());
      mostrarNotificacionAdmin('Configuración guardada');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
});

async function cargarProductosAdmin() {
  try {
    productosAdmin = await api.apiGet('/productos/admin/todos', getToken());
  } catch (err) {
    if (String(err.message).toLowerCase().includes('token')) {
      localStorage.removeItem(TOKEN_KEY);
      mostrarLogin();
      return;
    }
  }
  renderizarTablaProductos();
}

function renderizarTablaProductos() {
  const tbody = document.getElementById('tabla-productos-body');
  if (!productosAdmin.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:20px;">Todavía no cargaste productos</td></tr>';
    return;
  }

  tbody.innerHTML = productosAdmin.map(p => `
    <tr>
      <td><img src="${p.imagenes[0] ? p.imagenes[0].url : 'https://placehold.co/60'}" alt=""></td>
      <td><span class="tag-codigo">${p.codigo}</span></td>
      <td>${p.nombre}</td>
      <td>${p.categoria}${p.subcategoria ? ' / ' + p.subcategoria : ''}</td>
      <td>$${p.precio.toLocaleString('es-AR')} ${p.descuento > 0 ? `(-${p.descuento}%)` : ''}</td>
      <td>${p.activo ? '<span class="tag-activo">Visible</span>' : '<span class="tag-inactivo">Oculto</span>'}</td>
      <td>
        <div class="acciones-fila">
          <button class="btn-editar" onclick="editarProducto(${p.id})">Editar</button>
          <button class="btn-eliminar" onclick="eliminarProducto(${p.id})">Borrar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function editarProducto(id) {
  const p = productosAdmin.find(x => x.id === id);
  if (!p) return;
  editandoId = id;

  document.getElementById('titulo-form-producto').textContent = `Editar producto — ${p.codigo}`;
  document.getElementById('producto-nombre').value = p.nombre;
  document.getElementById('producto-categoria').value = p.categoria;
  document.getElementById('producto-subcategoria').value = p.subcategoria || '';
  document.getElementById('producto-precio').value = p.precio;
  document.getElementById('producto-descuento').value = p.descuento;
  document.getElementById('producto-activo').value = String(p.activo);
  document.getElementById('producto-descripcion').value = p.descripcion || '';
  document.getElementById('producto-imagenes').value = '';
  document.getElementById('preview-fotos').innerHTML = '';

  const fotosActuales = document.getElementById('fotos-actuales');
  fotosActuales.innerHTML = (p.imagenes || []).map(img => `<img src="${img.url}" alt="">`).join('');

  document.getElementById('btn-cancelar-edicion').style.display = 'inline-block';
  document.getElementById('btn-guardar-producto').textContent = 'Guardar cambios';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicion() {
  editandoId = null;
  document.getElementById('form-producto').reset();
  document.getElementById('titulo-form-producto').textContent = 'Agregar producto';
  document.getElementById('btn-guardar-producto').textContent = 'Guardar producto';
  document.getElementById('btn-cancelar-edicion').style.display = 'none';
  document.getElementById('preview-fotos').innerHTML = '';
  document.getElementById('fotos-actuales').innerHTML = '';
}

async function eliminarProducto(id) {
  if (!confirm('¿Seguro que querés borrar este producto? No se puede deshacer.')) return;
  try {
    await api.apiEnviar(`/productos/${id}`, 'DELETE', null, getToken());
    mostrarNotificacionAdmin('Producto eliminado');
    cargarProductosAdmin();
  } catch (err) {
    alert(err.message);
  }
}

async function cargarConfig() {
  try {
    const config = await api.apiGet('/config');
    document.getElementById('config-whatsapp').value = config.whatsapp_numero || '';
    document.getElementById('config-nombre').value = config.nombre_tienda || '';
    document.getElementById('config-mensaje').value = config.mensaje_saludo || '';
  } catch (err) { /* silencioso */ }
}

function mostrarNotificacionAdmin(mensaje) {
  const notificacion = document.createElement('div');
  notificacion.classList.add('notificacion');
  notificacion.textContent = mensaje;
  document.body.appendChild(notificacion);
  setTimeout(() => notificacion.classList.add('mostrar'), 10);
  setTimeout(() => {
    notificacion.classList.remove('mostrar');
    setTimeout(() => notificacion.remove(), 300);
  }, 2500);
}
