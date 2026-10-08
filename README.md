# biblioteca-skills

Skills de Claude Code, compartidas. Cada skill es un plugin independiente: se instalan una por una, no en bloque.

## Instalar

Dentro de Claude Code, una sola vez por máquina:

```
/plugin marketplace add teamargo2025-jpg/biblioteca-skills
```

Después, una por skill:

```
/plugin install metis@biblioteca-skills
```

Desde la terminal es equivalente:

```bash
claude plugin marketplace add teamargo2025-jpg/biblioteca-skills
claude plugin install metis@biblioteca-skills
```

Cuando se publiquen cambios, quien ya tenga el marketplace añadido los recibe al actualizar; no hay que reinstalar.

> También funciona desde una copia local, sin pasar por GitHub: `/plugin marketplace add /ruta/al/repo`.

### Sin plugins, copiando la carpeta

Una skill suelta funciona con solo copiarla a `~/.claude/skills/`. La carpeta a copiar es la de dentro del plugin:

```bash
cp -r plugins/metis/skills/metis ~/.claude/skills/
```

El precio es que así no llegan las actualizaciones: hay que volver a copiar a mano tras cada `git pull`.

## Skills disponibles

| Skill | Qué hace | Cuándo se dispara |
|---|---|---|
| **metis** | Convierte la idea de un proyecto nuevo en un documento con alcance, arquitectura, riesgos y roadmap por fases | Al traer una idea sin definir, o con `/metis` |
| **arranque** | Monta el esqueleto profesional de un repo, nuevo o existente: CLAUDE.md, README, CI en cada PR, ESLint, Prettier, hooks de Claude Code y dónde publicarlo según si es comercial | Al decir "arranca el proyecto", "ponle el estándar", "configura CI y lint", o justo después de metis |
| **seo-audit** | Audita el sitio en cinco frentes —indexación, rendimiento, on-page, contenido y autoridad— y devuelve cada hallazgo como problema → impacto → evidencia → arreglo → prioridad | Al hablar de SEO, posicionamiento, caídas de tráfico o Core Web Vitals |
| **schema** | Datos estructurados JSON-LD para que Google muestre precio, stock y estrellas en los resultados | Al hablar de schema, datos estructurados, rich snippets o fichas de producto |

### Skills de fuera que conviene instalar aparte

No están en este repositorio porque son oficiales de Anthropic: se instalan desde su propio marketplace y así llegan sus actualizaciones.

| Skill | Qué hace | Cómo |
|---|---|---|
| **frontend-design** | Le da criterio visual a Claude —tipografía, paleta, composición— para que no produzca la interfaz genérica de siempre | `/plugin marketplace add anthropics/claude-plugins-official` y después `/plugin install frontend-design@claude-plugins-official` |

## Añadir una skill nueva

```bash
node scripts/nueva-skill.mjs <nombre-en-kebab-case> "Descripción de una línea"
```

Eso crea el plugin, el esqueleto de la skill y la registra en el marketplace. Después queda escribir el contenido en `plugins/<nombre>/skills/<nombre>/SKILL.md`, añadir una fila a la tabla de arriba, y hacer commit.

### Qué hace buena a una skill

- **La descripción lo es todo.** Es lo único que Claude lee para decidir si usarla, así que debe decir *qué hace* y *en qué situaciones*, con las frases reales que usaría alguien al pedirlo. Una descripción vaga produce una skill que nunca se activa.
- **Explica el porqué, no solo el qué.** Las instrucciones que razonan ("esto importa porque...") funcionan mejor que las listas de reglas en mayúsculas.
- **Corta.** Menos de 500 líneas en `SKILL.md`. Lo que sea largo o de consulta ocasional va a `references/` y se lee solo cuando hace falta.
- **Pruébala.** `skill-creator` (de las skills de Anthropic) permite correr la misma tarea con y sin la skill y comparar los resultados. Sirve para saber si aporta algo o solo ocupa espacio.

## Sobre el costo en tokens

La descripción de cada skill instalada se carga en **todas** las sesiones, se use o no. Una biblioteca grande no es gratis: encarece cada conversación.

De ahí dos decisiones de este repositorio:

1. **Un plugin por skill**, para instalar solo lo que cada uno usa de verdad.
2. **Descripciones precisas pero breves** — lo justo para que se dispare cuando toca y no cuando no.

Si una skill lleva meses instalada y nunca se activa, desinstalarla ahorra tokens en cada sesión.

## Estructura

```
.claude-plugin/marketplace.json   catálogo: qué plugins existen
plugins/<nombre>/
  .claude-plugin/plugin.json      metadatos del plugin
  skills/<nombre>/
    SKILL.md                      la skill
    references/                   material que se lee solo cuando hace falta
scripts/nueva-skill.mjs           andamiaje para añadir una skill
```

## Origen y licencias

`seo-audit` y `schema` vienen de [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills), © 2025 Corey Haines, bajo licencia MIT. Cada una conserva su `LICENSE` dentro de su carpeta, como exige esa licencia.

Se copiaron en vez de añadir su marketplace entero porque allí las ~50 skills van en un solo plugin: es todo o nada, y cincuenta descripciones cargando en cada sesión es justo lo que este repositorio intenta evitar.

El precio de copiarlas es que no llegan sus actualizaciones. Para volver a sincronizarlas, clona el repo original y sustituye la carpeta de la skill.

Sus descripciones mencionan skills hermanas que aquí no existen (`ai-seo`, `programmatic-seo`). Es inofensivo —solo son remisiones— pero explica por qué a veces Claude las nombra.

El resto de skills son propias, sin licencia de terceros.
