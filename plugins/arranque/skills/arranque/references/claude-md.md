# Plantilla de CLAUDE.md

El `CLAUDE.md` es lo que Claude lee al abrir **cada** sesión en el repo. No es
documentación para personas (eso es el README): es cómo se trabaja en este
proyecto, qué no se toca sin preguntar y cuándo un cambio está terminado.

## Reglas

- **Corto: menos de ~100 líneas.** Se carga en cada sesión y ocupa contexto.
  Si crece, algo sobra o va a `docs/`.
- **Sale del código, no de la memoria.** Cada línea se escribe después de
  comprobarla en el repo: comandos en `package.json`, rutas que existen,
  decisiones que se ven en el código. Un `CLAUDE.md` con un dato falso es
  peor que no tenerlo, porque Claude lo cree.
- **Explica el porqué de las zonas delicadas.** "No mover el descuento de
  stock al navegador, porque dos ventas simultáneas se pisarían" se respeta;
  "no tocar X" a secas, no.
- **Nada de secretos.** Ni claves ni contraseñas, ni siquiera de ejemplo con
  forma real.
- **Se prueba:** una sesión NUEVA de Claude en el repo tiene que responder
  "¿cómo pruebo un cambio aquí?" sin ponerse a investigar.

## Plantilla

Las secciones que no apliquen se borran. Los `<...>` se completan leyendo el
proyecto.

```markdown
# <Nombre del proyecto>

<Qué es, para quién, en dos o tres líneas. Dónde está publicado.>

## Comandos

- `npm run dev`: <servidor local en ...>
- `npm test`: tests con <Vitest / ...>
- `npm run lint`: ESLint
- `npm run format`: formatea con Prettier (`format:check` solo revisa)
- `npm run build`: <qué hace; qué variables necesita>

## Cómo está armado

- **<Pieza>:** <dónde vive y cómo funciona, en una o dos líneas>
- **Datos:** <de dónde salen; qué archivos NO son la fuente aunque lo parezcan>
- **Despliegue:** <workflow, cuándo publica; corre los tests antes>
- **CI de los PR:** `.github/workflows/ci.yml` corre lint, formato, tests y
  build en cada PR hacia `main`. No mezclar un PR con la revisión en rojo.
- **Hooks de Claude Code** (`.claude/settings.json`): cada archivo editado se
  formatea con Prettier, y antes de terminar se corren los tests si cambió el
  código. Si un hook bloquea, arreglar la causa; no desactivarlo.

## Zonas delicadas: pregunta antes de tocar

- **<Zona>:** <qué es y por qué es delicada>
- **Secretos:** `.env` nunca se sube. <Qué claves existen y dónde viven,
  sin sus valores.>

## Convenciones

- Cada cambio va en una rama `feat/`, `fix/` o `docs/` y entra a `main` por PR.
  Nada directo a `main`.
- Commits en español y en infinitivo, diciendo qué cambia y por qué.
- Los comentarios del código explican el porqué, no el qué.
- <Voz del producto, si tiene textos para el usuario: tú / usted, país.>

## Un cambio está terminado cuando

1. `npm run lint` y `npm test` pasan, y el código está formateado.
2. `npm run build` pasa.
3. Se probó en el navegador, también a ancho de celular.
4. <Si hay base de datos: la migración está en su carpeta y se avisó que hay
   que correrla.>
```

## Qué buscar en un proyecto existente para llenar "zonas delicadas"

- Políticas de acceso a datos (RLS en Supabase) y migraciones ya aplicadas.
- Lógica de dinero: precios, totales, stock, pagos.
- Lo que genera archivos para buscadores (prerender, sitemap).
- Datos personales de clientes: dónde se guardan y si hay copia.
- Cualquier cosa con un comentario largo en el código explicando una decisión:
  ese comentario es una zona delicada que alguien ya defendió.
