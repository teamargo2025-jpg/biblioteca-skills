// Qué puede hacer alguien SIN sesión en la base de Supabase del proyecto.
//
// La clave pública (anon / publishable) viaja dentro del JavaScript del sitio:
// cualquiera la tiene. Este script hace lo mismo que haría un curioso con esa
// clave, en cuatro partes:
//
//   1. Auth: si cualquiera puede crearse una cuenta.
//   2. Lectura: intenta leer una fila de cada tabla, y columna por columna si
//      la tabla entera está cerrada. Nunca imprime valores, solo nombres de
//      columnas y conteos.
//   3. Escritura: intenta insertar en cada tabla una fila IMPOSIBLE (con la
//      clave primaria en null). La base la rechaza siempre, así que no se
//      escribe nada; pero el código del rechazo dice si la seguridad (RLS) la
//      dejó pasar: Postgres revisa las políticas antes que el NOT NULL.
//   4. Storage: si los archivos de cada bucket se pueden listar.
//
// No borra, no llama funciones y no sube archivos.
//
// Uso, desde la carpeta del proyecto:
//   node <ruta-de-la-skill>/scripts/acceso-anonimo.mjs [archivo .env] [--tablas a,b] [--buckets x,y]
//
// Lee VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (o _PUBLISHABLE_KEY) del
// archivo indicado, o del primero de .env.local / .env que las tenga. Nunca
// imprime la clave.
//
// Las tablas salen de los `create table` del propio repo (cualquier .sql bajo
// supabase/). Pero la base puede tener tablas que el repo no conoce (restos de
// una plantilla, algo creado a mano en el panel): con la clave pública no se
// pueden listar, así que se pasan con --tablas. La lista completa sale de la
// radiografía de references/frentes.md, o del aviso "Ojo: estas tablas existen
// en la base pero no en el esquema del repo" del backup.
//
// Qué hacer con el resultado: una tabla legible sin sesión no es un error en
// sí (una carta de restaurante es pública a propósito). Lo es si tiene datos
// de personas (nombres, DNI, teléfonos, direcciones, salud), de dinero, o
// cualquier cosa que el dueño no publicaría en un cartel. Una tabla
// ESCRIBIBLE sin sesión necesita una razón (el portal de un socio que entra
// con su link) y un tope.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const leerEnv = (archivo) => {
  const valores = {}
  for (const linea of readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) valores[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return valores
}

const conClaves = (archivo) => {
  if (!existsSync(archivo)) return null
  const env = leerEnv(archivo)
  const url = env.VITE_SUPABASE_URL
  const clave = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY
  return url && clave ? { url: url.replace(/\/+$/, ''), clave } : null
}

// Tabla -> sus columnas, sacadas de los create table y alter table ... add
// column de cualquier .sql bajo supabase/. Es una lectura aproximada (no un
// parser de SQL): alcanza para saber qué columnas probar una por una y cuál
// no admite null. También junta los buckets que el SQL crea.
const columnas = new Map()
const obligatorias = new Map()
const bucketsDelSql = new Set()
const ID_INVENTADO = '00000000-0000-4000-8000-000000000000'
const NO_SON_COLUMNAS = new Set(['primary', 'unique', 'foreign', 'check', 'constraint', 'exclude'])

function leerSql(dir = 'supabase') {
  if (!existsSync(dir)) return
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada)
    if (statSync(ruta).isDirectory()) {
      leerSql(ruta)
      continue
    }
    if (!entrada.endsWith('.sql')) continue
    const sql = readFileSync(ruta, 'utf8').replace(/--.*$/gm, '')
    const tabla = /(?:"?public"?\.)?"?([a-z_][a-z0-9_]*)"?/.source
    for (const m of sql.matchAll(new RegExp(String.raw`create\s+table\s+(?:if\s+not\s+exists\s+)?${tabla}\s*\(([\s\S]*?)\n\s*\)\s*;`, 'gi'))) {
      const nombre = m[1].toLowerCase()
      const lista = columnas.get(nombre) ?? []
      for (const linea of m[2].split('\n')) {
        const palabra = linea.trim().match(/^"?([a-z_][a-z0-9_]*)"?\s/i)?.[1]?.toLowerCase()
        if (!palabra || NO_SON_COLUMNAS.has(palabra)) continue
        if (!lista.includes(palabra)) lista.push(palabra)
        if (/primary\s+key|not\s+null/i.test(linea) && !obligatorias.has(nombre)) obligatorias.set(nombre, palabra)
      }
      columnas.set(nombre, lista)
    }
    for (const m of sql.matchAll(new RegExp(String.raw`alter\s+table\s+(?:if\s+exists\s+)?${tabla}\s+add\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_][a-z0-9_]*)"?`, 'gi'))) {
      const lista = columnas.get(m[1].toLowerCase()) ?? []
      if (!lista.includes(m[2].toLowerCase())) lista.push(m[2].toLowerCase())
      columnas.set(m[1].toLowerCase(), lista)
    }
    for (const m of sql.matchAll(/insert\s+into\s+storage\.buckets[^;]*?values\s*\(\s*'([^']+)'/gi)) bucketsDelSql.add(m[1])
  }
}

const lista = (bandera) => {
  const i = process.argv.indexOf(bandera)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean) : []
}

async function revisar(archivo, { url, clave }) {
  const cabeceras = { apikey: clave, ...(clave.startsWith('eyJ') && { Authorization: `Bearer ${clave}` }) }
  leerSql()
  const extras = lista('--tablas')
  const tablas = new Set([...columnas.keys(), ...extras])
  let funciones = []

  const raiz = await fetch(`${url}/rest/v1/`, { headers: cabeceras })
  if (raiz.ok) {
    const rutas = Object.keys((await raiz.json()).paths ?? {}).filter((r) => r !== '/')
    for (const r of rutas) if (!r.startsWith('/rpc/')) tablas.add(r.slice(1))
    funciones = rutas.filter((r) => r.startsWith('/rpc/')).map((r) => r.slice(5))
  } else {
    await raiz.body?.cancel()
  }

  console.log(`Proyecto: ${new URL(url).hostname} (variables de ${archivo})`)

  // --- 1. Auth -----------------------------------------------------------
  const ajustes = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: clave } })
  if (ajustes.ok) {
    const a = await ajustes.json()
    const proveedores = Object.entries(a.external ?? {}).filter(([, si]) => si).map(([p]) => p)
    console.log(
      a.disable_signup
        ? 'Auth: el registro público está cerrado: bien.'
        : 'Auth: REGISTRO PÚBLICO ABIERTO: cualquiera puede crearse una cuenta. Si las cuentas las crea el dueño, cerrarlo (Authentication → Sign In / Providers → Allow new users to sign up).',
    )
    console.log(`      proveedores activos: ${proveedores.join(', ') || 'ninguno'}`)
  } else {
    console.log(`Auth: no se pudo leer la configuración pública (${ajustes.status}).`)
    await ajustes.body?.cancel()
  }

  console.log(
    raiz.ok
      ? `La API publica su esquema a la clave pública: ${funciones.length} funciones a la vista.`
      : `La API no publica su esquema a la clave pública (${raiz.status}): bien. Tablas sacadas del repo${extras.length ? ` y de --tablas (${extras.length})` : ''}.`,
  )
  console.log(`Tablas a probar: ${tablas.size}\n`)

  // --- 2 y 3. Lectura y escritura, tabla por tabla ------------------------
  const legibles = []
  const escribibles = []
  const existentes = []
  for (const tabla of [...tablas].sort()) {
    const r = await fetch(`${url}/rest/v1/${encodeURIComponent(tabla)}?select=*&limit=1`, {
      headers: { ...cabeceras, Prefer: 'count=exact' },
    })
    let lectura
    if (!r.ok) {
      const cuerpo = await r.json().catch(() => ({}))
      if (cuerpo.code === 'PGRST205' || cuerpo.code === '42P01') {
        console.log(`  ${tabla.padEnd(30)} no existe en la base`)
        continue
      }
      // "Permiso denegado" con select=* puede ser un permiso POR COLUMNAS
      // (grant select (id, nombre) on tabla to anon): la tabla entera no se
      // lee, pero esas columnas sí. Pasó en Amira: así se listaban todos los
      // socios con su nombre. Se prueba columna por columna.
      const porColumna = []
      let filasPorColumna = '?'
      for (const columna of columnas.get(tabla) ?? []) {
        const rc = await fetch(`${url}/rest/v1/${encodeURIComponent(tabla)}?select=${columna}&limit=1`, {
          headers: { ...cabeceras, Prefer: 'count=exact' },
        })
        if (rc.ok && (await rc.json()).length > 0) {
          porColumna.push(columna)
          filasPorColumna = rc.headers.get('content-range')?.split('/')[1] ?? '?'
        } else if (!rc.bodyUsed) {
          await rc.body?.cancel()
        }
      }
      if (porColumna.length) {
        legibles.push(tabla)
        lectura = `LEGIBLE POR COLUMNAS: ${filasPorColumna} filas · columnas: ${porColumna.join(', ')}`
      } else {
        lectura = `lectura bloqueada (${r.status})`
      }
    } else {
      const total = r.headers.get('content-range')?.split('/')[1] ?? '?'
      const filas = await r.json()
      if (filas.length === 0) {
        lectura = '0 filas visibles'
      } else {
        legibles.push(tabla)
        lectura = `LEGIBLE: ${total} filas · columnas: ${Object.keys(filas[0]).join(', ')}`
      }
    }
    existentes.push(tabla)

    // Una fila imposible: la columna obligatoria en null. Si RLS la frena,
    // vuelve 42501; si la deja pasar, vuelve 23502 (not null) y la fila
    // igual no se crea. Las columnas *_id van con un id inventado: muchas
    // políticas piden "socio_id is not null", y sin eso la fila se frenaba
    // por la política aunque la tabla estuviera abierta (pasó con
    // registros_series en Amira).
    const columna = obligatorias.get(tabla) ?? 'id'
    const fila = Object.fromEntries((columnas.get(tabla) ?? []).filter((c) => c.endsWith('_id')).map((c) => [c, ID_INVENTADO]))
    fila[columna] = null
    const w = await fetch(`${url}/rest/v1/${encodeURIComponent(tabla)}`, {
      method: 'POST',
      headers: { ...cabeceras, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(fila),
    })
    const codigo = w.ok ? 'CREADA' : ((await w.json().catch(() => ({}))).code ?? String(w.status))
    let escritura
    if (codigo === '42501') escritura = 'escritura cerrada'
    else if (codigo === '22P02') escritura = 'escritura no concluyente (un *_id no es uuid: probar a mano)'
    else if (['23502', '23503', '23514', '23505'].includes(codigo)) {
      escritura = `ESCRIBIBLE (la seguridad dejó pasar la fila; la frenó ${codigo})`
      escribibles.push(tabla)
    } else if (codigo === 'CREADA') {
      escritura = `ESCRIBIBLE Y SE CREÓ UNA FILA con ${columna} vacío: borrarla desde el panel`
      escribibles.push(tabla)
    } else if (codigo === 'PGRST204') escritura = `escritura no probada (no tiene columna ${columna}: pasar la tabla a mano)`
    else escritura = `escritura: respuesta ${codigo}`
    console.log(`  ${tabla.padEnd(30)} ${lectura} · ${escritura}`)
  }

  // --- 4. Storage ---------------------------------------------------------
  const buckets = [...new Set([...bucketsDelSql, ...lista('--buckets')])].sort()
  if (buckets.length) {
    console.log('\nStorage (solo se intenta listar; no se sube nada):')
    for (const b of buckets) {
      const l = await fetch(`${url}/storage/v1/object/list/${encodeURIComponent(b)}`, {
        method: 'POST',
        headers: { ...cabeceras, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: '', limit: 100 }),
      })
      const visibles = l.ok ? (await l.json()).length : null
      if (!l.ok) await l.body?.cancel()
      console.log(`  ${b.padEnd(30)} ${visibles === null ? `no se puede listar (${l.status})` : `${visibles} archivo(s) o carpeta(s) listables sin sesión`}`)
    }
  }

  if (funciones.length) {
    console.log(`\nFunciones expuestas (no se llamaron; revisar a mano qué hacen): ${funciones.sort().join(', ')}`)
  }
  console.log(
    legibles.length
      ? `\n${legibles.length} tabla(s) legibles sin sesión: ${legibles.join(', ')}. Decidir cuál es pública a propósito.`
      : '\nNinguna tabla devuelve filas sin sesión.',
  )
  console.log(
    escribibles.length
      ? `${escribibles.length} tabla(s) escribibles sin sesión: ${escribibles.join(', ')}. Cada una necesita una razón y un tope.`
      : 'Ninguna tabla acepta escrituras sin sesión.',
  )
  if (!extras.length) {
    console.log('Ojo: solo se probaron las tablas que el repo conoce. Si la base tiene otras, pasarlas con --tablas (ver la radiografía de references/frentes.md).')
  }
}

const archivoArg = process.argv.slice(2).find((a, i, todos) => !a.startsWith('--') && !todos[i - 1]?.startsWith('--'))
const candidatos = archivoArg ? [archivoArg] : ['.env.local', '.env']
const elegido = candidatos.find(conClaves)
if (!elegido) {
  console.error(`Ninguno de ${candidatos.join(', ')} tiene VITE_SUPABASE_URL y la clave pública.`)
  process.exitCode = 2
} else {
  await revisar(elegido, conClaves(elegido))
}
