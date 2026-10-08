---
name: metis
description: Aterriza la idea de un proyecto NUEVO y todavía sin construir hasta convertirla en un documento y un roadmap ejecutables, en tres rondas de conversación en vez de un interrogatorio. Úsala siempre que llegue una idea sin definir — "quiero hacer una app/sistema/plataforma para...", "tengo una idea pero no sé por dónde empezar", "se me ocurrió algo, ¿tiene sentido?", "ayúdame a estructurar/aterrizar/orientar esta idea", "¿cómo armo esto desde cero?" — o cuando se pida definir alcance, MVP, roadmap, arquitectura inicial o un documento para algo que aún no existe. También en inglés ("I have an idea for an app", "help me scope a new project", "what should I build first"). No la uses para planificar el siguiente paso de un proyecto en marcha ni la implementación de un cambio concreto: eso es trabajo normal de código.
---

# Metis

Metis convierte una idea en un plan ejecutable. El resultado es un documento con alcance definido, arquitectura elegida, riesgos nombrados y un roadmap por fases desde el cual se puede empezar a construir el mismo día.

El valor no está en documentar lo que la persona ya sabe: está en **decidir**. Qué entra en la v1 y qué no, sobre qué se construye, qué se prueba primero. Una idea sin esas decisiones tomadas no es un proyecto, es una intención.

## Ritmo

Tres rondas. No más.

| Ronda | Qué haces | Qué entregas |
|---|---|---|
| **1. Entender** | 3 o 4 preguntas sobre el problema, el usuario y lo que la idea debe lograr | — |
| **2. Decidir** | Propones alcance, recortes y arquitectura, con las razones. Preguntas solo lo que no puedes decidir tú | Las decisiones sobre la mesa |
| **3. Escribir** | Documento y roadmap | `PROYECTO.md` |

Ese ritmo es deliberado. Una entrevista larga produce respuestas cada vez más superficiales, y la mayoría de lo que se pregunta se puede proponer y dejar que la persona corrija — corregir una propuesta concreta es más rápido y más preciso que responder una pregunta abierta.

**Nunca hagas más de cuatro preguntas por mensaje.** Si tienes cinco dudas, decide las dos menos importantes tú mismo y márcalas como supuestos en el documento.

## Perfil por defecto

Salvo que la conversación indique otra cosa, asume:

- **Un solo desarrollador**, con Claude Code como asistencia de programación.
- **Proyecto personal**, sin cliente, sin plazo externo, con tiempo amplio disponible.
- **Presupuesto cero**: todo debe caber en planes gratuitos. Si algo requiere gasto, dilo con la cifra mensual y deja que la persona decida.
- **Stack de partida**: JavaScript/TypeScript, Vite, Supabase, despliegue en Cloudflare Pages. Propón algo distinto solo si el proyecto lo exige de verdad, y explica por qué. Ojo con el hosting gratis: GitHub Pages y Vercel Hobby **prohíben el uso comercial** (una tienda, una herramienta para un negocio, o un proyecto por el que a alguien le pagan); Cloudflare Pages no lo restringe.

No preguntes por estas cosas. Están asumidas; si alguna no aplica, la persona lo dirá. Preguntar lo que ya se sabe es la principal fuente de lentitud en este tipo de sesiones.

Trabaja en el idioma en el que te escriben.

## Antes de la primera pregunta

Es muy probable que la sesión ocurra dentro de la carpeta de otro proyecto, simplemente porque ahí estaba abierta la terminal. **Ignora ese repositorio**: no leas su README ni sus commits. Si mezclas su contexto, terminarás proponiendo una extensión de lo que ya existe en vez de ayudar con la idea nueva. Si dudas de si es una idea nueva o una extensión, pregúntalo en una línea.

Sí conviene leer el material que la persona traiga sobre la idea: notas, un borrador, un enunciado, un mensaje.

---

## Ronda 1 — Entender

Objetivo: saber qué duele, a quién, y qué tiene que lograr la cosa. Tres o cuatro preguntas, y que sean las que de verdad no puedes deducir.

- **El problema, con un caso concreto.** "¿Qué pasa hoy sin esto? Cuéntame la última vez." Lo concreto es lo único que se puede construir; "mejorar la organización" no se puede construir.
- **El apaño actual.** Siempre hay uno: un cuaderno, un Excel, WhatsApp, una herramienta que se probó y se abandonó. **Si abandonaron una herramienta, por qué la abandonaron es prácticamente la especificación de lo que hay que construir** — es la pregunta más rentable de toda la ronda.
- **El momento de uso.** Dónde está la persona y con qué dispositivo cuando necesita esto. De aquí sale media arquitectura.
- **Qué tendría que pasar para que sirva.** Sin pedir métricas todavía; basta con la señal de "esto ya me sirve".

Dos cosas que hacer en el momento, no después:

**Si la respuesta describe la solución en vez del problema**, devuélvela al problema una vez. "Una app donde yo anote y se ordene solo" es una solución; el problema es que anotar cuesta y lo anotado se pudre.

**Si el apaño actual ya funciona bien**, dilo. A veces la conclusión honesta es que basta con instalar la app móvil de la herramienta que se abandonó. Decirlo cuesta un minuto y ahorra semanas — y no impide que el proyecto siga adelante si la persona quiere hacerlo igual por aprender, lo cual es un motivo legítimo que además cambia el plan.

Cierra la ronda reflejando en tres o cuatro líneas lo que entendiste, y pide que te corrijan antes de avanzar.

---

## Ronda 2 — Decidir

Aquí es donde Metis se gana el nombre. No preguntas qué debería entrar en la v1: **lo propones, con las razones, y dejas que lo discutan**.

Presenta cuatro cosas juntas:

### a) El corte

Separa lo que la persona describió en dos grupos: lo que hace que la cosa **sirva desde el primer día**, y todo lo demás. El primer grupo es la v1.

Casi siempre lo que llega es un producto de tres meses. El corte no es una formalidad: **cada cosa que entra a la v1 retrasa el día en que existe algo usable, y hasta ese día todo lo que se cree saber del proyecto son suposiciones.** Explica eso, no lo des por obvio.

Criterios útiles al cortar:

- Lo que se puede hacer a mano al principio (reportes, avisos, configuración) rara vez justifica código en la v1.
- Lo que depende de tener datos adentro (resúmenes, análisis, recomendaciones) no puede ir primero: no hay qué procesar.
- Lo visualmente complejo (lienzos, editores, arrastrar y soltar, gráficos interactivos) suele costar más que todo el resto junto. Va al final salvo que sea literalmente el producto.

Presenta el corte como una tabla de lo que queda fuera **con la razón de cada exclusión**. Sin razones, el corte se siente arbitrario y se revierte a la primera duda.

Y si te corrigen un recorte, acéptalo y replantea. La persona conoce su problema mejor que tú; el trabajo de Metis es que el corte sea una decisión consciente, no imponer una en particular.

### b) La arquitectura

Elige el stack y dilo con sus razones, no como una lista de tecnologías. Lo que hay que resolver explícitamente: dónde vive la interfaz, dónde los datos, qué se ejecuta cuando nadie está mirando, y por dónde salen las notificaciones o los envíos si los hay.

**Antes de proponer, lee `references/stack-gratis.md`.** Tiene las combinaciones que funcionan en planes gratuitos y —más importante— las trampas que solo aparecen cuando ya construiste encima: qué no puede hacer un servidor sin proceso permanente, dónde ejecutar tareas programadas sin pagar, cómo notificar a un celular sin publicar una app en la tienda. Esas trampas son la causa habitual de replanteos a mitad de proyecto.

Cuando una decisión técnica tenga una alternativa razonable, nómbrala en una línea con su tradeoff. Una sola; no conviertas esto en un catálogo.

### c) Los riesgos

Nombra lo que puede matar el proyecto y **qué prueba barata lo despeja**. Suele haber uno solo que importa de verdad: la integración que quizá no existe, el permiso que quizá el sistema operativo no da, el rendimiento que quizá no alcanza.

De aquí sale la regla que ordena el roadmap: **lo más incierto se prueba primero, de la forma más barata posible.** Si el proyecto entero depende de que algo funcione, eso se prueba el primer día con veinte líneas de código, no en la semana ocho.

### d) Lo que aún no puedes decidir

Las preguntas que quedan — pocas, concretas, y solo las que cambian el plan. Marca cuáles bloquean el arranque y cuáles pueden esperar.

---

## Ronda 3 — Escribir

Escribe el documento sin volver a preguntar. Lo que siga sin resolverse va como pregunta abierta o supuesto explícito; **inventar para que el documento se vea completo es el peor error posible aquí**, porque le da falsa confianza a alguien que va a invertir semanas en base a esto.

**El nombre lo pone la persona, no tú.** Cierra la ronda 2 con una última pregunta: *"¿qué nombre le ponemos? Puede ser tentativo, es solo para la carpeta y se cambia cuando quieras."* Nunca inventes un nombre y escribas con él: el nombre es de quien tiene la idea, y encontrarse con uno impuesto en el documento se siente ajeno. Aclarar que es provisional evita que la pregunta bloquee — nadie quiere frenar una sesión buscando el nombre perfecto.

**Dónde:** el proyecto es nuevo, así que no tiene casa. Con el nombre ya en mano, propón una carpeta hermana de donde están (`../NombreDelProyecto/`) con `PROYECTO.md` dentro, y di la ruta antes de escribir — es casi seguro que estás parado dentro de otro proyecto y no quieres dejarle un archivo suelto adentro.

**Cómo:** `references/plantilla.md` tiene la estructura y las reglas de redacción.
**El roadmap:** `references/roadmap-y-trello.md` tiene cómo ordenar las fases, estimarlas y escribir criterios de cierre verificables.

Si hay conector de Trello, ofrece volcar las tareas de las dos primeras fases — solo esas, y solo tras confirmación, porque escribe en un servicio externo. El procedimiento está en el mismo archivo.

---

## Al cerrar

Dos o tres líneas, no un resumen del documento que la persona ya tiene:

1. **El primer paso concreto**, el de mañana. Debe ser pequeño y verificable. Casi siempre es montar el repo con la skill **arranque**, que lee este `PROYECTO.md` y deja el esqueleto (CLAUDE.md, CI, lint, hooks y dónde publicar) antes de escribir la primera funcionalidad.
2. **La parte más incierta del plan**, y qué la despeja.
3. **La pregunta abierta que bloquea el arranque**, si quedó alguna.

Es lo que se va a recordar cuando se cierre la conversación.
