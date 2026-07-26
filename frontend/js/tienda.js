let productosCache = [];
let categoriaActiva = 'todos';

const contenedorProductos = document.getElementById('productos-container');
const contenedorFiltros = document.getElementById('filtros');
const contenedorSubfiltros = document.getElementById('subfiltros');

const CATEGORIAS = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'hombre', etiqueta: 'Hombre' },
  { valor: 'mujer', etiqueta: 'Mujer' },
  { valor: 'mixto', etiqueta: 'Mixto' }
];

function renderizarFiltros() {
  contenedorFiltros.innerHTML = CATEGORIAS.map(c => `
    <button class="filtro-btn ${c.valor === categoriaActiva ? 'active' : ''}" data-cat="${c.valor}">${c.etiqueta}</button>
  `).join('');

  contenedorFiltros.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => filtrarPorCategoria(btn.dataset.cat));
  });
}

function filtrarPorCategoria(categoria) {
  categoriaActiva = categoria;
  renderizarFiltros();

  const productosDeCategoria = categoria === 'todos'
    ? productosCache
    : productosCache.filter(p => p.categoria === categoria);

  renderizarSubfiltros(productosDeCategoria);
  renderizarProductos(productosDeCategoria);
  document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
}

function renderizarSubfiltros(productos) {
  const subcats = [...new Set(productos.map(p => p.subcategoria).filter(Boolean))];
  if (subcats.length <= 1) { contenedorSubfiltros.innerHTML = ''; return; }

  contenedorSubfiltros.innerHTML = `<button class="filtro-btn active" data-sub="">Todas</button>` +
    subcats.map(s => `<button class="filtro-btn" data-sub="${s}">${s}</button>`).join('');

  contenedorSubfiltros.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      contenedorSubfiltros.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sub = btn.dataset.sub;
      const base = categoriaActiva === 'todos' ? productosCache : productosCache.filter(p => p.categoria === categoriaActiva);
      renderizarProductos(sub ? base.filter(p => p.subcategoria === sub) : base);
    });
  });
}

function renderizarProductos(productos) {
  if (!productos.length) {
    contenedorProductos.innerHTML = '<p class="sin-resultados">No hay productos en esta categoría todavía.</p>';
    return;
  }

  contenedorProductos.innerHTML = productos.map(p => {
    const precioFinal = p.precio * (1 - (p.descuento || 0) / 100);
    const imagen = p.imagenes && p.imagenes[0] ? p.imagenes[0].url : 'https://placehold.co/400x500?text=Sin+foto';

    return `
      <div class="producto">
        <div class="producto-imagen-wrap">
          <img src="${imagen}" alt="${p.nombre}" class="producto-imagen" onclick="abrirImagen('${imagen}')">
          ${p.descuento > 0 ? `<span class="producto-badge">${p.descuento}% OFF</span>` : ''}
          <span class="producto-codigo">${p.codigo}</span>
        </div>
        <div class="producto-info">
          <h3 class="producto-titulo">${p.nombre}</h3>
          <p class="producto-descripcion">${p.descripcion || ''}</p>
          <p class="producto-precio">$${precioFinal.toLocaleString('es-AR')}</p>
          ${p.descuento > 0 ? `<p class="producto-descuento">Antes $${p.precio.toLocaleString('es-AR')}</p>` : ''}
          <div class="producto-botones">
            <button class="btn btn-detalles" onclick="verDetalle(${p.id})">Ver detalles</button>
            <button class="btn btn-agregar" onclick="agregarDesdeGrilla(${p.id})">Agregar al carrito</button>
            <button class="btn btn-whatsapp" onclick="comprarDesdeGrilla(${p.id})"><i class="fab fa-whatsapp"></i> Comprar por WhatsApp</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function agregarDesdeGrilla(id) {
  const producto = productosCache.find(p => p.id === id);
  if (producto) agregarAlCarrito(producto);
}

function comprarDesdeGrilla(id) {
  const producto = productosCache.find(p => p.id === id);
  if (producto) comprarPorWhatsApp(producto);
}

function abrirImagen(src) {
  document.getElementById('modal-imagen-src').src = src;
  document.getElementById('modal-imagen').classList.add('activo');
}

function verDetalle(id) {
  const p = productosCache.find(x => x.id === id);
  if (!p) return;
  const precioFinal = p.precio * (1 - (p.descuento || 0) / 100);
  const imagenes = (p.imagenes && p.imagenes.length ? p.imagenes : [{ url: 'https://placehold.co/600x600?text=Sin+foto' }]);

  document.getElementById('modal-detalle-body').innerHTML = `
    <div class="detalle-galeria">
      <div class="detalle-miniaturas" id="detalle-miniaturas">
        ${imagenes.map((img, i) => `<img src="${img.url}" alt="${p.nombre}" class="${i === 0 ? 'activa' : ''}" data-src="${img.url}">`).join('')}
      </div>
      <div class="detalle-imagen-principal" id="detalle-imagen-principal">
        <img src="${imagenes[0].url}" alt="${p.nombre}" id="detalle-img-grande">
      </div>
    </div>
    <div class="modal-detalle-info">
      <span class="producto-codigo detalle-info-codigo" style="position:static;">${p.codigo}</span>
      <h2 class="detalle-info-titulo">${p.nombre}</h2>
      <p class="detalle-info-descripcion">${p.descripcion || 'Sin descripción'}</p>
      <p class="producto-precio detalle-info-precio">$${precioFinal.toLocaleString('es-AR')}</p>
      ${p.descuento > 0 ? `<p class="producto-descuento">${p.descuento}% OFF - Antes $${p.precio.toLocaleString('es-AR')}</p>` : ''}
      <div class="detalle-info-botones">
        <button class="btn btn-agregar" onclick="agregarDesdeGrilla(${p.id}); cerrarModalDetalle();">Agregar al carrito</button>
        <button class="btn btn-whatsapp" onclick="comprarDesdeGrilla(${p.id})"><i class="fab fa-whatsapp"></i> Comprar por WhatsApp</button>
      </div>
    </div>
  `;
  document.getElementById('modal-detalle').classList.add('activo');
  inicializarGaleriaDetalle();
}

function inicializarGaleriaDetalle() {
  const contenedor = document.getElementById('detalle-imagen-principal');
  const imgGrande = document.getElementById('detalle-img-grande');
  const miniaturas = document.querySelectorAll('#detalle-miniaturas img');

  miniaturas.forEach(mini => {
    mini.addEventListener('click', () => {
      imgGrande.src = mini.dataset.src;
      miniaturas.forEach(m => m.classList.remove('activa'));
      mini.classList.add('activa');
    });
  });

  // Zoom que sigue al mouse (como en las fichas de producto de Adidas).
  // En celulares no hay "mousemove" real, así que ahí no hace nada.
  contenedor.addEventListener('mousemove', (e) => {
    const rect = contenedor.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    imgGrande.style.transformOrigin = `${x}% ${y}%`;
    imgGrande.style.transform = 'scale(2.1)';
  });
  contenedor.addEventListener('mouseleave', () => {
    imgGrande.style.transform = 'scale(1)';
  });

  // En celulares, tocar la imagen grande la abre a pantalla completa (con zoom nativo del navegador)
  contenedor.addEventListener('click', () => {
    if (window.matchMedia('(hover: none)').matches) {
      abrirImagen(imgGrande.src);
    }
  });
}

function cerrarModalDetalle() {
  document.getElementById('modal-detalle').classList.remove('activo');
}

async function cargarProductos() {
  try {
    productosCache = await api.apiGet('/productos');
    renderizarFiltros();
    renderizarProductos(productosCache);
  } catch (err) {
    contenedorProductos.innerHTML = `<p class="sin-resultados">No se pudieron cargar los productos. Verificá que el servidor esté corriendo.</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarProductos();
  document.getElementById('cerrar-modal-imagen').addEventListener('click', () => {
    document.getElementById('modal-imagen').classList.remove('activo');
  });
  document.getElementById('cerrar-modal-detalle').addEventListener('click', cerrarModalDetalle);
});
