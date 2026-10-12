// Cifrado de la copia de seguridad.
//
// La copia suele traer datos personales (nombres, telefonos, DNI), asi que
// nunca se sube en claro, aunque el repo sea privado: cualquiera con acceso al repo puede bajar los artifacts de Actions.
// Se cifra con una clave que solo vive en los Secrets de GitHub y en el
// gestor de contrasenas de Argonauta.
//
// AES-256-GCM: ademas de ocultar el contenido, detecta si el archivo fue
// alterado. La clave de cifrado se deriva de la clave guardada con scrypt y una
// sal al azar distinta en cada copia.
//
// Lo usan scripts/backup-datos.mjs (cifra) y scripts/restaurar-datos.mjs
// (descifra). Hecho con node:crypto para no depender de openssl ni gpg: funciona
// igual en GitHub Actions y en una PC con Windows.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const derivarClave = (clave, sal) => scryptSync(clave, sal, 32);

// Recibe un objeto { nombreArchivo: contenido } y devuelve el texto del
// archivo cifrado, que se describe solo: version, algoritmo, sal, iv y etiqueta.
export const cifrar = (archivos, clave) => {
  if (!clave) throw new Error('Falta la clave de cifrado (BACKUP_CLAVE).');
  const sal = randomBytes(16);
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', derivarClave(clave, sal), iv);
  const datos = Buffer.concat([
    cifrador.update(JSON.stringify(archivos), 'utf8'),
    cifrador.final()
  ]);
  return JSON.stringify({
    version: 1,
    algoritmo: 'aes-256-gcm',
    derivacion: 'scrypt',
    sal: sal.toString('base64'),
    iv: iv.toString('base64'),
    etiqueta: cifrador.getAuthTag().toString('base64'),
    datos: datos.toString('base64')
  });
};

// Devuelve el objeto { nombreArchivo: contenido } original. Falla con un
// mensaje claro si la clave no es la correcta o si el archivo fue alterado.
export const descifrar = (textoCifrado, clave) => {
  if (!clave) throw new Error('Falta la clave de cifrado (BACKUP_CLAVE).');
  const sobre = JSON.parse(textoCifrado);
  if (sobre.version !== 1 || sobre.algoritmo !== 'aes-256-gcm') {
    throw new Error(`Formato de copia desconocido: version ${sobre.version}, ${sobre.algoritmo}.`);
  }
  const descifrador = createDecipheriv(
    'aes-256-gcm',
    derivarClave(clave, Buffer.from(sobre.sal, 'base64')),
    Buffer.from(sobre.iv, 'base64')
  );
  descifrador.setAuthTag(Buffer.from(sobre.etiqueta, 'base64'));
  try {
    const texto = Buffer.concat([
      descifrador.update(Buffer.from(sobre.datos, 'base64')),
      descifrador.final()
    ]).toString('utf8');
    return JSON.parse(texto);
  } catch {
    throw new Error(
      'No se pudo descifrar la copia: la clave no es la correcta o el archivo fue alterado.'
    );
  }
};
