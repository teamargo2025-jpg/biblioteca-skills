-- Dejar la base lista para el uso diario despues de restaurar una copia.
--
-- Se corre en el SQL Editor del proyecto de DESTINO cuando
-- scripts/restaurar-datos.mjs termino con "Restauracion verificada".
--
--   1. Vuelve a encender los triggers (topes, totales, proteccion del admin).
--   2. Devuelve a "generated always" las columnas que preparar.sql abrio.
--   3. Adelanta cada contador de ids (identity y serial) al mayor id cargado.
--      Sin esto, el primer registro nuevo intentaria usar un id que ya existe
--      y la app fallaria al guardar.

do $$
declare
  t text;
  c record;
  secuencia text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable trigger user', t);
  end loop;

  if to_regclass('restauracion.identidades_always') is not null then
    for c in select tabla, columna from restauracion.identidades_always loop
      execute format('alter table public.%I alter column %I set generated always', c.tabla, c.columna);
    end loop;
  end if;

  for c in
    select table_name, column_name from information_schema.columns
    where table_schema = 'public'
  loop
    secuencia := pg_get_serial_sequence(format('public.%I', c.table_name), c.column_name);
    if secuencia is not null then
      execute format(
        'select setval(%L, coalesce((select max(%I) from public.%I), 0) + 1, false)',
        secuencia, c.column_name, c.table_name
      );
    end if;
  end loop;
end
$$;

drop schema if exists restauracion cascade;
