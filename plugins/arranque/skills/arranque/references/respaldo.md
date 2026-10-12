# Respaldo cifrado y restauración

Para todo proyecto con Supabase. Sale de Saviare y Amira (octubre de 2026),
donde se armó a mano dos veces y cada vez apareció una sorpresa distinta: las
cuentas de las que dependen los perfiles, 27 tablas que se apuntan entre sí,
contenido de ejemplo que cargan las migraciones, tablas de una plantilla vieja
que el repo no conocía. Los archivos de `archivos/respaldo/` ya resuelven
todo eso, probados contra los esquemas de Amira, Gonthia y Chincha.

**Por qué en `arranque` y no recién al lanzar:** el plan gratuito de Supabase
no tiene vuelta atrás en el tiempo. Un `delete` sin `where` en el primer mes
es definitivo. Y armarlo con datos de prueba es cuando sale barato: el
simulacro de la puerta de `lanzamiento` pasa a ser correr dos comandos.

## Qué se copia

| De `archivos/respaldo/` | Para qué |
|---|---|
| `.github/workflows/backup.yml` | Copia diaria a las 4 a. m. de Perú; una segunda barrera frena la subida si queda un archivo sin cifrar |
| `scripts/backup-datos.mjs` | Baja todas las tablas (las del repo y las que solo existen en la base), las cuentas y Storage, y lo cifra |
| `scripts/cifrado-copia.mjs` | AES-256-GCM con la clave `BACKUP_CLAVE`; detecta si el archivo fue alterado |
| `scripts/archivos-storage.mjs` | Reescribe las URLs de las imágenes al proyecto nuevo; huella de cada archivo |
| `scripts/orden-de-carga.mjs` | Deduce del SQL en qué orden se cargan las tablas |
| `scripts/restaurar-datos.mjs` | Restaura en un proyecto vacío y verifica todo sin imprimir valores |
| `scripts/*.test.mjs` | Cifrado, Storage y, en PGlite, el orden de carga contra el esquema real y la recarga completa |
| `supabase/restauracion/preparar.sql`, `terminar.sql` | Vaciar el contenido de ejemplo y apagar o encender los triggers |
| `.env.restauracion.example` | Las variables para restaurar (el `.env.restauracion` real nunca se sube) |
| `docs/restaurar-backup.md` | La guía del simulacro: reemplazar `<PROYECTO>` y `<repo>` |

## Cómo se aplica

1. Copiar los archivos respetando las rutas. Si el proyecto ya tiene un
   `backup-datos.mjs` o un `backup.yml`, comparar antes de pisar: puede tener
   algo propio.
2. **Prettier y el estilo:** los archivos usan comillas simples, punto y coma
   y 100 columnas. Si el proyecto usa otro estilo, `npm run format` los
   acomoda en el mismo commit.
3. **Tests:** `npm install --save-dev @electric-sql/pglite` si no está, y que
   el `include` de Vitest alcance `scripts/**/*.test.mjs`. Los tests de
   `scripts/` llevan `// @vitest-environment node`.
4. **`.gitignore`:** agregar `copia/` y `.env.restauracion`.
5. **Lo que supone la restauración:** que `supabase/schema.sql` (si existe)
   más **todas** las migraciones en orden arman la base, igual que en los
   tests. Si no es así (Saviare: `schema.sql` ya incluía las primeras
   migraciones y correrlas encima choca), arreglarlo antes, o escribir el
   orden real en `docs/restaurar-backup.md`. El test `restauracion.test.mjs`
   lo detecta: falla si ese camino no arma la base.
6. **Extensiones:** el test simula `pg_cron`, `pg_net` y la bóveda, y carga
   `pgcrypto`, `pg_trgm`, `uuid-ossp` y `citext`. Si una migración usa otra,
   el test falla con su nombre: se agrega al test.

## Lo que hace el desarrollador o el cliente (no Claude)

- **Crear `BACKUP_CLAVE`:** generarla en Bitwarden (40 caracteres, sin
  símbolos), guardarla ahí **primero** y después cargarla como secreto del
  repo. GitHub no deja volver a ver un secreto: Bitwarden es la única copia
  legible.
- Cargar `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` como secretos del repo.
- **Correr el workflow a mano** desde Actions la primera vez y comprobar que
  el artifact sea `copia-cifrada-<id>` con solo dos archivos.

## La puerta

El respaldo está listo cuando:

- [ ] La corrida diaria sale en verde y su artifact trae solo
      `copia.cifrada` y `_resumen.json`.
- [ ] El resumen trae las tablas y las cuentas que se esperan.
- [ ] Se restauró una vez en un proyecto aparte, terminó en "Restauración
      verificada", y se anotó en el historial de `docs/restaurar-backup.md`.
- [ ] El proyecto de prueba se borró el mismo día.
- [ ] No quedan artifacts viejos sin cifrar en el repo.
