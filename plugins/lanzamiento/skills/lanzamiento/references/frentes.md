# Los siete frentes, en detalle

Para cada uno: qué mirar, cómo, y qué cuenta como problema. Los comandos se
corren desde la carpeta del proyecto (bash). Lo que diga "Supabase" vale para
cualquier backend con la misma idea (una clave pública en el navegador y
reglas en la base).

## 1. Qué ve alguien sin sesión

La clave pública (anon / publishable) está dentro del JavaScript del sitio:
cualquiera la tiene. La única protección real son las reglas de la base.

- `node <skill>/scripts/acceso-anonimo.mjs` — prueba cada tabla con la clave
  pública, entera y columna por columna. Solo lee.
- Por cada tabla **LEGIBLE**, preguntarse si el dueño la publicaría en un
  cartel. Una carta de restaurante, sí. Socios, clientes, pedidos, medidas,
  movimientos de caja: no.
- **Permisos por columna** (`grant select (id, nombre) on tabla to anon`):
  la tabla "parece" cerrada con `select *` pero esas columnas se listan. El
  script lo detecta; a mano, buscar `grant select (` en el SQL.
- **"Hay que conocer el link"** solo protege si nada deja **listar** los
  ids. Si cualquier tabla legible trae `socio_id` o `cliente_id`, el link ya
  no es secreto.
- Buscar en el SQL `using (true)` y `with check (true)`: cada uno es una
  puerta abierta, a propósito o no. Y cada función `security definer`
  expuesta a `anon`: qué recibe, qué devuelve, qué deja hacer.
- **Escrituras:** que nadie pueda tocar filas ajenas, ni muchas de una vez
  (un `delete` sin filtro que la regla deja pasar).

## 2. Secretos

```bash
# En los archivos que se suben
git grep -nIiE "service_role|sb_secret_|eyJhbGciOi[A-Za-z0-9_-]{20,}\.|private[_-]?key|BEGIN [A-Z ]*PRIVATE KEY" -- . ':!package-lock.json'
# En todo el historial, ramas incluidas
git log -p --all | grep -iE "^\+.*(sb_secret_|service_role.{0,4}[:=] *['\"]?ey|BEGIN [A-Z ]*PRIVATE KEY)"
# Archivos de variables que se subieron alguna vez
git log --all --oneline -- .env .env.local .env.production
```

- Las coincidencias hay que leerlas: el primer comando también encuentra
  nombres de variables (`privateKey`) y documentación ("la `service_role`
  va en..."). Es una clave filtrada solo si aparece el **valor**.
- Un `.env` subido con solo la URL y la clave **pública** no es problema
  (pasa en ESCALA con `.env.prueba`). Cualquier otra clave sí: se rota (se
  genera una nueva en el panel) **y** se considera filtrada, aunque se borre
  del historial.
- La clave de servicio solo vive en secretos de GitHub Actions o de las
  Edge Functions. Nunca con prefijo `VITE_`: Vite mete en el navegador todo
  lo que empieza así.

## 3. Dinero

- **El total lo calcula la base.** Si el navegador manda `total` al crear un
  pedido, alguien puede mandar 1 sol. Arreglo: un trigger que recalcula el
  total desde los precios de la tabla (Saviare: `pedidos_total_confiable`).
- **El stock se descuenta en la base, en una transacción** (`for update`),
  no con un `update` desde el navegador: dos ventas a la vez se pisan.
- **Nada cobra desde el navegador con una clave secreta.**
- **Pagos:** probarlos con las claves de prueba del proveedor, nunca con
  dinero real en producción. Si el pago es manual (Yape con comprobante),
  revisar quién puede marcar un pedido como pagado.
- **Precios que se muestran = precios que se cobran** (en Perú, Ley 29571:
  el precio anunciado es el final). Un envío "referencial" que el sistema
  cobra fijo es un problema.

## 4. Datos personales

En Perú rige la Ley 29733 de protección de datos personales. Datos de salud
son "sensibles": más cuidado todavía.

- Hacer la lista: qué datos de personas se guardan, en qué tabla, quién los
  ve (frente 1) y adónde se copian (respaldos, exportaciones, analítica).
- Política de privacidad visible, con quién es el responsable y un contacto.
- Que la persona pueda pedir o hacer el borrado de sus datos.
- Un conjunto organizado de datos de personas (clientes con DNI, socios) es
  un "banco de datos personales" y puede tener que inscribirse ante la
  Autoridad Nacional de Protección de Datos Personales. No es técnico:
  decirlo en el informe y que lo vea el dueño, sin afirmar si aplica.
- **Respaldos con datos personales:** si el repo es público, cifrados sí o
  sí (un artifact de Actions se puede descargar). Si es privado y hay datos
  sensibles, cifrados también. Plantilla: `scripts/cifrado-copia.mjs` y
  `backup.yml` de Saviare (AES-256-GCM con una clave en un secreto).

## 5. Respaldo

- Supabase gratis no tiene vuelta atrás en el tiempo: un `delete` sin
  `where` es definitivo sin una copia propia.
- Que el workflow exista **y haya corrido** (Actions → el workflow → la
  última ejecución en verde, con su artifact).
- Que se haya **restaurado una vez** en un proyecto aparte, siguiendo un
  documento escrito (Saviare: `docs/restaurar-backup.md`). Ahí aparecen
  siempre sorpresas: el orden real de las migraciones, triggers que hay que
  apagar durante la carga, archivos de Storage que no estaban en la copia.
- Supabase gratis **pausa el proyecto tras 7 días sin uso**. Si la app se
  usa por temporadas (una capacitación cada dos semanas), alguien tiene que
  entrar al panel antes, o la app no carga.

## 6. Cómo te enteras de un error

- Lo mínimo: un manejador global (`window.onerror` y
  `unhandledrejection`) que le muestre a la persona "algo falló, recarga" en
  vez de una pantalla a medias (Volka: `src/js/error-global.js`).
- Para enterarte tú: un servicio de errores. Sentry tiene un plan gratis
  (en octubre de 2026: 5.000 errores al mes, un usuario, 30 días de
  historial); **verificar sus condiciones de uso** antes de usarlo en un
  proyecto comercial. La alternativa sin servicio externo es guardar los
  errores en una tabla, pero entonces esa tabla acepta escrituras anónimas:
  limitar el tamaño y no guardar datos de la persona.
- Si no hay nada de eso, decirlo en el informe como "Antes de una semana" y
  acordar al menos un canal ("si algo falla, me escriben a este número").

## 7. Publicación

- **Lo que corre en producción es lo que prueban los tests.** Los tests
  corren TODAS las migraciones del repo; producción solo tiene las que
  alguien pegó en el SQL Editor. Por cada migración, comprobar que algo
  suyo exista en la base real: una tabla nueva (pedirla con la clave
  pública: "no existe" es `PGRST205`), una función (`rpc` con un id
  inventado), una Edge Function (`/functions/v1/<nombre>` responde algo
  distinto de 404). En Gonthia faltaba la 0005: los tests garantizaban
  permisos y avisos que producción no tenía. Lo mismo con los secretos que
  piden los workflows y las funciones: un workflow que nunca corrió en verde
  no protege nada.
- Hosting que permita el uso: comercial → Cloudflare Pages (ver
  `arranque/references/hosting.md`).
- Deploy automático al mezclar, con tests antes. Nada de `npm run deploy`
  desde una PC: deja producción por delante de GitHub (Amira).
- **Lo que la gente guarda no puede depender de una dirección provisoria:**
  QR impresos en mesas, carnets, apps instaladas. Si el dominio propio está
  por venir, decidirlo antes de imprimir.
- PWA: que el manifiesto y los íconos existan de verdad (Chincha pedía
  íconos que no estaban en `public/`).
- Probar en el celular de una persona real, no solo en la computadora.
- Si es un sitio público que tiene que aparecer en Google, pasar después
  por seo-audit.
