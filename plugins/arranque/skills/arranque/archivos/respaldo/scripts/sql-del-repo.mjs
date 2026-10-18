// Los archivos SQL que arman la base, en el orden en que se corren.
//
// Lo usan la restauración y su test, para que los dos armen la base igual.
// Se elige así, de lo más explícito a lo más automático:
//
//   1. supabase/restauracion/orden.txt: un archivo por línea, relativo a
//      supabase/ (las líneas vacías y las que empiezan con # no cuentan).
//      Hace falta cuando en supabase/ hay SQL que NO son migraciones: uno que
//      solo revisa (ESCALA: 000_revisar.sql) o uno que deshace otra
//      (ESCALA: 011_deshacer.sql). Correrlos en una restauración rompe la base.
//   2. supabase/schema.sql (si existe) y supabase/migrations/*.sql en orden.
//   3. supabase/*.sql en orden alfabético.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const soloSql = (lista) => lista.filter((f) => f.endsWith('.sql')).sort();

export const nombresSqlDelRepo = (raiz = 'supabase') => {
  const orden = join(raiz, 'restauracion', 'orden.txt');
  if (existsSync(orden)) {
    return readFileSync(orden, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
  }
  if (existsSync(join(raiz, 'migrations'))) {
    return [
      ...(existsSync(join(raiz, 'schema.sql')) ? ['schema.sql'] : []),
      ...soloSql(readdirSync(join(raiz, 'migrations'))).map((f) => `migrations/${f}`)
    ];
  }
  return soloSql(readdirSync(raiz));
};

// [{ archivo, sql }] en orden. Falla con un mensaje claro si orden.txt nombra
// un archivo que no existe.
export const sqlDelRepo = (raiz = 'supabase') =>
  nombresSqlDelRepo(raiz).map((archivo) => {
    const ruta = join(raiz, archivo);
    if (!existsSync(ruta))
      throw new Error(`No existe ${ruta} (está en el orden de la restauración).`);
    return { archivo, sql: readFileSync(ruta, 'utf8') };
  });
