// Qué ve alguien SIN sesión en la base de Supabase del proyecto.
//
// La clave pública (anon / publishable) viaja dentro del JavaScript del sitio:
// cualquiera la tiene. Este script hace lo mismo que haría un curioso con esa
// clave: intenta leer una fila de cada tabla. SOLO LEE: no escribe, no borra,
// no llama funciones.
//
// Uso, desde la carpeta del proyecto:
//   node <ruta-de-la-skill>/scripts/acceso-anonimo.mjs [archivo .env]
//
// Lee VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (o _PUBLISHABLE_KEY) del
// archivo indicado, o del primero de .env.local / .env que las tenga. Nunca
// imprime la clave.
//
// Las tablas salen de los `create table` del propio repo (cualquier .sql bajo
// supabase/). Se prueban también las que la API anuncie, si todavía publica
// su esquema: los proyectos nuevos de Supabase ya no lo dan a la clave
// pública, y eso está bien.
//
// Qué hacer con el resultado: una tabla legible sin sesión no es un error en
// sí (una carta de restaurante es pública a propósito). Lo es si tiene datos
// de personas (nombres, DNI, teléfonos, direcciones, salud), de dinero, o
// cualquier cosa que el dueño no publicaría en un cartel.

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
  return url && clave ? { url, clave } : null
}


// Tabla -> sus columnas, sacadas de los create table y alter table ... add
// column de cualquier .sql bajo supabase/. Es una lectura aproximada (no un
// parser de SQL): alcanza para saber qué columnas probar una por una.
const columnas = new Map()
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
        if (palabra && !NO_SON_COLUMNAS.has(palabra) && !lista.includes(palabra)) lista.push(palabra)
      }
      columnas.set(nombre, lista)
    }
    for (const m of sql.matchAll(new RegExp(String.raw`alter\s+table\s+(?:if\s+exists\s+)?${tabla}\s+add\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_][a-z0-9_]*)"?`, 'gi'))) {
      const lista = columnas.get(m[1].toLowerCase()) ?? []
      if (!lista.includes(m[2].toLowerCase())) lista.push(m[2].toLowerCase())
      columnas.set(m[1].toLowerCase(), lista)
    }
  }
}

async function revisar(archivo, { url, clave }) {
  const cabeceras = { apikey: clave, Authorization: `Bearer ${clave}` }
  leerSql()
  const tablas = new Set(columnas.keys())
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
  console.log(
    raiz.ok
      ? `La API publica su esquema a la clave pública: ${funciones.length} funciones a la vista.`
      : `La API no publica su esquema a la clave pública (${raiz.status}): bien. Tablas sacadas del repo.`,
  )
  console.log(`Tablas a probar: ${tablas.size}\n`)

  const legibles = []
  for (const tabla of [...tablas].sort()) {
    const r = await fetch(`${url}/rest/v1/${encodeURIComponent(tabla)}?select=*&limit=1`, {
      headers: { ...cabeceras, Prefer: 'count=exact' },
    })
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
        console.log(`  ${tabla.padEnd(30)} LEGIBLE POR COLUMNAS: ${filasPorColumna} filas · columnas: ${porColumna.join(', ')}`)
      } else {
        console.log(`  ${tabla.padEnd(30)} bloqueada (${r.status})`)
      }
      continue
    }
    const total = r.headers.get('content-range')?.split('/')[1] ?? '?'
    const filas = await r.json()
    if (filas.length === 0) {
      console.log(`  ${tabla.padEnd(30)} 0 filas visibles`)
      continue
    }
    legibles.push(tabla)
    console.log(`  ${tabla.padEnd(30)} LEGIBLE: ${total} filas · columnas: ${Object.keys(filas[0]).join(', ')}`)
  }

  if (funciones.length) {
    console.log(`\nFunciones expuestas (no se llamaron; revisar a mano qué hacen): ${funciones.sort().join(', ')}`)
  }
  console.log(
    legibles.length
      ? `\n${legibles.length} tabla(s) legibles sin sesión: ${legibles.join(', ')}. Decidir cuál es pública a propósito.`
      : '\nNinguna tabla devuelve filas sin sesión.',
  )
}

const candidatos = process.argv[2] ? [process.argv[2]] : ['.env.local', '.env']
const elegido = candidatos.find(conClaves)
if (!elegido) {
  console.error(`Ninguno de ${candidatos.join(', ')} tiene VITE_SUPABASE_URL y la clave pública.`)
  process.exitCode = 2
} else {
  await revisar(elegido, conClaves(elegido))
}
