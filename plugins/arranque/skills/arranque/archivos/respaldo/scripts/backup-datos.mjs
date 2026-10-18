// Baja una copia de todas las tablas y de todos los archivos de Storage y la
// guarda cifrada en copia/copia.cifrada.
//
// Por que asi y no con pg_dump: pg_dump necesita la cadena de conexion
// de Postgres, que Supabase esconde tres niveles adentro de su panel y
// exige elegir bien entre tres variantes parecidas. Esto solo necesita
// dos datos que estan juntos en una sola pantalla.
//
// Que respalda y que no:
//   - Los DATOS: todo lo que no se puede volver a escribir a mano
//     (clientes, ventas, caja...) y los ARCHIVOS de Storage (imagenes,
//     comprobantes).
//   - La ESTRUCTURA no hace falta respaldarla: tablas, funciones y
//     politicas RLS ya viven versionadas en supabase/schema.sql y
//     supabase/migrations/. Ese es el respaldo del esquema.
//   - Las CUENTAS de acceso las administra Supabase aparte y no entran.
//
// La copia se guarda CIFRADA (ver scripts/cifrado-copia.mjs): trae datos
// personales. Las tablas
// nunca se escriben en claro al disco; solo copia/copia.cifrada y un
// copia/_resumen.json con nombres de tablas y conteos, sin datos.
//
// Para restaurar: docs/restaurar-backup.md.

import { huella, rutaEnUrl } from './archivos-storage.mjs';
import { cifrar } from './cifrado-copia.mjs';

const URL_BASE = process.env.SUPABASE_URL;
const CLAVE = process.env.SUPABASE_SERVICE_KEY;
const CLAVE_CIFRADO = process.env.BACKUP_CLAVE;
const DESTINO = 'copia';

if (!URL_BASE || !CLAVE) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

// Sin clave de cifrado no se baja nada: un backup en rojo se nota y se arregla;
// uno que sube datos de clientes en claro no se nota hasta que es tarde.
if (!CLAVE_CIFRADO) {
  console.error(
    'Falta BACKUP_CLAVE. La copia tiene datos personales y no se guarda sin cifrar.\n' +
      'Cargarla en Settings -> Secrets and variables -> Actions.'
  );
  process.exit(1);
}

const { mkdir, readdir, readFile, writeFile } = await import('node:fs/promises');

// La service_role antigua es un JWT ("eyJ...") y va tambien como Bearer; la
// secret key nueva ("sb_secret_...") va solo en apikey: como Bearer se rechaza.
const cabeceras = {
  apikey: CLAVE,
  ...(CLAVE.startsWith('eyJ') && { Authorization: `Bearer ${CLAVE}` })
};

// La lista de tablas sale del esquema versionado y no de una lista
// escrita a mano: asi una tabla que se agregue en una migracion entra
// sola en la copia. Una lista fija siempre se olvida de actualizar
// justo la tabla que despues hace falta recuperar.
const tablasDelEsquema = async () => {
  const archivos = [];
  for (const dir of ['supabase', 'supabase/migrations']) {
    try {
      const entradas = await readdir(dir);
      archivos.push(...entradas.filter((f) => f.endsWith('.sql')).map((f) => `${dir}/${f}`));
    } catch {
      // La carpeta puede no existir en algun proyecto; no es un fallo.
    }
  }

  const tablas = new Set();
  for (const archivo of archivos) {
    const sql = await readFile(archivo, 'utf8');
    for (const m of sql.matchAll(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi
    )) {
      tablas.add(m[1]);
    }
  }
  return [...tablas].sort();
};

// Ademas se le pregunta a la propia API, por si hay alguna tabla creada
// a mano en el panel que nunca paso por una migracion. Con algunas
// claves este endpoint viene restringido: si no contesta, se sigue con
// las del esquema y se avisa, en vez de abortar la copia entera.
const tablasDeLaApi = async () => {
  try {
    const respuesta = await fetch(`${URL_BASE}/rest/v1/`, { headers: cabeceras });
    if (!respuesta.ok) return null;
    const spec = await respuesta.json();
    return Object.keys(spec.definitions ?? spec.components?.schemas ?? {});
  } catch {
    return null;
  }
};

const listarTablas = async () => {
  const delEsquema = await tablasDelEsquema();
  const deLaApi = await tablasDeLaApi();

  if (deLaApi === null) {
    console.log('  (la API no quiso listar sus tablas; se usan las del esquema versionado)\n');
    return delEsquema;
  }

  const soloEnLaApi = deLaApi.filter((t) => !delEsquema.includes(t));
  if (soloEnLaApi.length) {
    console.log(
      `  Ojo: estas tablas existen en la base pero no en el esquema del repo: ${soloEnLaApi.join(', ')}\n`
    );
  }
  return [...new Set([...delEsquema, ...deLaApi])].sort();
};

// De a mil filas: sin paginar, una tabla grande se corta en silencio en
// el limite que tenga puesto el servidor.
const TAMANO_PAGINA = 1000;

const bajarTabla = async (tabla) => {
  const filas = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const hasta = desde + TAMANO_PAGINA - 1;
    const respuesta = await fetch(`${URL_BASE}/rest/v1/${tabla}?select=*`, {
      headers: { ...cabeceras, Range: `${desde}-${hasta}`, 'Range-Unit': 'items' }
    });
    if (respuesta.status === 401 || respuesta.status === 403) {
      // Sintoma clasico de haber cargado la clave publica en vez de la
      // de servicio: las tablas abiertas al publico se leen bien y las
      // protegidas por RLS devuelven 401. La copia saldria a medias sin
      // que nadie lo note, asi que se dice con todas las letras.
      throw new Error(
        `${tabla}: HTTP ${respuesta.status}. La clave no puede leer esta tabla.\n` +
          '  Casi seguro se cargo la clave publica (anon / publishable) en vez de la de\n' +
          '  servicio (service_role / secret). La de servicio es la unica que pasa por\n' +
          '  encima de RLS y ve todo.'
      );
    }
    // Una tabla que el SQL del repo creo alguna vez pero que una migracion
    // posterior borro o renombro (MiAgenda: gastos paso a ser movimientos)
    // no existe en la base: no hay nada que respaldar de ella.
    if (respuesta.status === 404) {
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (cuerpo.code === 'PGRST205' || cuerpo.code === '42P01') return null;
      throw new Error(`${tabla}: HTTP 404`);
    }
    if (!respuesta.ok) throw new Error(`${tabla}: HTTP ${respuesta.status}`);
    const pagina = await respuesta.json();
    filas.push(...pagina);
    if (pagina.length < TAMANO_PAGINA) break;
  }
  return filas;
};

await mkdir(DESTINO, { recursive: true });

const tablas = await listarTablas();
if (!tablas.length)
  throw new Error('La base no devolvio ninguna tabla. Algo esta mal en la conexion.');

let totalFilas = 0;
const resumen = [];
const archivos = {};

const yaNoExisten = [];
for (const tabla of tablas) {
  const filas = await bajarTabla(tabla);
  if (filas === null) {
    yaNoExisten.push(tabla);
    continue;
  }
  archivos[`${tabla}.json`] = JSON.stringify(filas, null, 2);
  totalFilas += filas.length;
  resumen.push({ tabla, filas: filas.length });
  console.log(`  ${tabla.padEnd(28)} ${String(filas.length).padStart(6)} filas`);
}

// --- Cuentas del equipo (Supabase Auth) ---
//
// Las tablas de perfiles suelen apuntar a auth.users, y lo que registra el
// equipo apunta a esos perfiles. Sin las cuentas, la copia no se puede cargar en
// un proyecto nuevo: se guardan su id, correo y metadatos para volver a
// crearlas con el MISMO id. Las contrasenas no salen de Supabase: al
// restaurar, cada persona pone una nueva.

const usuarios = [];
for (let pagina = 1; ; pagina++) {
  const respuesta = await fetch(`${URL_BASE}/auth/v1/admin/users?page=${pagina}&per_page=1000`, {
    headers: cabeceras
  });
  if (!respuesta.ok) throw new Error(`Cuentas: HTTP ${respuesta.status}`);
  const lote = (await respuesta.json()).users ?? [];
  usuarios.push(
    ...lote.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone || undefined,
      user_metadata: u.user_metadata,
      app_metadata: u.app_metadata
    }))
  );
  if (lote.length < 1000) break;
}
archivos['_cuentas.json'] = JSON.stringify(usuarios, null, 2);
console.log(
  `  ${'(cuentas del equipo)'.padEnd(28)} ${String(usuarios.length).padStart(6)} cuentas`
);

// --- Storage: los archivos (imagenes, comprobantes) ---
//
// Las tablas guardan donde estan los archivos, pero no los archivos. Sin
// esto, perder el proyecto es perder las fotos y los comprobantes, que no
// se pueden volver a pedir. La lista de buckets se le pregunta a Supabase, igual que la de
// tablas: un bucket nuevo entra solo en la copia.

const pedirStorage = async (ruta, opciones = {}) => {
  const respuesta = await fetch(`${URL_BASE}/storage/v1/${ruta}`, {
    ...opciones,
    headers: { ...cabeceras, ...opciones.headers }
  });
  if (!respuesta.ok) throw new Error(`Storage ${ruta}: HTTP ${respuesta.status}`);
  return respuesta;
};

const listarObjetos = async (bucket, prefijo = '') => {
  const objetos = [];
  for (let desde = 0; ; desde += 1000) {
    const pagina = await (
      await pedirStorage(`object/list/${bucket}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: prefijo,
          limit: 1000,
          offset: desde,
          sortBy: { column: 'name', order: 'asc' }
        })
      })
    ).json();
    for (const item of pagina) {
      const ruta = prefijo ? `${prefijo}/${item.name}` : item.name;
      // Las carpetas vienen sin id: se recorren por dentro.
      if (item.id === null) objetos.push(...(await listarObjetos(bucket, ruta)));
      else objetos.push({ ruta, tipo: item.metadata?.mimetype ?? 'application/octet-stream' });
    }
    if (pagina.length < 1000) break;
  }
  return objetos;
};

const buckets = (await (await pedirStorage('bucket')).json()).map((b) => ({
  id: b.id,
  publico: b.public
}));
const indiceStorage = { buckets, archivos: [] };
const resumenStorage = [];

console.log('');
for (const { id: bucket } of buckets) {
  let bytes = 0;
  const objetos = await listarObjetos(bucket);
  for (const { ruta, tipo } of objetos) {
    const contenido = Buffer.from(
      await (await pedirStorage(`object/${bucket}/${rutaEnUrl(ruta)}`)).arrayBuffer()
    );
    archivos[`storage/${bucket}/${ruta}`] = contenido.toString('base64');
    indiceStorage.archivos.push({
      bucket,
      ruta,
      tipo,
      bytes: contenido.length,
      huella: huella(contenido)
    });
    bytes += contenido.length;
  }
  resumenStorage.push({ bucket, archivos: objetos.length, bytes });
  console.log(
    `  storage/${bucket.padEnd(20)} ${String(objetos.length).padStart(6)} archivos, ${(bytes / 1024).toFixed(0)} KB`
  );
}
archivos['_storage.json'] = JSON.stringify(indiceStorage, null, 2);

const textoResumen = JSON.stringify(
  {
    fecha: new Date().toISOString(),
    tablas: resumen,
    totalFilas,
    cuentas: usuarios.length,
    storage: resumenStorage
  },
  null,
  2
);
archivos['_resumen.json'] = textoResumen;

await writeFile(`${DESTINO}/copia.cifrada`, cifrar(archivos, CLAVE_CIFRADO));
await writeFile(`${DESTINO}/_resumen.json`, textoResumen);

console.log(`\n  ${tablas.length - yaNoExisten.length} tablas, ${totalFilas} filas en total.`);
if (yaNoExisten.length) {
  console.log(
    `  (en el SQL del repo pero ya no en la base, se borraron o renombraron: ${yaNoExisten.join(', ')})`
  );
}

// Una copia vacia se guarda igual y parece que todo salio bien. Es la
// forma mas facil de creer que hay respaldo y no tenerlo, asi que se
// falla a proposito.
if (totalFilas === 0) {
  console.error(
    '\nERROR: no se bajo ni una fila. Revisar la clave antes de confiar en esta copia.'
  );
  process.exit(1);
}
