# Restaurar el backup

Cómo volver a levantar los datos de <PROYECTO> a partir de la copia diaria
que genera `.github/workflows/backup.yml`. Sirve para dos casos:

- **Simulacro:** restaurar en un proyecto de prueba para comprobar que la
  copia sirve. Una copia que nunca se restauró no está comprobada.
- **Desastre:** la base de producción se perdió o se dañó y hay que
  reconstruirla en un proyecto nuevo.

## Qué cubre la copia y qué no

| Qué | ¿En la copia? | Dónde está si no |
|---|---|---|
| Todas las tablas del esquema `public` | ✅ Dentro de la copia cifrada | — |
| Cuentas (id, correo, metadatos) | ✅ Dentro de la copia cifrada, sin contraseñas | Cada persona pone una nueva (paso 7) |
| Archivos de Storage | ✅ Dentro de la copia cifrada | — |
| Estructura: tablas, funciones, políticas RLS | ✅ Versionada en `supabase/` | — |

## 1. Proyecto de destino

Crear un proyecto en Supabase. Para un simulacro, uno de prueba (por ejemplo
`<proyecto>-prueba`) en una cuenta que tenga cupo gratis: si el cliente ya es
dueño de su organización, lo mejor es crearlo con su propia cuenta, en una
organización aparte, para que sus datos no salgan de sus cuentas. **Nunca**
se restaura sobre producción.

## 2. Estructura

En el SQL Editor del proyecto de destino, correr cada archivo completo y en
este orden:

1. `supabase/schema.sql`, si existe.
2. Todas las migraciones de `supabase/migrations/`, en orden de número (es el
   mismo orden que usan los tests).
3. `supabase/restauracion/preparar.sql`.

Para no pegar uno por uno, se pueden juntar en un solo archivo (fuera del
repo) y pegarlo de una vez.

**Por qué el paso 3:** si las migraciones cargan contenido de ejemplo,
chocaría con el de la copia; y los triggers del uso diario (topes, totales
que se recalculan) no deben correr al cargar el historial. `preparar.sql`
vacía todas las tablas y apaga esos triggers.

## 3. Bajar la copia

1. GitHub → <repo> → pestaña **Actions** → **Copia de seguridad de la base**.
2. Abrir la corrida más reciente en verde.
3. Abajo, en **Artifacts**, descargar `copia-cifrada-<número>` (o con
   `gh run download <id> -n copia-cifrada-<id> -D copia`).
4. Debe quedar `copia/copia.cifrada` y `copia/_resumen.json` en la carpeta
   del proyecto. `copia/` no se sube a GitHub.

La copia se descifra solo en memoria al restaurar: nunca queda en claro en el
disco. Las copias se guardan 90 días.

## 4. Cargar y verificar

1. Copiar `.env.restauracion.example` como `.env.restauracion` (no se sube a
   GitHub) y completar `DESTINO_URL`, `DESTINO_SERVICE_KEY` (la de servicio
   del proyecto de **destino**) y `BACKUP_CLAVE` (la del gestor de
   contraseñas). **Sin `BACKUP_CLAVE` la copia no se puede abrir.**
2. Correr:

   ```bash
   node scripts/restaurar-datos.mjs
   ```

El script:

- Se niega a escribir en producción y en un destino que ya tenga cuentas,
  filas o archivos.
- Salta, con aviso, las tablas vacías que existen en la base pero no en el
  repo; si una de esas tiene filas, se detiene y explica qué hacer.
- Crea las cuentas **con su id original** y una contraseña al azar que nadie
  conoce.
- Carga las tablas en el orden que deducen sus referencias
  (`scripts/orden-de-carga.mjs`), sube los archivos de Storage y reescribe
  las URLs de las imágenes al proyecto nuevo.
- Compara cuenta por cuenta, fila por fila y archivo por archivo (huella
  SHA-256). Si algo no coincide, dice la tabla, el id y el campo, **nunca el
  valor**.

Solo cuenta como restaurada si termina en **"Restauración verificada: el
destino es idéntico a la copia"**.

## 5. Encender los triggers

Correr `supabase/restauracion/terminar.sql` en el SQL Editor del destino.

## 6. En un simulacro, borrar el proyecto de prueba

Tiene una copia de datos reales: se borra el mismo día, se vacía
`.env.restauracion` y se borra la carpeta `copia/`. Anotar el resultado en el
historial de abajo.

## 7. Solo en un desastre real

- Cada persona entra con "Olvidé mi contraseña" (o el dueño le pone una desde
  Authentication → Users).
- Actualizar los secretos de GitHub y de la publicación con la URL y las
  llaves nuevas, y el `.env` local.
- Revisar en el panel nuevo: Site URL, Redirect URLs, registro público y SMTP.

## Historial de simulacros

| Fecha | Copia usada | Resultado |
|---|---|---|
| | | |
