// Revisa que el sitio salga con las cabeceras de seguridad obligatorias.
//
// Lee el archivo _headers de Cloudflare Pages (por defecto dist/_headers, el
// que se publica) y comprueba la regla "/*", que aplica a todas las páginas.
// Si falta alguna cabecera, o la CSP deja abierto algo que no debe, la CI
// falla y dice qué agregar. Referencia: punto 3.1 del estándar de calidad y
// seguridad (conocimiento/estandar/calidad-y-seguridad.md).
//
// Uso: node scripts/revisar-cabeceras.mjs [ruta del _headers]

import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Devuelve { cabecera en minúsculas: valor } de la regla "/*".
export const leerReglaGeneral = (texto) => {
  const cabeceras = {};
  let enGeneral = false;
  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.trim() || linea.trim().startsWith('#')) continue;
    if (!/^\s/.test(linea)) {
      enGeneral = linea.trim() === '/*';
      continue;
    }
    if (!enGeneral) continue;
    const i = linea.indexOf(':');
    if (i > 0) cabeceras[linea.slice(0, i).trim().toLowerCase()] = linea.slice(i + 1).trim();
  }
  return cabeceras;
};

// Lista de problemas; vacía si todo está bien.
export const problemasDeCabeceras = (cabeceras) => {
  const problemas = [];
  const exigir = (nombre, explicacion) => {
    if (!cabeceras[nombre]) problemas.push(`Falta ${nombre}: ${explicacion}`);
  };

  exigir('content-security-policy', 'dice desde dónde puede cargar código la página.');
  exigir('x-content-type-options', 'debe ser "nosniff".');
  exigir('referrer-policy', 'por ejemplo "strict-origin-when-cross-origin".');
  exigir('permissions-policy', 'apaga cámara, micrófono y ubicación si no se usan.');
  exigir('strict-transport-security', 'obliga a usar siempre HTTPS.');

  const csp = cabeceras['content-security-policy'];
  if (csp) {
    const directivas = Object.fromEntries(
      csp
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => {
          const [nombre, ...valores] = d.split(/\s+/);
          return [nombre.toLowerCase(), valores.join(' ')];
        })
    );
    if (!('default-src' in directivas)) problemas.push('La CSP no tiene default-src.');
    if (directivas['object-src'] !== "'none'") problemas.push("La CSP debe tener object-src 'none'.");
    if (/'unsafe-inline'|'unsafe-eval'/.test(directivas['script-src'] ?? directivas['default-src'] ?? '')) {
      problemas.push("La CSP permite scripts 'unsafe-inline' o 'unsafe-eval': es justo lo que tiene que impedir.");
    }
    if (/(^|\s)\*(\s|$)/.test(directivas['script-src'] ?? directivas['default-src'] ?? '')) {
      problemas.push('La CSP permite scripts de cualquier origen (*).');
    }
    const enMarco = directivas['frame-ancestors'];
    if (!enMarco && !cabeceras['x-frame-options']) {
      problemas.push("Falta frame-ancestors en la CSP (o X-Frame-Options): sin eso, otra web puede meter esta app en un marco invisible.");
    }
  }
  return problemas;
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ruta = process.argv[2] ?? 'dist/_headers';
  if (!existsSync(ruta)) {
    console.error(
      `No existe ${ruta}. Copia public/_headers de la plantilla de arranque (Vite lo pasa a dist/ al compilar).`
    );
    process.exit(1);
  }
  const problemas = problemasDeCabeceras(leerReglaGeneral(readFileSync(ruta, 'utf8')));
  if (problemas.length) {
    console.error(`Cabeceras de seguridad incompletas en ${ruta}:`);
    for (const p of problemas) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`Cabeceras de seguridad completas en ${ruta}.`);
}
