# Dónde viven las cuentas de un proyecto

Regla del método (octubre de 2026): **un proyecto nace en el entorno
controlado del desarrollador, se muda a su propia casa antes de recibir
datos reales, y se entrega.** Sale de tener todos los proyectos colgados del
correo institucional de la universidad: al egresar se pierde ese correo, y
con él el acceso a todo.

## Las tres etapas

| Etapa | Dónde viven las cuentas | Datos |
|---|---|---|
| **1. Desarrollo** | Entorno controlado: el correo profesional del desarrollador (nunca uno institucional ni el personal de siempre), con verificación en dos pasos | De prueba o de demo |
| **2. Mudanza** (antes de los datos reales) | La casa del proyecto: un correo propio del proyecto (por ejemplo `amiragym.sistema@gmail.com`) donde se crean la base de datos, la publicación y el dominio | Reales, desde acá |
| **3. Entrega** | Ese correo pasa al cliente, o lo sigue administrando el desarrollador si el servicio es mensual. Lo que se decida queda escrito en el acuerdo y en el acta de entrega | — |

**Qué no se muda:** el repositorio de código se queda en el GitHub del
desarrollador (el código es suyo y el cliente tiene una licencia de uso),
salvo que el cliente compre el código.

## Cómo se muda cada pieza

- **Supabase:** se crea una organización en la cuenta del proyecto y se
  transfiere el proyecto a ella (Settings → General → Transfer project).
  Según la [guía oficial](https://supabase.com/docs/guides/platform/project-transfer):
  la región no cambia, la organización de destino tiene que estar dentro del
  límite de dos proyectos gratuitos, y transferir es solo para Owner (en el
  origen y en el destino). La URL y las claves no cambian, así que la app
  sigue funcionando; revisar después las integraciones conectadas. Al
  terminar, bajar al desarrollador a **Developer** en el destino.
- **Cloudflare Pages:** un proyecto no se pasa de una cuenta a otra. Se crea
  el proyecto en la cuenta nueva con el mismo nombre si está libre (si no, la
  dirección `.pages.dev` cambia: por eso conviene mudar ANTES de imprimir
  QR o entregar links), y se cambian los secretos `CLOUDFLARE_API_TOKEN` y
  `CLOUDFLARE_ACCOUNT_ID` del repo. El siguiente merge publica ahí.
- **Dominio:** se compra directamente en la cuenta del proyecto y a nombre
  del cliente. Así no hay que transferirlo nunca.
- **Secretos de GitHub Actions** (backup, deploy): se actualizan con los de
  la cuenta nueva. Correr el workflow a mano para confirmar.
- **Correo del proyecto:** con verificación en dos pasos, y su recuperación
  apuntando a un teléfono o correo del dueño de esa cuenta.

## Por qué así

- **Lo que se entrega se puede entregar.** Si todo vive en una cuenta del
  proyecto, entregar es pasar una contraseña, no rehacer el proyecto.
- **El plan gratis rinde más:** cada cuenta de proyecto tiene su propio cupo
  de proyectos gratuitos, siempre que el desarrollador entre como Developer
  (ver "Límites de los planes gratuitos").
- **Nada personal se mezcla con el cliente,** y nada del cliente depende de
  que el desarrollador conserve un correo.
- **Desarrollar en casa propia es más rápido:** cuentas y permisos ya
  armados; la mudanza se hace una vez, cuando el proyecto ya vale la pena.

## Quién entra con qué

- **El correo del proyecto es el dueño legal, no el que se usa a diario.**
  Es **Owner** de la organización de Supabase y de la cuenta de Cloudflare
  del proyecto. Su contraseña la guarda el desarrollador en un gestor
  (Bitwarden) mientras dure el servicio, y **su teléfono de recuperación es
  el del cliente**: si el desarrollador desaparece, el cliente recupera todo.
- **El desarrollador entra con su correo profesional como _Developer_** en la
  organización de Supabase del cliente, no como Owner ni Administrator. Un
  solo inicio de sesión para todos los clientes, y entregar es quitarse como
  miembro.
- **Developer alcanza para el día a día** (SQL Editor, tablas, usuarios de
  Auth, Storage, Edge Functions, ver las llaves y los backups). **No alcanza
  para la configuración**: URLs de Auth, SMTP, proveedores, plantillas de
  correo, crear, pausar, borrar o transferir proyectos, e invitar miembros.
  Para eso se entra con el correo del proyecto, que es lo correcto: la
  configuración la cambia el dueño legal. Detalle:
  [roles de Supabase](https://supabase.com/docs/guides/platform/access-control).

## Límites de los planes gratuitos (octubre de 2026)

- **Supabase: 2 proyectos activos por persona, no por organización.** El
  límite suma todas las organizaciones donde esa persona es **Owner o
  Administrator**; los pausados no cuentan, y un proyecto gratuito se pausa
  tras una semana sin uso. Para crear un proyecto gratuito en una
  organización, ninguno de sus Owner o Administrator puede estar en el
  límite ([facturación](https://supabase.com/docs/guides/platform/billing-on-supabase)).
  - Por eso el desarrollador es **Developer** en las organizaciones de los
    clientes: así esos proyectos no le cuentan, y el cliente puede crear los
    suyos.
  - Lo aprendimos al revés: la cuenta de Argonauta quedó como Owner de 7
    proyectos activos tras las mudanzas y no podía crear ninguno nuevo, ni
    siquiera uno de prueba.
  - Los demos de venta viven en una cuenta de Supabase aparte, solo para
    demos (por ejemplo, entrando con GitHub), para no gastar el cupo de
    nadie.
- **Cloudflare Pages:** sin tope publicado de proyectos por cuenta; 500
  compilaciones al mes por cuenta, que no afectan a quien publica desde
  GitHub Actions.

## Cuentas de las personas del cliente

Cada persona que usa el sistema entra con **su propio correo**: nada de
cuentas compartidas tipo `recepcion@`, porque no se sabe quién hizo qué y no
se le puede quitar el acceso solo a quien se va. Quien no tenga correo, se
crea uno. El desarrollador conserva una cuenta propia de soporte, declarada
en el acuerdo.
