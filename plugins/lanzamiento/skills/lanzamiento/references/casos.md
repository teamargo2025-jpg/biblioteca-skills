# Casos reales

Lo que encontró la revisión en proyectos que ya funcionaban, en octubre de
2026. Sirven para calibrar la gravedad: ninguno se veía desde la pantalla.

## Amira (gimnasio): datos de salud legibles por cualquiera — Bloquea

El portal del socio entra sin login, con un link que lleva su id. Las reglas
de lectura de las tablas del socio eran `using (true)` y `socios` tenía un
permiso por columnas (`id, nombre`) para `anon`. Con la clave pública
cualquiera podía listar a los 114 socios con su nombre y leer sus medidas
corporales, sus 5.854 series de entrenamiento, su dieta y sus citas.

Se veía como "bloqueada" con `select *`: el permiso por columnas engaña. Por
eso `acceso-anonimo.mjs` prueba columna por columna.

Arreglo (migraciones 025 y 026, en tres pasos sin cortar el servicio):
funciones `socio_leer_*` que reciben el id y devuelven solo sus filas, el
portal leyendo con ellas, y recién después cerrar las lecturas abiertas,
dejándole al personal su propia regla. Ver `cambios-en-produccion.md`.

## Volka (cafetería): pedidos con total inventado — Bloquea

La regla `pedidos_insert_public` deja crear un pedido sin sesión con estado
`pendiente`, y no hay nada en la base que recalcule el total desde los
precios. Desde la consola del navegador se puede mandar un pedido de 1 sol.
Saviare lo resuelve con un trigger (`pedidos_total_confiable`).

## Saviare (tienda): respaldo con datos de clientes en un repo público — Bloquea

El workflow de backup subía los pedidos (nombre, teléfono, dirección) como
artifact descargable de un repo **público**. Arreglo: cifrar la copia con
AES-256-GCM y una clave en un secreto (`scripts/cifrado-copia.mjs`), con dos
comprobaciones independientes de que nunca se sube en claro, y probar la
restauración completa en un proyecto aparte.

## Amira: código publicado que no estaba en GitHub — Antes de una semana

Cinco commits (seis mil líneas, nueve migraciones) publicados a mano con
`npm run deploy` y sin subir. Si se rompía el disco, se perdía el código de
lo que estaba en producción. Arreglo: subirlos y reemplazar el deploy manual
por uno automático al mezclar.

## Amira: respaldo con datos de salud sin cifrar en repo privado — Antes de una semana

Repo privado, así que no es público, pero son datos sensibles y el artifact
lo descarga cualquiera con acceso al repo. Cifrar como en Saviare.

## Volka: el botón del admin apunta a localhost — Mejora

`VITE_PANEL_CONTROL_URL` no estaba definida en producción y el valor por
defecto era `http://localhost:5174`. No expone nada, pero el botón no sirve.
Las variables que tienen valor por defecto de desarrollo hay que revisarlas
en el build de producción.

## Chincha-Inventario: el stock se edita sin historial — Antes de una semana

La regla de `update` sobre `productos` deja cambiar `cantidad` directamente,
saltándose `registrar_movimiento`, que es lo que deja el historial. Nadie
de afuera puede (hace falta sesión), pero un empleado sí, sin rastro.

## Gonthia (seguimiento de ventas): producción sin la última migración — Bloquea

Encontrado por la prueba de esta skill en una sesión nueva, el 9 de octubre
de 2026. Los 22 tests pasaban porque corren las cinco migraciones del repo,
pero en Supabase faltaba la 0005: no existían los avisos de plazo (la razón
de ser de la app), la pestaña Equipo no guardaba (Supabase no da error, el
cambio simplemente no se aplica) y cualquier usuario podía cambiar el estado
de una venta sin dejar historial. Además el backup nunca había corrido por
falta de un secreto. Se detectó pidiendo a la base real una tabla de la
0005 (`avisos_enviados`: no existe) y la Edge Function (404).
