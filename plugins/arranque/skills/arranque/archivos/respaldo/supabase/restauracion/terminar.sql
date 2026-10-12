-- Volver a encender los triggers despues de restaurar una copia.
--
-- Se corre en el SQL Editor del proyecto de DESTINO cuando
-- scripts/restaurar-datos.mjs termino con "Restauracion verificada". Sin esto
-- quedan apagados los topes y la proteccion del administrador.

do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable trigger user', t);
  end loop;
end
$$;
