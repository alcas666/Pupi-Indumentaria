# Pupi Indumentaria

Tienda con catálogo público + panel de administración. La compra NO se hace en la web:
el cliente arma su pedido y un botón lo manda directo a WhatsApp con el detalle y el
código de cada producto.

## Estructura

```
pupi-indumentaria/
├── backend/          Express + Turso (SQLite en la nube) + JWT + Cloudinary
│   ├── server.js
│   ├── src/
│   │   ├── db.js                → conexión a la base (Turso o archivo local) + esquema
│   │   ├── routes/              → auth, productos, config
│   │   ├── middleware/          → JWT y subida de fotos a Cloudinary
│   │   └── utils/codigo.js      → genera el código único #NNNNNLLLL
│   ├── reset-admin.js           → aplica usuario/clave del .env a la base ya existente
│   └── .env.example
├── panel-admin/      Panel de administración (URL secreta, no linkeado desde la tienda)
└── frontend/
    ├── index.html    → tienda pública
    ├── css/
    └── js/
```

## Por qué Turso y Cloudinary (y no todo guardado en el servidor)

Los hostings gratuitos "apagan" tu servidor cuando nadie lo visita un rato, y cuando lo
reactivan puede perder cualquier archivo que se haya guardado en su disco mientras
corría (fotos subidas, base de datos, etc). Por eso:

- **Turso**: guarda la base de datos (productos, admin, configuración) en la nube,
  gratis, y sigue ahí pase lo que pase con el servidor.
- **Cloudinary**: guarda las fotos de los productos en la nube, gratis, con su propio
  link permanente.

Así el servidor de Node queda "sin memoria propia" — podés apagarlo y prenderlo las
veces que quieras sin perder nada.

Si solo querés probarlo en tu PC sin crear cuentas todavía, andá directo a "Cómo
correrlo en tu PC" — funciona igual, usando un archivo local en vez de Turso.

## 1. Crear tu base de datos gratis en Turso

1. Entrá a **https://turso.tech** y creá una cuenta gratis (podés usar tu cuenta de
   GitHub para registrarte más rápido).
2. Desde el dashboard, creá una base de datos nueva (botón tipo "Create Database").
   Ponele un nombre, por ejemplo `pupi-indumentaria`.
3. Una vez creada, buscá el botón para generar un **token de acceso** ("Create Token"
   / "Generate Token"). Te va a mostrar un texto largo — copialo, es tu
   `TURSO_AUTH_TOKEN`.
4. También vas a ver la **URL de la base**, algo como
   `libsql://pupi-indumentaria-tuusuario.turso.io` — esa es tu `TURSO_DATABASE_URL`.
5. Guardá esos dos valores, los vas a pegar en el `.env` más abajo.

El plan gratis de Turso alcanza de sobra para una tienda como esta.

## 2. Crear tu cuenta gratis en Cloudinary (fotos)

1. Entrá a **https://cloudinary.com** y creá una cuenta gratis.
2. Apenas entrás al dashboard vas a ver, arriba, tres datos: **Cloud name**,
   **API Key** y **API Secret** (el secret capaz tenés que tocar "Ver"/"Reveal" para
   que se muestre). Copiá los tres.
3. El plan gratis incluye 25 GB de almacenamiento — para fotos de productos de ropa
   te dura muchísimo tiempo.

## 3. Completar el .env

Copiá `.env.example` a `.env` dentro de `backend/` y completá, además de lo que ya
tenías (usuario/clave del admin, ruta secreta, WhatsApp), estas líneas nuevas:

```
TURSO_DATABASE_URL=libsql://pupi-indumentaria-tuusuario.turso.io
TURSO_AUTH_TOKEN=el-token-larguisimo-que-copiaste

CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
```

## Cómo correrlo en tu PC

1. Entrá a `backend/` e instalá dependencias:
   ```
   cd backend
   npm install
   ```
2. Copiá `.env.example` a `.env` y completá tus datos (ver secciones de arriba).
   - Si dejás `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` vacíos, el proyecto usa un
     archivo SQLite local para que puedas probar sin crear la cuenta todavía.
   - Cloudinary sí es necesario para poder subir fotos, incluso en tu PC.
3. Arrancá el servidor:
   ```
   npm start
   ```
4. Abrí `http://localhost:3000` (tienda) y `http://localhost:3000/TU_ADMIN_PATH` (panel).

**Importante:** `ADMIN_USER` y `ADMIN_PASS` solo se usan para crear el admin la
**primera vez**. Si ya corriste el servidor una vez y después cambiás esos valores,
corré `npm run admin:set` para aplicarlos.

## 4. Subir la página gratis a internet (para que cualquiera con el link entre)

La forma más simple y gratuita para este proyecto es **Render**. Resumen del trato:
tu web queda gratis, con su propio link público (`https://tu-tienda.onrender.com`),
pero si nadie la visita en 15 minutos se "duerme" y el próximo que entre espera
unos 30-60 segundos mientras se despierta. Como ahora las fotos y los productos
viven en Cloudinary/Turso, ese sueño no te hace perder nada — sólo tarda un poco
en la primera visita después de estar inactiva.

### Paso a paso

1. **Subí tu proyecto a GitHub** (Render despliega leyendo un repositorio):
   - Creá una cuenta en https://github.com si no tenés.
   - Creá un repositorio nuevo (puede ser privado) y subí ahí toda la carpeta
     `pupi-indumentaria` (podés arrastrar los archivos desde la web de GitHub si no
     usás git por consola).
   - **Importante:** no subas tu archivo `.env` (contiene contraseñas). Si ya tenés
     un archivo `.gitignore`, agregale una línea que diga `.env`.

2. **Creá la cuenta en Render**: https://render.com (podés entrar directo con GitHub).

3. Desde el dashboard de Render: **New +** → **Web Service** → elegí el repositorio
   que acabás de subir.

4. Configurá el servicio así:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

5. En la sección **Environment Variables**, cargá una por una todas las que tenés en
   tu `.env` local (`JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASS`, `ADMIN_PATH`,
   `WHATSAPP_NUMERO`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`). No hace
   falta cargar `PORT`, Render la define solo.

6. Dale a **Create Web Service**. Render va a instalar todo y arrancar el servidor;
   se ve el proceso en vivo en la pestaña de logs. Cuando termine te da una URL
   pública tipo `https://pupi-indumentaria.onrender.com` — esa es la que compartís.

7. Tu panel de administración queda en esa misma URL + tu ruta secreta, por ejemplo
   `https://pupi-indumentaria.onrender.com/tu-ruta-secreta`.

### Después de cada cambio

Cada vez que subas cambios nuevos a GitHub, Render vuelve a desplegar solo
(auto-deploy). Si en algún momento cambiás usuario/clave del admin, entrá a la
pestaña **Shell** de Render (o corré `npm run admin:set` localmente apuntando a la
misma base de Turso) para aplicar el cambio.

## Cómo cargar productos

Entrá a tu URL secreta (`ADMIN_PATH` del `.env`), iniciá sesión con el usuario/clave, y desde la pestaña
"Productos" completá nombre, categoría, precio, descuento, descripción y subí las fotos.
El código (ej: `#48213WKQT`) se genera solo — no lo tenés que escribir vos.

Desde la pestaña "Configuración" podés cambiar el número de WhatsApp y el mensaje de
saludo que se arma en el pedido, sin tocar código.

## Cómo funciona la compra por WhatsApp

- Cada producto tiene un botón "Comprar por WhatsApp": abre el chat con un mensaje tipo:
  `Hola Pupi!... - Remera blanca dama código #48213WKQT`
- El carrito (arriba a la derecha) permite juntar varios productos y mandar todo el
  pedido junto con "Comprar por WhatsApp", listando nombre, código y cantidad de cada uno.
- No hay pasarela de pago ni checkout propio: todo se cierra por WhatsApp como pediste.

## El panel admin no tiene una URL fija ni un link visible

A propósito no hay ningún botón "Admin" en la tienda, y la URL no es algo previsible
como `/admin` o `/panel`. Vos elegís la ruta en `ADMIN_PATH` (dentro del `.env`), por
ejemplo `ADMIN_PATH=gestion-8f2k1x`, y el panel queda solo en
`https://tu-dominio.com/gestion-8f2k1x`. Nadie que entre a la tienda se va a topar con
él ni por casualidad — cualquier otra URL (incluida `/admin`) muestra la tienda normal.

Recomendaciones:
- Elegí algo que no sea adivinable (no uses "admin", "panel", "login", tu nombre, etc).
- Esto es una capa extra de discreción, no reemplaza la contraseña — igual necesitás
  usuario y clave para entrar una vez que encontrás la URL.
- Si en algún momento sospechás que alguien más conoce la URL, simplemente cambiá
  `ADMIN_PATH` en el `.env`/Render y reiniciá el servidor.
