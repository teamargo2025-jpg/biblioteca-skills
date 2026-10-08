# Cambiar permisos en una base que ya está en uso

Cerrar un agujero de permisos rompe la app que dependía de él. Si la app ya
la usan personas, el arreglo no puede dejarla caída "un ratito": se hace en
pasos que se pueden comprobar uno por uno. Así se cerró la lectura abierta de
Amira (migraciones 025 y 026) sin que ningún socio lo notara.

## Los tres pasos

1. **Agregar lo nuevo, sin quitar nada** (migración A). Funciones que
   devuelven solo lo de quien las llama, una regla nueva para el personal,
   lo que haga falta. La app vieja sigue funcionando igual.
2. **Publicar la app que usa lo nuevo** (PR). Con lo viejo todavía abierto,
   así que si algo falla, no se nota.
3. **Cerrar lo viejo** (migración B). Recién acá desaparece el agujero.

Las dos migraciones van en el mismo PR, pero la B se corre **después** del
merge, y su encabezado lo dice.

## Comprobar cada paso sin tocar datos de nadie

- **Antes del merge**, con la migración A ya corrida: correr contra la base
  real **todas las consultas que hace la app nueva**, con un id inventado
  (`00000000-0000-0000-0000-000000000000`). Devuelven vacío, pero si una
  consulta está mal escrita (una columna, una relación, un orden) da error.
  En Amira apareció así un `.order()` que la API rechazaba, antes de que lo
  viera un socio.
- **Que lo nuevo devuelve lo mismo que lo viejo**: tomar un id que tenga
  datos y comparar **solo cuántas filas** devuelve la función contra cuántas
  hay en la tabla para ese id. Contar no expone a nadie.
- **Después del merge**: que una persona abra la app con un usuario de prueba
  (o el suyo) y recorra las pantallas afectadas, también la del personal.
- **Después de la migración B**: volver a correr `acceso-anonimo.mjs` y las
  consultas con id inventado.

## Tests

Un test que reproduzca el agujero y que **falle sin la migración B**: el
esquema completo en PGlite, con `anon` y `authenticated` simulados, y
consultas como `anon` que antes devolvían filas. Comprobar que falla
quitando la migración B un momento. Ver
`src/js/lecturas-del-socio.test.js` de Amira.

## Lo que no se hace

- Leer datos de personas reales para "ver si funciona": se cuentan filas o
  se usan ids inventados.
- Correr la migración B antes de que la app nueva esté publicada.
- Mezclar el cierre con otros cambios: si hay que deshacerlo, que se pueda
  deshacer solo.
