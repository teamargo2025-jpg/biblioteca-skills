# Roadmap por fases y volcado a Trello

## Cómo ordenar las fases

Un roadmap útil no está ordenado por lo que es fácil ni por lo que da gusto construir. Está ordenado por **cuánta incertidumbre elimina cada paso**, porque la incertidumbre es lo que hace que los proyectos se caigan tarde, cuando ya no hay tiempo de reaccionar.

El orden que casi siempre funciona:

**Fase 0 — El esqueleto que corre.** Un proyecto vacío pero desplegado y funcionando de punta a punta: se levanta local, se sube, se ve en el navegador. Suena a nada y es lo que evita descubrir en la semana seis que el despliegue no funciona. Debería tomar horas, no días.

**Fase 1 — Lo más riesgoso, en versión fea.** Aquello de la tabla de riesgos que, si no funciona, cambia el proyecto entero: la integración con el banco, la lectura del PDF, el rendimiento de la consulta grande. No se construye bonito, se construye para saber si es posible. Un script suelto que responde la pregunta ya cumplió su función.

**Fase 2 — El camino feliz completo.** El flujo del núcleo, de principio a fin, sin casos raros, sin permisos, sin validaciones elegantes. Al final de esta fase alguien real puede usarlo y decir si sirve. Este es el hito que importa; todo lo anterior existía para llegar aquí sin sorpresas.

**Fase 3 en adelante — Lo que la realidad pida.** Errores, permisos, casos borde, lo segundo más valioso de la lista. Aquí ya se planifica con información real en vez de suposiciones, así que estas fases se describen con menos detalle a propósito.

Dos reglas que conviene decir en voz alta al presentar el roadmap:

- **Nada de "integración al final".** Si dos piezas tienen que hablarse, que se hablen en la primera semana aunque sea con datos falsos.
- **El detalle decrece con la distancia.** La fase 1 se describe por tareas; la fase 4, por objetivo. Planificar en detalle algo que está a dos meses es tiempo perdido, porque para entonces la mitad de los supuestos habrán cambiado.

## Cómo escribir cada fase

```markdown
### Fase 1 — [Nombre corto y concreto]

**Objetivo:** para qué existe esta fase, en una frase.
**Duración estimada:** X semanas (con las horas semanales que la persona dijo tener)
**Terminó cuando:** [algo observable, verificable, sin opinión de por medio]

- [ ] Tarea concreta
- [ ] Tarea concreta
```

El criterio de "terminó cuando" es lo que hace que una fase se pueda cerrar. Tiene que ser algo que se pueda comprobar mirando la pantalla:

- Malo: "el módulo de ventas está listo" — ¿listo según quién?
- Bueno: "se registra una venta desde el celular y aparece en el reporte del día"

Las tareas deben ser piezas de medio día a dos días. Si una tarea suena a "hacer el backend", no es una tarea, es una fase disfrazada: pártela. Y si al partirla salen quince tareas, esa es una señal de que la fase es demasiado grande y hay que dividirla en dos.

Sobre las estimaciones: úsalas para dimensionar, no para prometer.

Con el perfil por defecto —proyecto personal, tiempo amplio, Claude Code al lado— **estima en días, no en semanas**. Decir "fase 1: 4 a 6 días" es accionable; "fase 1: dos semanas" invita a dejarla para después. Si hay tecnología nueva de por medio, sube la estimación; la asistencia de programación acelera escribir código, no acelera entender un sistema que no conoces.

Cuando el total no entra en el plazo o en el ritmo real, dilo en el momento con números en vez de maquillar la estimación — el propósito del roadmap es que la persona pueda decidir qué recortar mientras todavía tiene margen. Y cuando alguien declare un ritmo muy alto (varias horas diarias sostenidas), planifica con lo que dijo pero deja el roadmap escalonado, de modo que si el ritmo baja, la fase 1 ya haya entregado algo usable.

## Volcado a Trello

Solo si hay conector de Trello disponible y la persona lo pidió o aceptó el ofrecimiento. Crear un tablero es escribir en un servicio externo: confirma antes.

Qué volcar: **solo las fases 0 y 1**. Las fases lejanas van a cambiar, y un tablero lleno de tarjetas que nunca se tocan enseña a ignorar el tablero.

Procedimiento:

1. Pregunta si usa un tablero existente o quiere uno nuevo. Si es nuevo, propón el nombre del proyecto y espera el visto bueno.
2. Crea las listas: `Por hacer`, `En curso`, `Hecho`. Si el tablero ya existe, usa las listas que ya tiene en vez de imponer las tuyas.
3. Crea una tarjeta por tarea, en `Por hacer`, con `pos` en enteros consecutivos (1, 2, 3...) para conservar el orden del roadmap.
4. En la descripción de cada tarjeta, pon el criterio de terminado de esa tarea y un enlace o referencia a la sección del documento. La tarjeta debe poder entenderse sin abrir el documento.
5. Usa etiquetas para marcar la fase si el tablero las soporta.
6. Al terminar, dile cuántas tarjetas creó y en qué tablero, y recuérdale que las fases siguientes se vuelcan cuando toque, no ahora.

Si el conector de Trello no está disponible, no lo menciones — ofrecer algo que no se puede hacer solo genera fricción. Deja las tareas como casillas en el markdown, que ya sirven como lista de trabajo.
