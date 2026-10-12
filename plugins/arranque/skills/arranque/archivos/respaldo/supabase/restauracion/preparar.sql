-- Preparar un proyecto NUEVO para recibir una copia de seguridad.
--
-- Se corre en el SQL Editor del proyecto de DESTINO, despues de schema.sql y
-- todas las migraciones, y antes de scripts/restaurar-datos.mjs. Nunca en
-- produccion: borra todas las filas de todas las tablas.
--
-- Por que hace falta:
--   1. Las migraciones suelen cargar contenido de ejemplo (categorias,
--      planes, productos). La copia trae el contenido real del cliente con
--      sus propios ids: hay que empezar de cero o se mezclan.
--   2. Los triggers que ponen topes, recalculan totales o cuidan al
--      administrador estan pensados para el uso diario, no para cargar el
--      historial completo de una vez. Se apagan durante la carga y
--      supabase/restauracion/terminar.sql los vuelve a encender.

do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('truncate table public.%I cascade', t);
    execute format('alter table public.%I disable trigger user', t);
  end loop;
end
$$;
