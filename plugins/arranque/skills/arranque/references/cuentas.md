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
  límite de dos proyectos gratuitos, y el rol de quien transfiere depende de
  su rol en el destino (puede quedar solo de lectura: agregarse como dueño
  antes). La URL y las claves no cambian, así que la app sigue funcionando;
  revisar después las integraciones conectadas.
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
- **El plan gratis rinde más:** cada cuenta tiene su propio cupo de
  proyectos gratuitos.
- **Nada personal se mezcla con el cliente,** y nada del cliente depende de
  que el desarrollador conserve un correo.
- **Desarrollar en casa propia es más rápido:** cuentas y permisos ya
  armados; la mudanza se hace una vez, cuando el proyecto ya vale la pena.

## Cuentas de las personas del cliente

Cada persona que usa el sistema entra con **su propio correo**: nada de
cuentas compartidas tipo `recepcion@`, porque no se sabe quién hizo qué y no
se le puede quitar el acceso solo a quien se va. Quien no tenga correo, se
crea uno. El desarrollador conserva una cuenta propia de soporte, declarada
en el acuerdo.
