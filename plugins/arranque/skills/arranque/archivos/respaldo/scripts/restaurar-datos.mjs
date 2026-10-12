// Carga en una base de Supabase la copia que genera scripts/backup-datos.mjs
// (la carpeta copia/) y comprueba que quedo igual: las cuentas del equipo, las
// tablas y los archivos de Storage.
//
// Pensado para practicar la restauracion en un proyecto de PRUEBA y, el dia
// que haga falta, para reconstruir la base en un proyecto nuevo. El paso a paso
// completo, incluido el SQL que hay que correr antes, esta en
// docs/restaurar-backup.md.
//
// Protecciones, porque un error aca escribe sobre datos reales:
//   1. Se niega a escribir en la base de produccion (la de VITE_SUPABASE_URL
//      en .env).
//   2. Se niega a escribir en una base o un bucket que ya tengan datos:
//      restaurar es llenar un proyecto vacio, nunca mezclar.
//   3. Al terminar compara fila por fila las tablas y, archivo por archivo,
//      la huella (SHA-256) de cada archivo de Storage.
//   4. Si algo no coincide, dice la tabla, el id y el campo, nunca el valor:
//      la salida de la terminal no debe mostrar datos de personas.
//
// Las cuentas se vuelven a crear con el mismo id (las tablas de perfiles
// apuntan a auth.users), sin contrasena: cada persona pone una nueva al entrar.
//
// Las imagenes estan guardadas como URL completa del proyecto
// viejo; se reescriben para que apunten al nuevo (scripts/archivos-storage.mjs).
//
// Uso: completar .env.restauracion (ver .env.restauracion.example) y correr
//   node scripts/restaurar-datos.mjs

import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { huella, reescribirUrlsStorage, rutaEnUrl } from './archivos-storage.mjs';
import { descifrar } from './cifrado-copia.mjs';
import { dependencias, ordenDeCarga } from './orden-de-carga.mjs';

const ORIGEN = 'copia';

const leerEnv = async (archivo) => {
  try {
    const texto = await readFile(archivo, 'utf8');
    return Object.fromEntries(
      texto
        .split(/\r?\n/)
        .filter((linea) => /^[A-Z_]+=/.test(linea))
        .map((linea) => [
          linea.slice(0, linea.indexOf('=')),
          linea.slice(linea.indexOf('=') + 1).trim()
        ])
    );
  } catch {
    return {};
  }
};

const fallar = (mensaje) => {
  console.error(`\nERROR: ${mensaje}`);
  process.exit(1);
};

const { DESTINO_URL, DESTINO_SERVICE_KEY, BACKUP_CLAVE } = await leerEnv('.env.restauracion');
const { VITE_SUPABASE_URL: PRODUCCION } = await leerEnv('.env');

if (!DESTINO_URL || !DESTINO_SERVICE_KEY || DESTINO_URL.includes('xxxxxxxx')) {
  fallar('Completa DESTINO_URL y DESTINO_SERVICE_KEY en .env.restauracion.');
}

const host = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

if (!host(DESTINO_URL)) fallar(`DESTINO_URL no es una URL valida: ${DESTINO_URL}`);
if (PRODUCCION && host(DESTINO_URL) === host(PRODUCCION)) {
  fallar(
    'DESTINO_URL es la base de PRODUCCION. Este script solo escribe en un proyecto\n' +
      '  de prueba o en uno nuevo. No se hizo ningun cambio.'
  );
}

const DESTINO = DESTINO_URL.replace(/\/+$/, '');

// Supabase tiene dos tipos de clave de servicio: la antigua service_role (un
// JWT, empieza con "eyJ") y la nueva secret key ("sb_secret_..."). La nueva va
// solo en el encabezado apikey; mandarla tambien como Bearer la rechaza,
// porque no es un JWT. La antigua funciona en los dos.
const cabeceras = {
  apikey: DESTINO_SERVICE_KEY,
  ...(DESTINO_SERVICE_KEY.startsWith('eyJ') && {
    Authorization: `Bearer ${DESTINO_SERVICE_KEY}`
  })
};

// --- Tablas ---------------------------------------------------------------

const contarFilas = async (tabla) => {
  const respuesta = await fetch(`${DESTINO}/rest/v1/${tabla}?select=*`, {
    method: 'HEAD',
    headers: { ...cabeceras, Prefer: 'count=exact' }
  });
  if (!respuesta.ok) {
    fallar(
      `${tabla}: HTTP ${respuesta.status} al consultar el destino.\n` +
        '  Si es 404, la tabla no existe: falta correr el SQL del paso 2 de\n' +
        '  docs/restaurar-backup.md. Si es 401, la clave no es la de servicio.'
    );
  }
  return Number(respuesta.headers.get('content-range')?.split('/')[1] ?? 0);
};

const leerTodo = async (tabla) => {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const respuesta = await fetch(`${DESTINO}/rest/v1/${tabla}?select=*`, {
      headers: { ...cabeceras, Range: `${desde}-${desde + 999}`, 'Range-Unit': 'items' }
    });
    if (!respuesta.ok) fallar(`${tabla}: HTTP ${respuesta.status} al leer para verificar.`);
    const pagina = await respuesta.json();
    filas.push(...pagina);
    if (pagina.length < 1000) break;
  }
  return filas;
};

const insertar = async (tabla, filas) => {
  for (let i = 0; i < filas.length; i += 500) {
    const respuesta = await fetch(`${DESTINO}/rest/v1/${tabla}`, {
      method: 'POST',
      headers: { ...cabeceras, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(filas.slice(i, i + 500))
    });
    if (!respuesta.ok) fallar(`${tabla}: HTTP ${respuesta.status}\n  ${await respuesta.text()}`);
  }
};

// --- Storage --------------------------------------------------------------

const pedirStorage = (ruta, opciones = {}) =>
  fetch(`${DESTINO}/storage/v1/${ruta}`, {
    ...opciones,
    headers: { ...cabeceras, ...opciones.headers }
  });

const listarObjetos = async (bucket, prefijo = '') => {
  const respuesta = await pedirStorage(`object/list/${bucket}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: prefijo, limit: 1000, offset: 0 })
  });
  if (!respuesta.ok) fallar(`Storage ${bucket}: HTTP ${respuesta.status} al listar.`);
  const objetos = [];
  for (const item of await respuesta.json()) {
    const ruta = prefijo ? `${prefijo}/${item.name}` : item.name;
    if (item.id === null) objetos.push(...(await listarObjetos(bucket, ruta)));
    else objetos.push(ruta);
  }
  return objetos;
};

const existeBucket = async (bucket) => (await pedirStorage(`bucket/${bucket}`)).ok;

// --- 1. Leer la copia ------------------------------------------------------

// Las copias nuevas vienen en copia.cifrada y se descifran solo en memoria:
// los datos de clientes nunca quedan en claro en el disco. Las copias
// anteriores al cifrado (un JSON por tabla) se siguen pudiendo leer.
let contenido;
try {
  contenido = await readdir(ORIGEN);
} catch {
  fallar(`No existe la carpeta ${ORIGEN}/. Descomprime ahi la copia bajada de GitHub Actions.`);
}

const archivos = {};
if (contenido.includes('copia.cifrada')) {
  if (!BACKUP_CLAVE) {
    fallar(
      'La copia esta cifrada. Agrega BACKUP_CLAVE a .env.restauracion: es la clave\n' +
        '  guardada fuera de GitHub cuando se configuro el backup.'
    );
  }
  try {
    Object.assign(
      archivos,
      descifrar(await readFile(`${ORIGEN}/copia.cifrada`, 'utf8'), BACKUP_CLAVE)
    );
  } catch (error) {
    fallar(error.message);
  }
} else {
  for (const nombre of contenido.filter((f) => f.endsWith('.json'))) {
    archivos[nombre] = await readFile(`${ORIGEN}/${nombre}`, 'utf8');
  }
}

const enCopia = Object.keys(archivos)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_') && !f.startsWith('storage/'))
  .map((f) => f.replace(/\.json$/, ''));
if (!enCopia.length) fallar(`${ORIGEN}/ no tiene ninguna tabla.`);

// Cada tabla despues de las que apunta, deducido del SQL del repo.
// schema.sql es opcional: hay proyectos que solo tienen migraciones.
const sqlDelRepo = [];
try {
  sqlDelRepo.push(await readFile('supabase/schema.sql', 'utf8'));
} catch {
  // Sin schema.sql: todo esta en las migraciones.
}
for (const f of (await readdir('supabase/migrations')).filter((f) => f.endsWith('.sql')).sort()) {
  sqlDelRepo.push(await readFile(`supabase/migrations/${f}`, 'utf8'));
}
const deps = dependencias(sqlDelRepo);

// La copia trae todas las tablas que tiene la base, incluidas las que alguien
// creo a mano y nunca pasaron por el repo (restos de una plantilla, la tabla
// temporal del demo). Esas no existen en un proyecto armado con las
// migraciones: si estan vacias se saltan; si tienen filas, hay que decidir
// que hacer con ellas antes de restaurar.
const fueraDelRepo = enCopia.filter((t) => !(t in deps));
const conFilas = fueraDelRepo.filter((t) => JSON.parse(archivos[`${t}.json`]).length > 0);
if (conFilas.length) {
  fallar(
    `Estas tablas tienen filas en la copia pero no existen en el SQL del repo: ${conFilas.join(', ')}.\n` +
      '  Un proyecto armado con las migraciones no las tiene. Si son del demo, borrar el demo\n' +
      '  en produccion y tomar una copia nueva; si son datos reales, agregarlas al repo con\n' +
      '  una migracion.'
  );
}
if (fueraDelRepo.length) {
  console.log(`  (se saltan, vacias y fuera del repo: ${fueraDelRepo.join(', ')})`);
}
const tablas = ordenDeCarga(
  enCopia.filter((t) => t in deps),
  deps
);

// Lo que tiene que quedar en el destino: las filas de la copia con las URLs
// de Storage apuntando al proyecto nuevo.
let urlsReescritas = 0;
const esperado = {};
for (const tabla of tablas) {
  esperado[tabla] = JSON.parse(archivos[`${tabla}.json`]).map((fila) => {
    const nueva = reescribirUrlsStorage(fila, DESTINO);
    if (JSON.stringify(nueva) !== JSON.stringify(fila)) urlsReescritas++;
    return nueva;
  });
}

// Copias anteriores a esta version no traen Storage: se restauran solo tablas.
const storage = archivos['_storage.json']
  ? JSON.parse(archivos['_storage.json'])
  : { buckets: [], archivos: [] };

const resumen = JSON.parse(archivos['_resumen.json'] ?? '{}');
console.log(`\nCopia del ${resumen.fecha ?? '(fecha desconocida)'} -> ${host(DESTINO)}\n`);
if (!archivos['_storage.json']) {
  console.log('  (esta copia es anterior al respaldo de Storage: solo trae tablas)\n');
}

const cuentas = JSON.parse(archivos['_cuentas.json'] ?? '[]');
if (!archivos['_cuentas.json']) {
  console.log(
    '  (esta copia no trae las cuentas: lo que apunte a auth.users no se va a poder cargar)\n'
  );
}

const listarCuentas = async () => {
  const respuesta = await fetch(`${DESTINO}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: cabeceras
  });
  if (!respuesta.ok) fallar(`Cuentas: HTTP ${respuesta.status} al listar en el destino.`);
  return (await respuesta.json()).users ?? [];
};

// --- 2. El destino tiene que estar vacio ----------------------------------

if ((await listarCuentas()).length > 0) {
  fallar(
    'El destino ya tiene cuentas creadas. Restaurar es llenar un proyecto nuevo:\n' +
      '  las cuentas de la copia se crean con su id original y no pueden chocar.'
  );
}
for (const tabla of tablas) {
  const filas = await contarFilas(tabla);
  if (filas > 0) {
    fallar(
      `${tabla} ya tiene ${filas} filas en el destino. Restaurar es llenar una base\n` +
        '  vacia; mezclar con datos existentes daria una base que no es ninguna de las dos.\n' +
        '  Si es un proyecto recien creado, falta correr supabase/restauracion/preparar.sql:\n' +
        '  las migraciones cargan contenido de ejemplo.'
    );
  }
}
for (const { id } of storage.buckets) {
  if ((await existeBucket(id)) && (await listarObjetos(id)).length > 0) {
    fallar(`El bucket ${id} ya tiene archivos en el destino. Restaurar es llenar uno vacio.`);
  }
}

// --- 3. Cargar -------------------------------------------------------------

// Primero las cuentas, con el mismo id: los perfiles apuntan a ellas. La contrasena
// es una al azar que nadie conoce; cada persona pone la suya con "olvide mi
// contrasena" o el dueno se la cambia desde el panel de Supabase.
for (const { id, email, phone, user_metadata, app_metadata } of cuentas) {
  const respuesta = await fetch(`${DESTINO}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { ...cabeceras, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      email,
      phone,
      email_confirm: true,
      password: randomBytes(24).toString('base64url'),
      user_metadata,
      app_metadata
    })
  });
  if (!respuesta.ok) fallar(`Cuenta ${id}: HTTP ${respuesta.status}\n  ${await respuesta.text()}`);
  const creada = await respuesta.json();
  if (creada.id !== id) {
    fallar(
      `La cuenta ${id} se creo con otro id (${creada.id}). Supabase no respeto el id\n` +
        '  original y los perfiles no van a poder apuntarle. Borrar el proyecto de destino y avisar.'
    );
  }
}
if (cuentas.length) {
  console.log(
    `  ${'(cuentas del equipo)'.padEnd(28)} ${String(cuentas.length).padStart(6)} creadas`
  );
}

for (const tabla of tablas) {
  await insertar(tabla, esperado[tabla]);
  console.log(`  ${tabla.padEnd(28)} ${String(esperado[tabla].length).padStart(6)} filas cargadas`);
}
if (urlsReescritas) {
  console.log(`  (${urlsReescritas} filas con URLs de imagenes reescritas al proyecto nuevo)`);
}

for (const { id, publico } of storage.buckets) {
  if (!(await existeBucket(id))) {
    const respuesta = await pedirStorage('bucket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: id, public: publico })
    });
    if (!respuesta.ok) fallar(`No se pudo crear el bucket ${id}: HTTP ${respuesta.status}`);
  }
  const suyos = storage.archivos.filter((a) => a.bucket === id);
  for (const { ruta, tipo } of suyos) {
    const respuesta = await pedirStorage(`object/${id}/${rutaEnUrl(ruta)}`, {
      method: 'POST',
      headers: { 'Content-Type': tipo, 'x-upsert': 'false' },
      body: Buffer.from(archivos[`storage/${id}/${ruta}`], 'base64')
    });
    if (!respuesta.ok) {
      fallar(`Storage ${id}/${ruta}: HTTP ${respuesta.status}\n  ${await respuesta.text()}`);
    }
  }
  console.log(`  storage/${id.padEnd(20)} ${String(suyos.length).padStart(6)} archivos subidos`);
}

// --- 4. Verificar ----------------------------------------------------------

console.log('\nVerificando contra la copia...\n');

let diferencias = 0;
const informar = (nombre, problemas) => {
  diferencias += problemas.length;
  console.log(
    `  ${nombre.padEnd(28)} ${problemas.length ? `${problemas.length} DIFERENCIAS` : 'identica'}`
  );
  for (const p of problemas.slice(0, 5)) console.log(`      ${p}`);
  if (problemas.length > 5) console.log(`      ... y ${problemas.length - 5} mas`);
};

// Las tablas sin columna id (las de union, como un producto en una categoria)
// se comparan por la fila completa.
const clave = (fila) =>
  'id' in fila
    ? JSON.stringify(fila.id)
    : JSON.stringify(Object.entries(fila).sort(([a], [b]) => a.localeCompare(b)));

{
  const enDestino = new Set((await listarCuentas()).map((u) => u.id));
  const problemas = cuentas
    .filter(({ id }) => !enDestino.has(id))
    .map(({ id }) => `cuenta ${id} no esta en el destino`);
  if (enDestino.size !== cuentas.length) {
    problemas.push(`hay ${enDestino.size} cuentas y la copia tiene ${cuentas.length}`);
  }
  informar('(cuentas del equipo)', problemas);
}

for (const tabla of tablas) {
  const filasEsperadas = new Map(esperado[tabla].map((fila) => [clave(fila), fila]));
  const actuales = await leerTodo(tabla);
  const problemas = [];

  if (actuales.length !== filasEsperadas.size) {
    problemas.push(`hay ${actuales.length} filas y la copia tiene ${filasEsperadas.size}`);
  }
  for (const fila of actuales) {
    const original = filasEsperadas.get(clave(fila));
    const nombre = 'id' in fila ? `fila ${fila.id}` : 'una fila';
    if (!original) {
      problemas.push(`${nombre} no esta en la copia`);
      continue;
    }
    // Solo el nombre del campo: los valores pueden ser datos de una persona.
    for (const campo of new Set([...Object.keys(original), ...Object.keys(fila)])) {
      if (JSON.stringify(original[campo]) !== JSON.stringify(fila[campo])) {
        problemas.push(`${nombre}, campo ${campo}: distinto de la copia`);
      }
    }
  }
  informar(tabla, problemas);
}

for (const { id } of storage.buckets) {
  const suyos = storage.archivos.filter((a) => a.bucket === id);
  const enDestino = await listarObjetos(id);
  const problemas = [];
  if (enDestino.length !== suyos.length) {
    problemas.push(`hay ${enDestino.length} archivos y la copia tiene ${suyos.length}`);
  }
  for (const { ruta, huella: esperada } of suyos) {
    const respuesta = await pedirStorage(`object/${id}/${rutaEnUrl(ruta)}`);
    if (!respuesta.ok) {
      problemas.push(`${ruta}: HTTP ${respuesta.status} al descargarlo`);
      continue;
    }
    if (huella(Buffer.from(await respuesta.arrayBuffer())) !== esperada) {
      problemas.push(`${ruta}: el contenido no coincide con la copia`);
    }
  }
  informar(`storage/${id}`, problemas);
}

if (diferencias) {
  fallar(
    `${diferencias} diferencias entre el destino y la copia. La restauracion NO es fiel.\n` +
      '  Si se olvido supabase/restauracion/preparar.sql, algun trigger pudo cambiar\n' +
      '  filas al cargarlas: ver docs/restaurar-backup.md.'
  );
}

console.log('\nRestauracion verificada: el destino es identico a la copia.');
console.log('Falta correr supabase/restauracion/terminar.sql para encender los triggers.');
