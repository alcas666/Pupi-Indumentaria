const CARRITO_KEY = 'pupi_carrito';
let configTienda = null;

function obtenerCarrito() {
  try { return JSON.parse(localStorage.getItem(CARRITO_KEY)) || []; }
  catch { return []; }
}

function guardarCarrito(carrito) {
  localStorage.setItem(CARRITO_KEY, JSON.stringify(carrito));
  renderizarCarrito();
}

function agregarAlCarrito(producto, cantidad = 1) {
  const carrito = obtenerCarrito();
  const existente = carrito.find(i => i.id === producto.id);
  const precioFinal = producto.precio * (1 - (producto.descuento || 0) / 100);

  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      precio: precioFinal,
      imagen: producto.imagenes && producto.imagenes[0] ? producto.imagenes[0].url : '',
      cantidad
    });
  }
  guardarCarrito(carrito);
  mostrarNotificacion('Se agregó al carrito');
}

function cambiarCantidad(id, delta) {
  const carrito = obtenerCarrito();
  const item = carrito.find(i => i.id === id);
  if (!item) return;
  item.cantidad += delta;
  const nuevoCarrito = item.cantidad <= 0 ? carrito.filter(i => i.id !== id) : carrito;
  guardarCarrito(nuevoCarrito);
}

function eliminarDelCarrito(id) {
  guardarCarrito(obtenerCarrito().filter(i => i.id !== id));
}

function renderizarCarrito() {
  const carrito = obtenerCarrito();
  const contenedor = document.getElementById('carrito-items');
  const contador = document.getElementById('carrito-contador');
  const totalEl = document.getElementById('carrito-total');

  contador.textContent = carrito.reduce((s, i) => s + i.cantidad, 0);

  if (carrito.length === 0) {
    contenedor.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío</p>';
    totalEl.textContent = '0';
    return;
  }

  let total = 0;
  contenedor.innerHTML = carrito.map(item => {
    total += item.precio * item.cantidad;
    return `
      <div class="carrito-item">
        <img src="${item.imagen}" alt="${item.nombre}">
        <div class="carrito-item-info">
          <p class="carrito-item-titulo">${item.nombre}</p>
          <p class="carrito-item-codigo">${item.codigo}</p>
          <p class="carrito-item-precio">$${item.precio.toLocaleString('es-AR')} c/u</p>
          <div class="carrito-item-cantidad">
            <button onclick="cambiarCantidad(${item.id}, -1)">-</button>
            <span>${item.cantidad}</span>
            <button onclick="cambiarCantidad(${item.id}, 1)">+</button>
          </div>
        </div>
        <i class="fas fa-trash carrito-item-eliminar" onclick="eliminarDelCarrito(${item.id})"></i>
      </div>
    `;
  }).join('');

  totalEl.textContent = total.toLocaleString('es-AR');
}

function abrirCarrito() {
  document.getElementById('carrito-panel').classList.add('abierto');
  document.getElementById('overlay').classList.add('activo');
}

function cerrarCarrito() {
  document.getElementById('carrito-panel').classList.remove('abierto');
  document.getElementById('overlay').classList.remove('activo');
}

async function obtenerConfigTienda() {
  if (configTienda) return configTienda;
  configTienda = await api.apiGet('/config');
  return configTienda;
}

// Arma el link de WhatsApp con el saludo + la lista de productos con su código
async function construirLinkWhatsApp(items) {
  const config = await obtenerConfigTienda();
  const numero = config.whatsapp_numero || '';
  const saludo = config.mensaje_saludo || 'Hola! Me interesa comprar estos productos:';

  let mensaje = `${saludo}\n\n`;
  items.forEach(item => {
    mensaje += `- ${item.nombre} código ${item.codigo}`;
    if (item.cantidad > 1) mensaje += ` x${item.cantidad}`;
    mensaje += `\n`;
  });

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  if (items.length > 1) mensaje += `\nTotal aproximado: $${total.toLocaleString('es-AR')}`;

  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

async function finalizarCompraWhatsApp() {
  const carrito = obtenerCarrito();
  if (carrito.length === 0) {
    mostrarNotificacion('Tu carrito está vacío');
    return;
  }
  const link = await construirLinkWhatsApp(carrito);
  window.open(link, '_blank');
}

// Compra rápida de un solo producto desde su tarjeta, sin pasar por el carrito
async function comprarPorWhatsApp(producto) {
  const precioFinal = producto.precio * (1 - (producto.descuento || 0) / 100);
  const link = await construirLinkWhatsApp([{
    nombre: producto.nombre,
    codigo: producto.codigo,
    precio: precioFinal,
    cantidad: 1
  }]);
  window.open(link, '_blank');
}

function mostrarNotificacion(mensaje) {
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

document.addEventListener('DOMContentLoaded', () => {
  renderizarCarrito();
  document.getElementById('btn-abrir-carrito').addEventListener('click', abrirCarrito);
  document.getElementById('btn-cerrar-carrito').addEventListener('click', cerrarCarrito);
  document.getElementById('overlay').addEventListener('click', cerrarCarrito);
  document.getElementById('btn-finalizar-compra').addEventListener('click', finalizarCompraWhatsApp);

  obtenerConfigTienda().then(config => {
    const tel = config.whatsapp_numero || '';
    document.getElementById('footer-telefono').innerHTML = `<i class="fas fa-phone"></i> +${tel}`;
    document.getElementById('footer-whatsapp').href = `https://wa.me/${tel}`;
  }).catch(() => {});
});
