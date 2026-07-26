// Genera un código con el patrón #NNNNNLLLL (5 números + 4 letras)
// Ej: #48213WKQT
function generarCodigo() {
  let numero = '';
  for (let i = 0; i < 5; i++) numero += Math.floor(Math.random() * 10);

  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let letras = '';
  for (let i = 0; i < 4; i++) letras += alfabeto[Math.floor(Math.random() * alfabeto.length)];

  return `#${numero}${letras}`;
}

module.exports = { generarCodigo };
