# Lecciones del piloto en Saviare

Errores reales del 6 y 7 de octubre de 2026, con lo que los evita. Leer antes
de aplicar el esqueleto a un proyecto **existente**: ahí es donde muerden.

## Al formatear un proyecto existente

- **Demostrar que el formato no cambió el sitio.** Antes de formatear, hacer
  un build y guardar el hash (sha256) de cada `.js` y `.css` de `dist/assets`.
  Después de formatear, repetir. Si son idénticos byte a byte, el cambio es
  solo estético. En Saviare: 28 archivos reformateados, sitio publicado
  idéntico.
- **Formatear en un commit propio**, sin mezclar con nada más, y anotar su id
  en `.git-blame-ignore-revs` para que `git blame` lo salte:

      # Formatear todo con Prettier
      <id completo del commit>

  y `git config blame.ignoreRevsFile .git-blame-ignore-revs`.
- **Ese PR se mezcla con merge normal, NUNCA con squash**: el squash crea un
  commit nuevo con otro id y `.git-blame-ignore-revs` queda apuntando a un
  commit que no existe.
- **HTML con texto en línea: fuera del primer formateo** (va en
  `.prettierignore`). Prettier reacomoda espacios entre etiquetas y eso puede
  cambiar cómo se ve una página. Se incorpora después, revisando cada página.

## Al arreglar lo que marca ESLint

- **Solo arreglos sin cambio de comportamiento** en el PR del esqueleto: un
  `catch (error)` sin usar pasa a `catch { }`, un parámetro sin usar pasa a
  `_nombre`. Lo que cambie el comportamiento va en otro PR.
- **Revisar el diff línea por línea antes del commit**, aunque los tests
  pasen. En Saviare, un reemplazo automático dejó la palabra "FEFF" en lugar
  del carácter invisible BOM del CSV del historial, y ningún test lo vio porque
  esa función no tenía test.
- **Caracteres invisibles** (BOM `﻿` y similares): escribirlos como
  secuencia de escape visible (`﻿`) para que ESLint no los marque y se
  lean en el código. Cuidado: algunas herramientas de edición convierten
  `﻿` en el carácter real; verificar el resultado.

## Al reemplazar texto en muchos archivos

- **Mapa explícito palabra por palabra**, nunca una regla general.
- **Solo palabras completas, con tildes**: `\b` no entiende tildes. Usar
  `(?<!\p{L})palabra(?!\p{L})` con el flag `u`. En Saviare, un "sos" → "eres"
  sin límites de palabra convirtió "Sostenibilidad" en "Erestenibilidad" y la
  clase CSS `estado-pasos` en `estado-paeres`.
- **Probar la regla antes de tocar archivos**: un caso de prueba al principio
  del script ("Sostenibilidad" debe quedar igual) frenó el segundo intento
  cuando el patrón no compilaba.
- Escribir esos scripts en un archivo, no en una línea de la terminal: las
  barras invertidas se pierden entre capas de comillas.

## Windows

- **Saltos de línea**: con `core.autocrlf` los archivos bajan con CRLF y
  Prettier, que escribe LF, los marca a todos como mal formateados.
  `.gitattributes` con `* text=auto eol=lf` lo resuelve en todas las máquinas.
- **Sin `jq`**: los hooks van en Node, no en bash con `jq`. Así funcionan igual
  en Windows, Mac y Linux.
- **`npm` desde Node necesita shell** en Windows (es un `.cmd`): pasarlo como un
  solo string (`spawnSync('npm test', { shell: true })`), no como lista de
  argumentos.
- **Rutas en JSON**: las barras invertidas de Windows se pierden si el JSON se
  arma a mano en la terminal. Armarlo con `JSON.stringify`.

## Hooks

- **Probarlos con el JSON real** que manda Claude Code, por la entrada estándar,
  antes de confiar en ellos. Casos del hook de tests: sin cambios de código
  (no corre), con un bug (bloquea), con un bug tras un reintento (avisa en vez
  de bloquear, para no entrar en un bucle) y con un cambio sano (deja
  terminar).
- **La prueba final es una sesión NUEVA** en el repo: la sesión que los creó
  no carga la configuración de otra carpeta.

## CI y tests

- **Que la CI pruebe que frena**: un commit con un bug a propósito en una rama
  del PR tiene que poner la revisión en rojo. Después, `git revert` (no borrar
  el commit) y el PR vuelve a verde.
- **Si el proyecto no tiene tests**, `vitest run` falla por no encontrar
  ninguno. Agregar al menos un test real de la lógica más delicada (dinero,
  fechas) en vez de silenciar el error con `--passWithNoTests`.

## Datos y claves

- **Nunca pegar claves en el chat.** Van en archivos `.env.*` que Git ignora.
  Verificar con `git check-ignore` que de verdad quedan fuera **antes** de
  escribirles un valor.
- **Repo público + datos de clientes**: cualquier artifact de GitHub Actions
  se puede descargar. Nada con datos personales se sube sin cifrar.
