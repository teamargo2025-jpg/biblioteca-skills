---
name: entrega
description: Lleva a un cliente de Argonauta Sistemas desde la demo hasta que su sistema opera y queda en mantenimiento. Llena las hojas del kit (oferta, acuerdo y acta de entrega) con los datos del cliente y las deja en PDF; antes del acta revisa con evidencia que se cumplan las puertas (lanzamiento sin bloqueos, respaldo restaurado, datos de prueba borrados, cuentas en la casa del cliente); después deja el issue de seguimiento con la fecha de su primera auditoría. Úsala cuando digan "prepara la oferta para X", "el cliente dijo que sí, arma el acuerdo", "mañana entregamos", "prepara el acta", "¿estamos listos para entregar?", "cierra la entrega de X", o cuando un cliente termina el servicio. No la uses para revisar la seguridad en sí (eso es lanzamiento) ni para definir un proyecto nuevo (metis).
---

# Entrega

Entrega cubre lo que ve el cliente: **una oferta, un acuerdo y un acta, de una
página cada uno.** Todo lo demás (CI, cuentas, revisión de seguridad) pasa por
dentro, y esta skill se asegura de que haya pasado antes de que el cliente
firme que recibió algo.

La idea que la ordena: **el acta dice "revisado" solo si hay evidencia.** Una
casilla marcada por costumbre es justo lo que esta skill existe para evitar.

## Dónde vive cada cosa

- **Las plantillas** están en el repo privado `argonauta-sistemas/conocimiento`,
  carpeta `kit/` (normalmente clonado en una carpeta hermana,
  `argonauta-conocimiento`). Usa siempre las de ahí; si no encuentras el
  clon, pregunta dónde está. No copies el texto de las plantillas en otro
  lado: si algo no encaja, se mejora la plantilla por PR, no la hoja de un
  cliente.
- **Lo que se promete** (soporte, horas incluidas, cobro) está en
  `flujo/mantener.md` del mismo repo, y la regla de producto y clientes en
  `decisiones/0001`. El acuerdo tiene que coincidir con `mantener.md`: si ves
  que no, dilo antes de generar.
- **Los datos del cliente** (`cliente.json` y las hojas llenas) van en una
  carpeta **fuera de todo repositorio**, por defecto
  `~/Argonauta/clientes/<cliente>/`. Llevan DNI, RUC y teléfonos: nunca a git,
  nunca a un issue, nunca a un chat.

## Ritmo

| Momento | Cuándo | Qué sale |
|---|---|---|
| 1. Oferta | Después de la demo | `oferta.pdf` |
| 2. Acuerdo | Cuando el cliente dice que sí | `acuerdo.pdf` |
| 3. Puerta | Antes del día de la entrega | Tabla: qué se cumple, con evidencia, y qué falta |
| 4. Acta | El día que empieza a operar | `acta.pdf` y el issue de seguimiento |
| 5. Término | Solo si el servicio termina | Lista de salida cumplida |

Cada momento se hace cuando toca, no todos juntos. Pregunta en cuál están si
no es obvio.

## 1 y 2. Oferta y acuerdo

1. Lee `kit/README.md`: la lista de campos y los precios de lista.
2. Junta los datos en `cliente.json`, con una sección `comun` y una por hoja
   (ver `references/cliente-ejemplo.json`). **No inventes nada:** lo que no
   sepas, pregúntalo. "Lo que nos contaste" va con las palabras del cliente,
   no con las tuyas.
3. Los precios salen de la lista. Si el usuario quiere otro precio, que lo
   diga explícitamente, y anótalo en tu resumen.
4. Genera la hoja:

   ```bash
   node <esta-skill>/scripts/llenar.mjs <conocimiento>/kit/oferta.md ~/Argonauta/clientes/<cliente>/cliente.json ~/Argonauta/clientes/<cliente>
   ```

   El script se niega si falta un campo, calcula el 50 % y el inicio de la
   mensualidad (operación + 14 días), y avisa si la hoja no entra en una
   página.
5. Para el acuerdo: el plan y los precios tienen que ser **los mismos de la
   oferta**. Si cambiaron, que el usuario lo confirme.
6. Muestra la hoja al usuario para que la revise. **La manda él**, por el
   canal que use con el cliente.

## 3. Puerta: antes de entregar

Revisa cada punto y pon la evidencia al lado. "Creo que sí" no cuenta.

| Punto | Cómo se comprueba |
|---|---|
| Acuerdo firmado y primer 50 % pagado | Lo confirma el usuario |
| Revisión `lanzamiento` sin nada que "Bloquea" | El informe, de esta semana. Si no hay, corre la skill `lanzamiento` |
| Un respaldo se restauró completo | Fecha y resultado del simulacro (conteos por tabla iguales) |
| Datos de prueba borrados | Conteo de filas de prueba = 0. No leas datos de personas: cuenta |
| Todo en la casa del cliente | Correo, base, publicación y dominio a su nombre; Argonauta como miembro (`arranque/references/cuentas.md`) |
| Si es un producto: el cliente está en su `clientes/<cliente>.json` y su sitio apunta a su propia base | Decisión 0001: la verificación posterior al deploy en verde |
| Recorrido real en un celular | Una persona hizo el recorrido principal con datos reales |

Si algo falta, **no se genera el acta**: se dice qué falta y quién lo hace.
Lo que solo puede pasar el día de la entrega (2FA y teléfono del dueño en el
correo del proyecto, el sobre con los códigos de respaldo, la capacitación)
queda como casillas del acta para hacerlas en persona.

## 4. Acta

1. Genera `acta.pdf` igual que las otras hojas. Las casillas salen vacías a
   propósito: **se marcan a mano, juntos, el día de la entrega.**
2. Lo que no se cumplió ese día va en "Queda pendiente", con fecha.
3. Después de la firma, crea el **issue de seguimiento** en el repo del
   producto (o del proyecto), sin datos personales:
   - Título: `Seguimiento: <negocio>`.
   - Cuerpo: fecha de operación, inicio de la mensualidad, **primera
     auditoría** (operación + 3 meses, con la lista de `mantener.md`) y los
     pendientes con fecha.
   - Si `gh` no tiene sesión, deja el texto listo para que el usuario lo
     pegue.
4. Recuerda al usuario el recibo por honorarios del segundo 50 %.

## 5. Si el servicio termina

Sigue `flujo/mantener.md`, sección 6: datos en Excel para el cliente,
Argonauta fuera de sus cuentas, el cliente fuera de `clientes/` del producto,
el issue de seguimiento cerrado. Comprueba cada paso; quitar accesos lo hace
el usuario.

## Qué no hace

- **No manda mensajes ni firma**: prepara, y el usuario decide y envía.
- **No cobra ni emite recibos**: solo lo recuerda.
- **No inventa datos ni marca casillas** sin evidencia.
- **No es asesoría legal.** El acuerdo no lo revisó un abogado; si el cliente
  es grande o el monto alto, dilo.

## Al cerrar

Qué hoja se generó y dónde está, qué puntos de la puerta se cumplen y cuáles
no, y el siguiente momento con su fecha.
