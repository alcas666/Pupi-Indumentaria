require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initDb, queryOne, run } = require('./src/db');

async function main() {
  await initDb(); // asegura que las tablas existan y crea el admin si no hay ninguno

  const username = process.env.ADMIN_USER || 'admin';
  const password = process.env.ADMIN_PASS || 'CambiarPass123';
  const hash = bcrypt.hashSync(password, 10);

  const existente = await queryOne('SELECT * FROM admins LIMIT 1');

  if (existente) {
    await run('UPDATE admins SET username = ?, password_hash = ? WHERE id = ?', [username, hash, existente.id]);
    console.log(`✔ Admin actualizado -> usuario: "${username}" / clave: "${password}"`);
  } else {
    await run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, hash]);
    console.log(`✔ Admin creado -> usuario: "${username}" / clave: "${password}"`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('No se pudo actualizar el admin:', err);
  process.exit(1);
});
