const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Las fotos NO se guardan en el disco del servidor (se perdería en el hosting
// gratis apenas se reinicia). Multer las guarda un instante en memoria y de
// ahí se suben directo a Cloudinary.
const storage = multer.memoryStorage();

function filtroArchivos(req, file, cb) {
  const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
  if (permitidos.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'));
}

const upload = multer({
  storage,
  fileFilter: filtroArchivos,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB por foto
});

// Sube un buffer de imagen a Cloudinary y devuelve { url, public_id }
function subirImagen(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'pupi-indumentaria', resource_type: 'image' },
      (err, resultado) => {
        if (err) return reject(err);
        resolve({ url: resultado.secure_url, public_id: resultado.public_id });
      }
    );
    stream.end(buffer);
  });
}

// Borra una foto de Cloudinary (best-effort: si falla, no rompe la operación principal)
async function borrarImagen(publicId) {
  if (!publicId) return;
  try { await cloudinary.uploader.destroy(publicId); }
  catch (err) { console.warn('No se pudo borrar la imagen en Cloudinary:', err.message); }
}

module.exports = { upload, subirImagen, borrarImagen };
