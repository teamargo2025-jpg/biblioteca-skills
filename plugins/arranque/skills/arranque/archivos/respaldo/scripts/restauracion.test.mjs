// @vitest-environment node
//
// Lo que la restauracion da por cierto, probado contra el esquema real del
// repo en PGlite: que el orden de carga respeta cada referencia entre
// tablas, que preparar.sql deja todo vacio y con los triggers apagados, y que
// con eso una copia completa se vuelve a cargar sin errores.

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { beforeAll, describe, expect, it } from 'vitest';
import { dependencias, ordenDeCarga } from './orden-de-carga.mjs';
import { nombresSqlDelRepo, sqlDelRepo as leerSqlDelRepo } from './sql-del-repo.mjs';

const DIR = new URL('../supabase/', import.meta.url);
const leer = (ruta) => readFileSync(new URL(ruta, DIR), 'utf8');
// Las extensiones que PGlite no trae (programar tareas, llamar a internet,
// la boveda de secretos) se simulan abajo; su create extension se saca.
const sinExtensionesDelServidor = (sql) =>
  sql.replace(
    /create\s+extension\s+(?:if\s+not\s+exists\s+)?"?(pg_cron|pg_net|supabase_vault|pgsodium)"?[^;]*;/gi,
    ''
  );

// El mismo orden que usa la restauracion (schema + migraciones, o el orden
// explicito de supabase/restauracion/orden.txt).
const sqlDelRepo = () => leerSqlDelRepo(fileURLToPath(DIR)).map((s) => s.sql);

// Lo que Supabase trae de fabrica, simulado. Si una migracion usa algo que no
// esta aca, el test falla con el nombre de lo que falta: se agrega aca.
const STUBS_SUPABASE = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  -- Las columnas de auth.users que las migraciones suelen leer.
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    phone text,
    encrypted_password text,
    email_confirmed_at timestamptz,
    last_sign_in_at timestamptz,
    raw_user_meta_data jsonb default '{}',
    raw_app_meta_data jsonb default '{}',
    is_anonymous boolean default false,
    banned_until timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    deleted_at timestamptz
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create function auth.role() returns text language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
  $$;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create publication supabase_realtime;
  create schema vault;
  create table vault.decrypted_secrets (name text, decrypted_secret text);
  create schema cron;
  create table cron.job (jobid bigserial primary key, jobname text, schedule text, command text);
  create function cron.schedule(nombre text, horario text, comando text) returns bigint
    language sql as $$ select 1::bigint $$;
  create function cron.schedule(horario text, comando text) returns bigint
    language sql as $$ select 1::bigint $$;
  create function cron.unschedule(nombre text) returns boolean
    language sql as $$ select true $$;
  create function cron.unschedule(id bigint) returns boolean
    language sql as $$ select true $$;
  create schema net;
  create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int)
    returns bigint language sql as $$ select 1::bigint $$;
  create function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds int)
    returns bigint language sql as $$ select 1::bigint $$;
  create function net.http_get(url text) returns bigint
    language sql as $$ select 1::bigint $$;
`;

describe('que SQL arman la base', () => {
  const carpeta = (archivos) => {
    const raiz = mkdtempSync(join(tmpdir(), 'sql-'));
    for (const [ruta, texto] of Object.entries(archivos)) {
      mkdirSync(join(raiz, dirname(ruta)), { recursive: true });
      writeFileSync(join(raiz, ruta), texto);
    }
    return raiz;
  };

  it('con migrations/: schema.sql primero y las migraciones en orden', () => {
    const raiz = carpeta({
      'schema.sql': '',
      'migrations/002_b.sql': '',
      'migrations/001_a.sql': ''
    });
    expect(nombresSqlDelRepo(raiz)).toEqual([
      'schema.sql',
      'migrations/001_a.sql',
      'migrations/002_b.sql'
    ]);
  });

  it('sin migrations/: los .sql de la carpeta en orden', () => {
    const raiz = carpeta({ '002_b.sql': '', '001_a.sql': '', 'notas.txt': '' });
    expect(nombresSqlDelRepo(raiz)).toEqual(['001_a.sql', '002_b.sql']);
  });

  it('con orden.txt manda el orden escrito y deja afuera lo que no es migracion', () => {
    const raiz = carpeta({
      '000_revisar.sql': '',
      '001_a.sql': '',
      '011_deshacer.sql': '',
      '011_seguridad.sql': '',
      'restauracion/orden.txt': '# sin revisar ni deshacer\n001_a.sql\n\n011_seguridad.sql\n'
    });
    expect(nombresSqlDelRepo(raiz)).toEqual(['001_a.sql', '011_seguridad.sql']);
  });

  it('avisa si orden.txt nombra un archivo que no existe', () => {
    const raiz = carpeta({ 'restauracion/orden.txt': '001_falta.sql\n' });
    expect(() => leerSqlDelRepo(raiz)).toThrow(/No existe/);
  });
});

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

// El caso de ESCALA: una columna "generated always as identity" no deja
// cargar los ids originales, y sin adelantar el contador el primer registro
// nuevo choca con uno restaurado.
describe('ids generados por la base', () => {
  it('se cargan con su id original y despues los nuevos siguen la cuenta', async () => {
    const db = new PGlite();
    await db.exec(`
      create table bitacora (id bigint generated always as identity primary key, que text);
      create table notas (id bigserial primary key, texto text);
      insert into bitacora (que) values ('a'), ('b'), ('c');
      insert into notas (texto) values ('x'), ('y');
    `);
    const copia = {
      bitacora: (await db.query('select * from bitacora')).rows,
      notas: (await db.query('select * from notas')).rows
    };

    await db.exec(leer('restauracion/preparar.sql'));
    for (const [t, filas] of Object.entries(copia)) {
      await db.query(
        `insert into ${t} select * from json_populate_recordset(null::${t}, $1::json)`,
        [JSON.stringify(filas)]
      );
    }
    await db.exec(leer('restauracion/terminar.sql'));

    const nueva = await db.query(`insert into bitacora (que) values ('d') returning id`);
    expect(Number(nueva.rows[0].id)).toBe(4);
    const nota = await db.query(`insert into notas (texto) values ('z') returning id`);
    expect(Number(nota.rows[0].id)).toBe(3);
    // Y la columna vuelve a no dejar escribir su id a mano.
    await expect(db.exec(`insert into bitacora (id, que) values (99, 'e')`)).rejects.toThrow(
      /GENERATED ALWAYS|non-DEFAULT/i
    );
    // Sin restos del proceso.
    const restos = await db.query(
      `select count(*)::int as n from pg_namespace where nspname = 'restauracion'`
    );
    expect(restos.rows[0].n).toBe(0);
  });
});
