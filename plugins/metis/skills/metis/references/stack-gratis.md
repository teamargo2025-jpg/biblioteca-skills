# Arquitectura en planes gratuitos

Referencia para la ronda 2. El objetivo es elegir el stack en un solo mensaje, con razones, sin convertirlo en un catálogo de tecnologías.

> Los límites concretos de los planes gratuitos cambian cada pocos meses. Úsalos para orientar la decisión, y verifica el que sea crítico antes de comprometer el proyecto con él. Si una decisión depende de un límite exacto, dilo en el documento como supuesto a comprobar.

## La pregunta que decide casi todo

**¿Qué tiene que pasar cuando nadie está mirando la pantalla?**

Es lo primero que hay que responder, porque separa dos mundos con costos muy distintos:

- **Nada** — la app solo hace cosas mientras alguien la usa. Entonces sirve cualquier hosting estático y el proyecto es barato y simple.
- **Algo a una hora determinada** — recordatorios, resúmenes diarios, sincronizaciones, cobros. Aquí aparece la trampa principal, porque **el hosting moderno no tiene un proceso prendido esperando**.

Esa segunda respuesta es la causa más común de replanteo a mitad de proyecto: se construye toda la interfaz y en la semana cuatro se descubre que no hay quién dispare el aviso.

## Combinaciones que funcionan

| El proyecto necesita | Propón | Por qué |
|---|---|---|
| Solo interfaz y datos | Vite + Cloudflare Pages + Supabase | Es el camino más corto, y el plan gratis de Cloudflare Pages permite uso comercial |
| Avisar a un celular | **PWA instalable + Web Push** | Notificación en celular y escritorio con un solo desarrollo, sin publicar en ninguna tienda |
| Ejecutar algo a una hora | **`pg_cron` de Supabase** llamando a una Edge Function | El único cron de verdad que hay en los planes gratuitos habituales |
| Capturar por voz | Web Speech API del navegador | Gratis y sin servicios externos; suficiente para dictado corto |
| Recibir mensajes desde el celular sin app | Bot de Telegram | Ya está instalado, acepta audio y texto, y notifica push. Es el atajo cuando la PWA no alcanza |
| Enviar correo | Resend o similar, plan gratuito | Volumen personal cabe de sobra |
| Procesar lenguaje natural | API de Claude, modelo Haiku | Céntimos al mes en uso personal — pero no es gratis; ver abajo |

Regla general: **una sola plataforma para datos, autenticación y tareas programadas** (hoy, Supabase) y otra para servir la interfaz (Cloudflare Pages). Repartir esto entre cuatro servicios gratuitos multiplica los puntos de fallo sin ahorrar nada.

**El hosting gratis tiene condiciones de uso, no solo límites.** GitHub Pages prohíbe los sitios que venden o los SaaS comerciales; el plan Hobby de Vercel es solo para uso personal no comercial, y cuenta como comercial incluso que a alguien le paguen por hacer el sitio. Si el proyecto es o puede ser comercial, Cloudflare Pages desde el día 1: mudarse después cuesta más. Detalle y fuentes: `references/hosting.md` de la skill arranque.

## Trampas

Estas son las que muerden después de haber construido encima.

**El hosting serverless no tiene proceso permanente.** Vercel, Netlify y equivalentes ejecutan código solo cuando llega una petición. No hay nada corriendo entre visitas, así que no pueden despertarse solos a las 3 de la tarde. Todo lo que sea "a tal hora" necesita algo externo que lo llame.

**El cron de los planes gratuitos suele ser diario.** En Vercel, el plan Hobby permite tareas programadas pero con una frecuencia mínima muy baja — sirve para un resumen diario, no para recordatorios a hora exacta. Para precisión de minutos, `pg_cron` de Supabase o los Cron Triggers de Cloudflare Workers, ambos en plan gratuito.

**Las notificaciones push exigen una PWA instalada.** Una página abierta en una pestaña no basta. El usuario tiene que instalarla desde el navegador. En Android es directo; **en iPhone hay que instalarla desde Safari y las restricciones son mayores**. Si el proyecto vive de las notificaciones y el usuario tiene iPhone, ese es el riesgo número uno y se prueba el primer día. El plan B es Telegram.

**Las bases de datos gratuitas se pausan por inactividad.** Supabase suspende proyectos gratuitos tras unos días sin uso; reactivar es manual. Para un proyecto de uso diario da igual, pero conviene saberlo antes de que "no funciona" resulte ser eso.

**Los servidores gratuitos se duermen.** Render, Fly y similares apagan el contenedor sin tráfico, y la primera petición tarda decenas de segundos. Inaceptable para algo que se abre desde el celular con prisa. Si hace falta un proceso permanente de verdad, eso cuesta dinero — dilo.

**La API de Claude no viene con la suscripción.** Claude Code y claude.ai se pagan aparte de la API; que una app propia llame a Claude requiere una clave con créditos, cobrados por token. Es un cobro separado, no incluido.

## Cuándo hay que gastar

Casi todo cabe en planes gratuitos. Lo que no:

| Necesidad | Costo aproximado |
|---|---|
| Que un modelo procese texto | Con Haiku, céntimos al mes en uso personal; con modelos mayores, unos pocos dólares |
| Transcribir audio largo con calidad | Hay servicios de pago; para dictado corto, la API del navegador suele bastar |
| Un proceso siempre encendido | Unos pocos dólares al mes; casi siempre evitable con cron + funciones |
| Dominio propio | Anual, opcional — el subdominio gratuito del hosting sirve para empezar |

Cuando algo cueste, **di la cifra mensual y deja que la persona decida**. "Esto son unos 2 dólares al mes" es una decisión fácil de tomar; "esto tiene costo" solo genera dudas.

Y hay una jugada que aparece a menudo: **si lo que cuesta está en una fase posterior, la v1 sale gratis**. Suele ser el caso con la IA, que casi siempre necesita datos acumulados y por tanto no puede ir primero de todos modos.

## Cómo presentarlo

Una tabla corta de cuatro o cinco filas: la necesidad, la pieza elegida, y el porqué en una línea. Después, aparte, el riesgo técnico que hay que probar primero.

No expliques qué es una PWA ni qué es un cron salvo que la conversación muestre que hace falta. Lo que la persona necesita saber es qué se eligió, por qué, y qué puede salir mal.
