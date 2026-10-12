// @vitest-environment node
//
// Lo que la restauracion da por cierto, probado contra el esquema real del
// repo en PGlite: que el orden de carga respeta cada referencia entre
// tablas, que preparar.sql deja todo vacio y con los triggers apagados, y que
// con eso una copia completa se vuelve a cargar sin errores.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { beforeAll, describe, expect, it } from 'vitest';
import { dependencias, ordenDeCarga } from './orden-de-carga.mjs';

const DIR = new URL('../supabase/', import.meta.url);
const leer = (ruta) => readFileSync(new URL(ruta, DIR), 'utf8');
// Las extensiones que PGlite no trae (programar tareas, llamar a internet,
// la boveda de secretos) se simulan abajo; su create extension se saca.
const sinExtensionesDelServidor = (sql) =>
  sql.replace(
    /create\s+extension\s+(?:if\s+not\s+exists\s+)?"?(pg_cron|pg_net|supabase_vault|pgsodium)"?[^;]*;/gi,
    ''
  );

const sqlDelRepo = () => [
  ...(existsSync(new URL('schema.sql', DIR)) ? [leer('schema.sql')] : []),
  ...readdirSync(new URL('migrations/', DIR))
    .sort()
    .map((f) => leer(`migrations/${f}`))
];

// Lo que Supabase trae de fabrica, simulado. Si una migracion usa algo que no
// esta aca, el test falla con el nombre de lo que falta: se agrega aca.
const STUBS_SUPABASE = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}',
    created_at timestamptz default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create publication supabase_realtime;
  create schema vault;
  create table vault.decrypted_secrets (name text, decrypted_secret text);
  create schema cron;
  create function cron.schedule(nombre text, horario text, comando text) returns bigint
    language sql as $$ select 1::bigint $$;
  create schema net;
  create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int)
    returns bigint language sql as $$ select 1::bigint $$;
`;

describe('orden de carga', () => {
  it('pone cada tabla despues de las que apunta', () => {
    const deps = dependencias([
      `create table pagos (id int, socio_id int references socios(id));
       create table socios (id int primary key, plan_id int);
       alter table socios add constraint fk foreign key (plan_id) references public.planes(id);
       create table planes (id int primary key);`
    ]);
    expect(ordenDeCarga(['pagos', 'planes', 'socios'], deps)).toEqual([
      'planes',
      'socios',
      'pagos'
    ]);
  });

  it('ignora auth, storage, comentarios y referencias a si misma', () => {
    const deps = dependencias([
      `-- create table fantasma (x int references socios(id));
       create table perfiles (id uuid references auth.users(id), jefe uuid references perfiles(id));`
    ]);
    expect([...deps.perfiles]).toEqual([]);
    expect(deps.fantasma).toBeUndefined();
  });

  it('avisa si hay un ciclo en vez de inventar un orden', () => {
    const deps = { a: new Set(['b']), b: new Set(['a']) };
    expect(() => ordenDeCarga(['a', 'b'], deps)).toThrow(/circulares entre: a, b/);
  });
});

describe('contra el esquema real', () => {
  let db;
  let orden;
  const filas = async (sql) => (await db.query(sql)).rows;

  beforeAll(async () => {
    db = new PGlite({ extensions: { citext, pg_trgm, pgcrypto, uuid_ossp } });
    await db.exec(STUBS_SUPABASE);
    for (const sql of sqlDelRepo()) await db.exec(sinExtensionesDelServidor(sql));
    const tablas = (await filas(`select tablename from pg_tables where schemaname = 'public'`)).map(
      (f) => f.tablename
    );
    orden = ordenDeCarga(tablas, dependencias(sqlDelRepo()));
  });

  it('el orden respeta todas las claves foraneas que tiene la base', async () => {
    const fks = await filas(`
      select c.conrelid::regclass::text as desde, c.confrelid::regclass::text as hacia
      from pg_constraint c
      join pg_namespace n on n.oid = c.connamespace
      where c.contype = 'f' and n.nspname = 'public'
        and c.confrelid::regclass::text not like '%.%'
        and c.conrelid <> c.confrelid`);
    for (const { desde, hacia } of fks) {
      expect(orden.indexOf(hacia), `${hacia} antes que ${desde}`).toBeLessThan(
        orden.indexOf(desde)
      );
    }
  });

  it('preparar.sql vacia todo y apaga los triggers; terminar.sql los enciende', async () => {
    // Si las migraciones dejan contenido de ejemplo, esa es la razon de
    // preparar.sql; si no dejan nada, igual se prueba el vaciado y el orden.
    // Lo que habia, como si fuera una copia: se carga de vuelta en el orden.
    const copia = {};
    for (const t of orden) copia[t] = await filas(`select * from ${t}`);
    const total = Object.values(copia).reduce((s, f) => s + f.length, 0);

    await db.exec(leer('restauracion/preparar.sql'));
    for (const t of orden) {
      expect((await filas(`select count(*)::int as n from ${t}`))[0].n, t).toBe(0);
    }
    const encendidos = `
      select count(*)::int as n from pg_trigger tg
      join pg_class c on c.oid = tg.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and not tg.tgisinternal and tg.tgenabled <> 'D'`;
    expect((await filas(encendidos))[0].n).toBe(0);

    for (const t of orden) {
      if (!copia[t].length) continue;
      await db.query(
        `insert into ${t} select * from json_populate_recordset(null::${t}, $1::json)`,
        [JSON.stringify(copia[t])]
      );
    }
    let cargadas = 0;
    for (const t of orden) cargadas += (await filas(`select count(*)::int as n from ${t}`))[0].n;
    expect(cargadas).toBe(total);

    await db.exec(leer('restauracion/terminar.sql'));
    const apagados = encendidos.replace("tg.tgenabled <> 'D'", "tg.tgenabled = 'D'");
    expect((await filas(apagados))[0].n).toBe(0);
  });
});
