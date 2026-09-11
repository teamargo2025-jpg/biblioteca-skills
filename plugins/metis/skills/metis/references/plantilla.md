# Plantilla del documento de proyecto

## Cómo escribirlo

El documento tiene un solo lector real: la persona que va a construir esto, dentro de tres semanas, cuando ya no se acuerde de la conversación. Escríbelo para ese momento.

- **Usa sus palabras.** Si dijo "los chicos del taller", no escribas "los operarios del área de producción". El documento tiene que sonar a su proyecto, no a una propuesta comercial.
- **Frases cortas y concretas.** "El dueño anota las ventas en un cuaderno y al mes no cuadra" vale más que "existe una deficiencia en el proceso de registro transaccional".
- **Nada de relleno.** Si una sección quedó vacía porque no se habló de eso, escribe qué falta en vez de inventar contenido. Una sección honestamente vacía es información; una llena de generalidades es ruido que además da falsa seguridad.
- **Números donde los haya.** Horas por semana, fecha de entrega, cuántos usuarios, cuánto cuesta el hosting. Si son estimaciones, dilo: "~6 semanas (estimado, sin haber probado la integración)".
- **Longitud:** entre una y tres páginas. Si pasa de ahí, casi siempre es que el alcance está inflado — y eso es un hallazgo que hay que decirle.

## Estructura

Sigue este orden. Puedes omitir una sección si de verdad no aplica, pero no reordenes: el documento cuenta una historia que va de "por qué" a "qué hago el lunes".

```markdown
# [Nombre del proyecto]

> Una frase: qué es y para quién.

*Última actualización: [fecha]*

## El problema

Qué pasa hoy sin esto, con un ejemplo concreto. Cada cuánto pasa y qué cuesta.
Cómo se las arreglan actualmente.

## Para quién

Los tipos de usuario, con su contexto real (dispositivo, conectividad, cuánta
prisa tienen, qué tan cómodos con la tecnología). Si hay varios, cuál manda.

## Qué hace la primera versión

La lista corta de lo que sí entra. Cada punto redactado como algo que un usuario
puede hacer: "el vendedor registra una venta y ve el total del día".

## Qué NO hace (por ahora)

Lista explícita de lo que queda fuera, con una razón por cada cosa. Esta sección
es la que salva el proyecto dentro de un mes, cuando aparezca la tentación de
agregar "una cosita más".

## Cómo sabremos que funcionó

La señal observable de éxito, con número y plazo.

## Restricciones

Tiempo disponible, fecha límite si la hay, equipo, presupuesto, stack, dónde corre.

## Riesgos y supuestos

| Qué asumimos / qué puede fallar | Impacto | Cómo lo comprobamos barato |
|---|---|---|
| | | |

## Decisiones tomadas

Las bifurcaciones donde se eligió un camino, con el porqué en una línea. Sirve
para no volver a discutir lo mismo en dos semanas.

## Preguntas abiertas

Lo que quedó sin resolver. Cada una con quién puede responderla y para cuándo
hace falta la respuesta (algunas bloquean la fase 1, otras pueden esperar).

## Plan por fases

[ver references/roadmap-y-trello.md]
```

## Si ya existe el documento

Cuando el proyecto ya tiene un `PROYECTO.md` de una sesión anterior, actualízalo en vez de crear otro. Conserva la sección de decisiones tomadas — es memoria histórica, no se reescribe — y actualiza la fecha. Si algo cambió de rumbo, deja constancia de que cambió y por qué; un documento que finge que siempre pensó lo mismo pierde su utilidad.
