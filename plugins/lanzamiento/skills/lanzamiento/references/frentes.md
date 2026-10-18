# Los siete frentes, en detalle

Para cada uno: qué mirar, cómo, y qué cuenta como problema. Los comandos se
corren desde la carpeta del proyecto (bash). Lo que diga "Supabase" vale para
cualquier backend con la misma idea (una clave pública en el navegador y
reglas en la base).

## 1. Qué ve alguien sin sesión

La clave pública (anon / publishable) está dentro del JavaScript del sitio:
cualquiera la tiene. La única protección real son las reglas de la base.

- `node <skill>/scripts/acceso-anonimo.mjs [--tablas a,b]` hace lo que haría
  un curioso con la clave pública:
  - mira si el **registro de cuentas** está abierto;
  - **lee** cada tabla, entera y columna por columna;
  - intenta **escribir** una fila imposible (la clave primaria en null, ids
    inventados en las columnas `*_id`): la base la rechaza siempre, pero el
    código del rechazo dice si la seguridad la dejó pasar (`42501` =
    cerrada; `23502`, `23503` o `23514` = abierta);
  - **lista** los archivos de cada bucket de Storage.

  No escribe nada, no borra, no sube archivos y no imprime valores.
- **Las tablas que el repo no conoce no se prueban solas:** con la clave
  pública no se pueden listar. Correr antes la **radiografía** de abajo en el
  SQL Editor (o mirar el aviso "Ojo: estas tablas existen en la base pero no
  en el esquema del repo" del backup) y pasarlas con `--tablas`. En Amira
  había tres tablas y dos buckets de una plantilla vieja que el script no
  veía.
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
  (un `delete` sin filtro que la regla deja pasar). Cada tabla
  **ESCRIBIBLE** sin sesión necesita una razón (el portal de un socio que
  entra con su link) y un tope; si no, se pasa a una función que valide
  (como `socio_*` en Amira).
- **Registro abierto:** si las cuentas las crea el dueño o el desarrollador,
  el registro público se cierra (Authentication → Sign In / Providers →
  *Allow new users to sign up*). Crear cuentas desde una función con la
  clave de servicio sigue funcionando.

### Radiografía desde adentro

Para correr en el SQL Editor del proyecto. Solo lee la estructura, nunca
filas de personas, así que el resultado se puede pegar en el informe.

```sql
-- 1. Todas las tablas, si tienen RLS y cuántas políticas
select c.relname as tabla, c.relrowsecurity as rls, count(p.policyname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = 'public' and p.tablename = c.relname
where n.nspname = 'public' and c.relkind = 'r'
group by 1, 2 order by 1;

-- 2. Políticas que dejan escribir a anon o a todos (leer qual y with_check)
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname in ('public', 'storage') and cmd <> 'SELECT'
  and (roles::text like '%anon%' or roles::text like '%public%');

-- 3. Funciones security definer que anon puede ejecutar
select p.proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and has_function_privilege('anon', p.oid, 'execute')
order by 1;

-- 4. Buckets de Storage
select id, public from storage.buckets order by 1;
```

- Una tabla con `rls = false` está abierta del todo: **Bloquea** si tiene
  algo que no sea público.
- Una tabla que no está en el repo: o se agrega con una migración, o se
  borra. Si queda, se prueba con `--tablas`.
- El panel de Supabase tiene además **Advisors → Security**, que avisa de
  tablas sin RLS y funciones sin `search_path` fijo. Mirarlo también.

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
  `backup.yml` de Saviare o de Amira (AES-256-GCM con una clave en un
  secreto, y un paso del workflow que frena la subida si queda un archivo
  en claro).
- **Credenciales reales en la PC del desarrollador:** contraseñas de cuentas
  del cliente o claves de otros sistemas en un `.env` local van a un gestor
  (Bitwarden) y se borran del archivo. Si el `.env` tiene algo más que la
  URL y la clave pública, preguntar por qué.

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
- **Disponibilidad medida, no supuesta:** un monitor externo gratuito (por
  ejemplo UptimeRobot) que abra la app cada pocos minutos y avise si no
  responde. Con un año de registro se tiene el porcentaje real de ESA app, que
  es lo que se le puede mostrar a un cliente. Los proveedores no publican un
  porcentaje anual confiable de sus planes gratuitos, y los sitios que los
  rastrean se contradicen (revisado en octubre de 2026).
- Si no hay nada de eso, decirlo en el informe como "Antes de una semana" y
  acordar al menos un canal ("si algo falla, me escriben a este número").
- **Que alguien se entere si el respaldo falla.** GitHub avisa por correo
  cuando un workflow sale en rojo, pero solo a quien lo disparó o tiene las
  notificaciones activas. Comprobar quién recibe ese aviso. En Gonthia, el
  respaldo falló cinco días sin que nadie lo viera.

### Quién hizo qué

En lo delicado (caja, borrados, cambios de permisos o de precios) tiene que
quedar registrado **quién y cuándo**, para poder responder "¿quién borró este
pago?".

- Mirar en el esquema si las tablas de dinero tienen `registrado_por` y
  `created_at`, y si los **borrados y los cambios** también se registran (una
  tabla de historial o un trigger). Registrar solo quién crea no alcanza.
- Sin registro de borrados en la caja: "Antes de una semana". En lo demás:
  "Mejora".

### Si pasa algo: el plan de incidentes

Antes de lanzar, el dueño tiene que saber **qué pasa si algo sale mal**:
quién le avisa, en cuánto tiempo y qué se hace. El plan común está en
`conocimiento/guias/plan-de-incidentes.md`.

- Comprobar que el cliente tenga el contacto de soporte y sepa qué contar.
- Si el sistema guarda datos personales, recordar que una filtración puede
  obligar a avisar a las personas afectadas y a la Autoridad Nacional de
  Protección de Datos Personales (Ley 29733). Decirlo, sin afirmar plazos: lo
  confirma el dueño con un abogado.

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
- **Dónde viven las cuentas:** antes de los datos reales, la base de datos,
  la publicación y el dominio se mudan del entorno de desarrollo a la casa
  del proyecto (un correo propio). Cuentas en un correo institucional o
  personal del desarrollador son "Antes de una semana"; mudar después de
  imprimir QR o repartir links cambia la dirección. Cómo:
  `arranque/references/cuentas.md`.
- **Lo que vive en el panel, fuera del repo.** Ningún test lo cubre y nadie
  lo ve en un PR, así que se revisa a mano antes de entregar:

  | Qué | Dónde | Qué tiene que decir |
  |---|---|---|
  | Site URL | Authentication → URL Configuration | La dirección real de la app |
  | Redirect URLs | Mismo lugar | `https://<la-app>/**`, para que el link de recuperación vuelva a la app |
  | Registro público | Authentication → Sign In / Providers | Cerrado, salvo que la app sea de registro libre |
  | Correo (SMTP) | Authentication → Emails → SMTP | Un SMTP propio si la app manda correos (recuperar contraseña, confirmar cuenta): **el SMTP por defecto de Supabase solo envía a los miembros de la organización**, así que al cliente y a su equipo no les llega nada |
  | Roles en la organización | Organization → Team | El correo del proyecto como Owner; el desarrollador como Developer (`arranque/references/cuentas.md`) |
  | Largo mínimo de contraseña | Authentication → Providers → Email (o *Auth → Policies*, según la versión del panel) | **8 o más**. Con menos: "Antes de una semana" |
  | Límite de intentos | Authentication → Rate Limits | Que exista un límite de inicios de sesión y de correos por hora; no subirlo "para probar" y olvidarlo |
  | 2FA en las cuentas del panel | Foto de perfil → Account preferences → Security, de cada cuenta Owner | El correo del proyecto con 2FA, con el Authenticator del dueño |

- **Cabeceras de seguridad, en el sitio publicado:**

  ```bash
  node <skill>/scripts/cabeceras-en-linea.mjs https://<la-app>/
  ```

  Revisa CSP, protección contra marcos invisibles, HTTPS obligatorio,
  `nosniff`, Referrer-Policy y Permissions-Policy. Después, la nota en
  https://developer.mozilla.org/en-US/observatory: B o más. Si faltan:
  "Antes de una semana"; el arreglo es el `public/_headers` de `arranque`,
  ajustado al proyecto (cámara, videos, APIs).
- **2FA del admin dentro de la app** (Supabase Auth soporta TOTP): en un
  sistema con datos de salud o con caja, el admin debería poder activarlo.
  Hoy es "Mejora"; anotarlo para el producto.

- **Las llaves de la app son del cliente.** El dueño tiene que poder:
  - **cambiar su contraseña** desde la app;
  - **recuperarla** sin pedírsela a nadie.

  Si la puso el desarrollador y no hay forma de cambiarla, el desarrollador
  la conoce para siempre: **Bloquea** la entrega. El admin del sistema es el
  dueño, **con su propio correo**. Una cuenta admin con el correo
  institucional o personal de alguien del equipo se reemplaza el día de la
  entrega, primero creando la del dueño y recién después quitando la otra,
  porque siempre tiene que quedar un admin.
- **Los datos de prueba se borran antes de los reales.** Socios inventados,
  ventas de demo o catálogo de ejemplo en producción terminan mezclados con
  lo del cliente. El día de la entrega, con un respaldo recién tomado, se
  vacía lo de prueba y se comprueba que quedó en cero.
- **Los demos de venta no viven en la cuenta de un cliente.** Van en una
  cuenta aparte, solo para demos, con datos inventados.
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
