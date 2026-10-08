---
name: arranque
description: Monta el esqueleto profesional de un proyecto web en su repositorio, nuevo o existente — CLAUDE.md, README, CI en cada PR, ESLint, Prettier, hooks de Claude Code, .gitignore/.gitattributes y la regla de dónde publicarlo — para que cada cambio pase por rama, PR y revisión automática. Úsala cuando digan "arranca el proyecto", "prepara el repo", "ponle el estándar a este proyecto", "deja este proyecto profesional", "configura CI / lint / formato", "aplica el método a X", o justo después de metis, cuando ya hay PROYECTO.md y falta el repo. También en inglés ("set up the repo", "add CI and linting", "bootstrap this project"). No la uses para definir la idea de un proyecto (eso es metis) ni para un cambio puntual dentro de un proyecto que ya tiene su estándar.
---

# Arranque

Arranque deja un repositorio con la base con la que todo proyecto profesional
debería nacer: reglas para Claude, documentación al día, y una máquina que
revisa cada cambio antes de que llegue a producción. Sale del piloto en
Saviare (octubre de 2026), donde se armó a mano y se comprobó en la realidad.

La idea que la ordena: **un estándar que depende de acordarse es una
intención; uno que la herramienta hace cumplir es un proceso.** Por eso casi
todo lo que deja son cosas que obligan (CI, hooks), no documentos que sugieren.

## Qué deja

| Capa | Archivos | Para qué |
|---|---|---|
| Base del repo | `.gitignore`, `.gitattributes`, `.env.example` | Claves fuera de git; mismos saltos de línea en Windows y en la CI |
| Calidad | `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, scripts `lint` / `format` / `test` | Errores y formato los revisa una máquina |
| Revisión automática | `.github/workflows/ci.yml`, plantilla de PR | Cada PR pasa lint, formato, tests y build antes del merge |
| Publicación | Workflow de deploy según `references/hosting.md` | Se publica solo al mezclar en `main`, con tests antes |
| Hooks de Claude Code | `.claude/settings.json`, `.claude/hooks/` | Formato al editar; tests antes de dar algo por terminado |
| Instrucciones | `CLAUDE.md`, `README.md` | Cualquier sesión de Claude y cualquier persona entienden el proyecto |

Los archivos listos para copiar están en `archivos/` (junto a este SKILL.md).
Las plantillas a completar, en `references/claude-md.md` y `references/readme.md`.

## Ritmo

| Paso | Qué haces | Toca el repo |
|---|---|---|
| 1. Diagnóstico | Lees el proyecto y muestras qué tiene y qué falta | No |
| 2. Decisiones | Pocas preguntas: solo lo que no puedes deducir | No |
| 3. Aplicar | Una rama, un commit por capa | Sí |
| 4. Verificar | Lint, formato, tests, build; hooks probados | — |
| 5. PR | Revisión, CI en verde, merge | — |

**Proyecto existente:** lee `references/lecciones.md` antes del paso 3. Ahí
están los errores que ya costaron tiempo, y casi todos muerden al tocar
código que ya funciona.

## 1. Diagnóstico

Sin tocar nada, revisa:

- **`PROYECTO.md`** (si viene de metis): alcance, stack, si es comercial, qué
  datos maneja. Es la fuente de las decisiones ya tomadas: no las vuelvas a
  preguntar.
- **`package.json`**: scripts, dependencias, si hay test runner.
- **Estructura**: dónde vive el código (`src/`, `scripts/`, otros), si hay
  tests, si hay base de datos (`supabase/`).
- **Git**: rama actual, cambios sin commitear, ramas viejas, si hay remoto.
- **Publicación**: qué workflow o configuración publica hoy el sitio, y dónde.

Muéstralo como tabla de ✅ / ❌ contra las capas de arriba.

**Repositorio vacío** (sin ningún commit, por ejemplo recién creado en
GitHub): un PR necesita una rama base contra la que compararse, y `main`
todavía no existe. Entonces:

1. Crea la base del proyecto con `npm create vite@latest . -- --template vanilla`
   (o la plantilla del stack elegido), más `.gitignore` y `.gitattributes`
   de `archivos/`, para que `node_modules/` nunca llegue a subirse.
2. Ese primer commit va **directo a `main`** y se sube. Es la única excepción
   a "todo por PR", y solo porque todavía no hay contra qué comparar.
3. Desde ahí, el resto del esqueleto va en una rama y por PR, como siempre.
   Así el primer PR ya muestra la CI corriendo.

Si hay cambios sin commitear, **no sigas**: pregunta qué hacer con ellos.
Mezclarlos con el esqueleto hace imposible revisar ninguna de las dos cosas.

## 2. Decisiones

No más de cuatro preguntas, y solo las que cambian lo que vas a hacer:

1. **¿Es comercial?** Aplica la regla de `references/hosting.md`: si un
   negocio gana dinero con el sistema o a alguien le pagan por hacerlo, es
   comercial y va a Cloudflare Pages. Si ya está publicado en un hosting que
   no lo permite, **dilo** y propón la mudanza como un PR aparte: no la
   mezcles con el esqueleto.
2. **¿Maneja datos personales de clientes?** Si sí, avisa que el backup
   cifrado y la revisión de qué se sube a dónde no son parte de este esqueleto:
   van en el paso de lanzamiento. No lo resuelvas a medias acá.
3. **Voz de los textos** (tú / usted, país), si el producto le habla a usuarios.
4. **Estilo de código**, solo en proyectos existentes: mide el estilo actual
   (comillas, punto y coma, ancho de línea) y ajusta `.prettierrc.json` para
   que el formateo cambie lo mínimo. No preguntes lo que puedes medir.

Todo lo demás va por defecto.

## 3. Aplicar

Trabaja en una rama (`feat/estandar`). **Un commit por capa**, en este orden:
cada uno se puede revisar solo y, si algo sale mal, se revierte solo.

1. **Base del repo.** `.gitattributes` tal cual. `.gitignore`: si ya existe,
   **fusiona**, no reemplaces. `.env.example` con los nombres de las
   variables que el código lee, sin valores reales. Comprueba con
   `git check-ignore` que `.env` y `.env.*` quedan fuera.
2. **Herramientas.**
   `npm install --save-dev eslint @eslint/js globals prettier eslint-config-prettier`
   (y `vitest` si no hay test runner). Copia `eslint.config.js` y ajusta sus
   rutas a la estructura real (qué corre en el navegador y qué en Node).
   Copia `.prettierrc.json` (ajustado en el paso 2) y `.prettierignore`.
   Agrega a `package.json` los scripts `lint` (`eslint .`), `format`
   (`prettier --write .`) y `format:check` (`prettier --check .`).
3. **Arreglos de ESLint**, solo los que no cambian el comportamiento. Lo que
   lo cambie se anota y va en otro PR. Revisa el diff línea por línea.
4. **Formateo** (proyecto existente): build y hash de `dist/assets` antes;
   `npm run format`; build y hash después. Tienen que ser idénticos. Commit
   propio, y otro con `.git-blame-ignore-revs` apuntando a él.
5. **Revisión automática.** Copia `.github/workflows/ci.yml` y, si el build
   necesita variables, descomenta y ajusta su bloque `env`. Copia
   `.github/pull_request_template.md`. Si ya existe un workflow de deploy,
   **no lo reemplaces**: solo asegúrate de que corra `npm test` antes del build.
   Si el proyecto es nuevo, usa `deploy-cloudflare.yml` (ver
   `references/hosting.md`). Cloudflare tiene que quedar configurado antes del
   primer merge, o el deploy de `main` sale en rojo: dilo antes del PR.
6. **Hooks.** Copia `.claude/settings.json` (si existe, fusiona los `hooks`) y
   `.claude/hooks/`. Ajusta `CARPETAS_DE_CODIGO` en `tests-al-terminar.mjs` a
   donde vive el código.
7. **Instrucciones.** `CLAUDE.md` con `references/claude-md.md` y `README.md`
   con `references/readme.md`. Cada línea se comprueba en el código antes de
   escribirla. Si ya hay README, actualízalo: no lo pises.

Si el proyecto no tiene ningún test, escribe uno de verdad sobre la lógica más
delicada que encuentres (dinero, fechas, permisos). Un test que no prueba nada
no protege nada.

Si al escribir esa lógica aparece una **decisión de negocio** (cómo se calcula
un precio o un margen, cómo se redondea, si se incluyen impuestos), no la
elijas en silencio: propón la opción con su porqué y pregunta. Es una decisión
del dueño del negocio, no del código. En la prueba de esta skill, la sesión
eligió bien "margen sobre el precio" y lo documentó, pero no lo preguntó.

## 4. Verificar

- `npm run lint`, `npm run format:check`, `npm test` y `npm run build`, en
  verde.
- **Hooks, con el JSON real** que manda Claude Code por la entrada estándar
  (arma el JSON con `JSON.stringify`, no a mano):
  - formatear: un archivo con mal formato queda formateado; uno de
    `.prettierignore` queda intacto.
  - tests al terminar: sin cambios de código no corre; con un test roto
    devuelve `"decision": "block"`; con `"stop_hook_active": true` avisa en vez
    de bloquear; con un cambio sano no dice nada.
- Proyecto existente: los hashes del build antes y después del formateo.

## 5. PR

Sube la rama y prepara la descripción: qué cambia, por qué y cómo se probó,
con los commits en orden para revisarlos uno a uno. Antes del merge:

- **La CI en verde.** Si hay tiempo, prueba que frena: un commit con un bug
  a propósito la pone en rojo, y un `git revert` la vuelve a verde.
- **Si hay un commit de formateo con `.git-blame-ignore-revs`: merge normal,
  nunca squash.**

Después del merge, la prueba final es **una sesión NUEVA** de Claude en el
repo: tiene que responder "¿cómo pruebo un cambio aquí?" sin investigar, y un
archivo que edite tiene que quedar formateado solo.

## Qué no hace

- **No cambia lógica del negocio.** Solo arreglos de ESLint sin cambio de
  comportamiento.
- **No muda el hosting** de un proyecto que ya publica: lo recomienda, y la
  mudanza es otro PR.
- **No configura backups ni revisa datos personales**: eso es del lanzamiento.
- **No toca migraciones de base de datos ya aplicadas.**
- **Nunca escribe claves**: ni en archivos que se suben ni en el chat.

## Al cerrar

Muestra la tabla del diagnóstico otra vez, con el antes y el después, y lo
que quedó fuera (con su porqué). Nombra el siguiente paso concreto: el
primer cambio real del proyecto, que ya pasará por el circuito completo.
