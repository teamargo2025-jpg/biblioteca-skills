---
name: lanzamiento
description: Revisa un proyecto web ANTES de que lo usen personas reales (o lo audita si ya está en uso) y devuelve un informe de qué bloquea el lanzamiento, con evidencia y arreglo: qué ve alguien sin sesión, secretos, dinero y precios, datos personales, respaldo, cómo te enteras de los errores, y dónde y cómo se publica. Úsala cuando digan "vamos a lanzar", "ya lo van a usar", "está listo para producción?", "revisa antes de entregar", "audita la seguridad", "¿qué falta para salir?", "checklist de lanzamiento", o antes de pasarle una app a un cliente o a usuarios. También en inglés ("pre-launch checklist", "is this ready for production", "security review before launch"). No la uses para montar el repo (eso es arranque) ni para SEO a fondo (seo-audit).
---

# Lanzamiento

Lanzamiento responde una pregunta: **¿qué puede salir mal cuando esto lo use
gente de verdad, y qué hay que arreglar antes?** Sale de revisar en octubre de
2026 siete proyectos que ya estaban en uso o a punto de estarlo. En uno de
ellos, cualquiera podía leer las medidas corporales de los 114 socios de un
gimnasio con la clave pública de la app. Nadie lo había notado porque la app
funcionaba perfecto.

Esa es la idea que la ordena: **que funcione no dice nada de quién más puede
usarlo.** Las pruebas de uso miran el camino feliz; esta revisión mira lo que
hace un curioso, un error a las 11 de la noche o un disco que se rompe.

## Ritmo

| Paso | Qué haces | Toca el repo |
|---|---|---|
| 1. Contexto | Quién lo usa, qué datos maneja, si cobra, dónde está publicado | No |
| 2. Revisión | Los siete frentes de abajo, con evidencia | No |
| 3. Informe | Tabla de hallazgos: bloquea / antes de una semana / mejora | No |
| 4. Arreglos | Con permiso, cada uno en su PR | Sí |
| 5. Puerta | Lo que tiene que estar cumplido para lanzar | — |

**No arregles mientras revisas.** Primero el informe completo: la persona
decide el orden, y a veces un hallazgo cambia la urgencia de otro.

## 1. Contexto

Lee `CLAUDE.md`, `README.md` y `PROYECTO.md` si existen. Necesitas saber, y
preguntas solo lo que no esté escrito:

- **Quién lo va a usar** y cuántos: el dueño, un equipo, clientes, el público.
- **Qué datos de personas guarda**: nombre, DNI, teléfono, dirección, salud,
  dinero. Es lo que decide la gravedad de casi todo lo demás.
- **Si mueve dinero**: precios, pedidos, pagos, caja.
- **Si ya está en uso.** Si lo está, cada arreglo que toque la base va con el
  procedimiento de `references/cambios-en-produccion.md`: nunca dejar a los
  usuarios con la app rota mientras se arregla.
- **Si el repo es público**: todo lo que esté en el historial de git es
  público, incluidos los artifacts de GitHub Actions.

## 2. Revisión: siete frentes

El detalle de cada uno (qué mirar, con qué comando, qué cuenta como
problema) está en `references/frentes.md`. Resumen:

1. **Qué ve y qué hace alguien sin sesión.**
   1. Primero la **radiografía** de `references/frentes.md` en el SQL
      Editor: todas las tablas, las políticas de escritura, las funciones y
      los buckets, sin leer datos de nadie.
   2. Después `scripts/acceso-anonimo.mjs` desde la carpeta del proyecto,
      con `--tablas` para las que la base tiene y el repo no. El script:
      - mira si el registro de cuentas está abierto;
      - lee cada tabla, también columna por columna;
      - prueba si acepta escrituras con una fila imposible, que la base
        siempre rechaza;
      - lista los buckets.
   3. Revisa a mano cada función `security definer` expuesta.

   Es el frente que más muerde: ver `references/casos.md`.
2. **Secretos.** En los archivos y en todo el historial de git. La clave de
   servicio nunca en el navegador ni en el repo.
3. **Dinero.** Que el precio, el total y el stock los calcule la base, no el
   navegador; que un pedido no pueda llegar con un total inventado; que los
   pagos se prueben en modo de prueba, nunca en producción.
4. **Datos personales.** Qué se guarda, quién lo ve, si hay política de
   privacidad, si la persona puede borrar su cuenta, y si el respaldo los
   sube sin cifrar a algún lado.
5. **Respaldo.** Que exista, que haya corrido, y que **se haya restaurado al
   menos una vez**. Una copia que nunca se restauró no es una copia.
6. **Cómo te enteras de un error.** Si algo falla en el celular de un
   usuario, ¿quién se entera, y cuándo? "Me avisa por WhatsApp" es una
   respuesta válida para cinco usuarios, no para cien.
7. **Publicación.** Que **producción tenga lo que el repo dice**: cada
   migración aplicada, cada función desplegada, cada secreto cargado (los
   tests corren todas las migraciones; producción, solo las que alguien
   pegó). Además, **lo que vive en el panel y no en el repo**:
   - URLs de Auth, registro público, SMTP propio y roles;
   - que el dueño pueda cambiar y recuperar su contraseña, y que el admin sea
     él, con su propio correo;
   - que los datos de prueba se borren antes de los reales.

   Y el resto: hosting que permita el uso (regla de
   `arranque/references/hosting.md`), deploy automático con tests, y que lo
   que la gente guarda (QR impresos, apps instaladas, links) no dependa de
   una dirección que va a cambiar.

## 3. Informe

Una tabla, ordenada por gravedad. Cada fila: **qué pasa, a quién afecta, la
evidencia** (el comando y lo que devolvió), y **el arreglo propuesto**.

| Gravedad | Cuándo |
|---|---|
| **Bloquea** | Datos de una persona visibles para otra o para cualquiera; dinero manipulable desde el navegador; un secreto filtrado; datos que no se pueden volver a escribir sin respaldo; hosting que prohíbe el uso; el dueño no puede cambiar una contraseña que conoce el desarrollador; **lo que la app promete como su razón de ser no funciona en producción** (en Gonthia, los avisos de plazo), salvo que el dueño decida lanzar sin eso y lo diga. |
| **Antes de una semana** | Respaldo sin restaurar nunca; nadie se entera de los errores; datos personales en un respaldo sin cifrar en un repo privado; escrituras abiertas que dejan tocar filas ajenas conociendo un id. |
| **Mejora** | Lo demás: mensajes de error, íconos, textos, rendimiento. |

Dilo con números cuando los tengas ("76 mediciones de 114 socios legibles sin
sesión"), y lo que **no** probaste a propósito (por ejemplo, no abrir el
portal de una persona real para confirmar que se ve su nombre).

## 4. Arreglos

Con permiso, y uno por PR. Si el arreglo cambia permisos de una base que ya
está en uso, sigue `references/cambios-en-produccion.md`: primero se agrega lo
nuevo, después se publica la app que lo usa, recién al final se cierra lo
viejo; y cada paso se comprueba contra la base real sin tocar datos de nadie.

Todo arreglo de un hallazgo "Bloquea" lleva un **test que falle sin el
arreglo**. Para Supabase, el esquema completo en PGlite con los roles
simulados sirve (hay ejemplos en Gonthia, Chincha-Inventario y Amira).

## 5. Puerta

Para lanzar, todo esto tiene que ser verdad, y comprobado, no supuesto:

- Ningún hallazgo "Bloquea" abierto.
- `acceso-anonimo.mjs`, con las tablas de la radiografía, solo muestra
  tablas que el dueño publicaría en un cartel, y cada tabla escribible sin
  sesión tiene una razón y un tope.
- El dueño puede cambiar y recuperar su contraseña, el admin es él con su
  propio correo, y los datos de prueba ya no están.
- El respaldo corrió y se restauró una vez en un proyecto aparte.
- Hay una forma concreta de enterarse de un error en producción.
- Las cuentas ya están en la casa del proyecto (su propio correo), no en el
  entorno de desarrollo ni en un correo institucional
  (`arranque/references/cuentas.md`).
- **Una persona real** hizo el recorrido principal en su propio celular,
  con datos reales, y funcionó.

## Qué no hace

- **No reemplaza una auditoría de seguridad profesional** para un sistema con
  pagos propios o datos de salud a gran escala: dilo si es el caso.
- **No toca producción sin permiso**, ni lee datos de personas para "probar"
  un hallazgo: alcanza con contar filas o usar ids inventados.
- **No arregla el SEO** (eso es seo-audit) ni monta el repo (arranque).

## Al cerrar

El informe, lo que se arregló (con sus PR) y lo que queda, con su gravedad.
Y la pregunta de la puerta que todavía no se cumple, si queda alguna.
