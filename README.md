# biblioteca-skills

Skills de Claude Code, compartidas. Cada skill es un plugin independiente: se instalan una por una, no en bloque.

## Instalar

Dentro de Claude Code, una sola vez por máquina:

```
/plugin marketplace add spin6/biblioteca-skills
```

Después, una por skill:

```
/plugin install metis@biblioteca-skills
```

Desde la terminal es equivalente:

```bash
claude plugin marketplace add spin6/biblioteca-skills
claude plugin install metis@biblioteca-skills
```

> Reemplaza `spin6/biblioteca-skills` por el `usuario/repo` real de GitHub cuando esté publicado. Mientras el repo sea solo local, funciona con la ruta: `/plugin marketplace add C:/Users/spin6/Proyectos/biblioteca-skills`.

Cuando se publiquen cambios, quien ya tenga el marketplace añadido los recibe al actualizar; no hay que reinstalar.

## Skills disponibles

| Skill | Qué hace | Cuándo se dispara |
|---|---|---|
| **metis** | Convierte la idea de un proyecto nuevo en un documento con alcance, arquitectura, riesgos y roadmap por fases | Al traer una idea sin definir, o con `/metis` |

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
