# biblioteca-skills

> Un sitio donde vivan las skills que de verdad sirven, compartido con un amigo, sin cargar con las cuarenta y siete que no.

*Última actualización: 6 de octubre de 2026*

## El problema

El punto de partida fue "quiero una biblioteca de skills". Al mirarlo de cerca resultó ser otra cosa: **había una sola skill**. Una biblioteca para un libro es una estantería vacía, y montar la estantería primero es la forma habitual de que los libros nunca se escriban.

El problema real son dos cosas distintas:

1. **No hay buenas herramientas.** Lo que se pidió no fue orden, fue *"buenas herramientas que me ayuden a optimizar tokens"*.
2. **El catálogo público es ruidoso y engaña.** Entre seis repositorios revisados había ~110 skills. Tres de esos repos hacían exactamente lo mismo entre sí. Uno anunciaba "8 skills con lógica contable" y en realidad eran ~50 de banca de inversión, con conectores de datos que cuestan miles de dólares al año. Cuatro de las skills que ofrecían ya venían instaladas de fábrica.

O sea: el trabajo no es guardar, es **filtrar**. Y hay una tensión que lo vuelve serio: la descripción de cada skill instalada se carga en **todas** las sesiones, se use o no. Instalar de más encarece cada conversación — justo lo contrario del objetivo.

## Para quién

Dos personas: yo y un amigo, ambos con Claude Code. No hay más usuarios, no hay que autenticar a nadie, no hay que moderar contribuciones. Eso permite que la "biblioteca" sea simplemente un repositorio de Git y no una aplicación.

## Qué hace la primera versión

**Ya está construida.** A día de hoy:

1. Un repositorio público que Claude Code reconoce como marketplace de plugins.
2. Cualquiera de los dos instala una skill con un comando, y recibe las actualizaciones al hacer `push`.
3. Tres skills dentro: `metis` (propia), `seo-audit` y `schema` (de terceros, MIT).
4. `scripts/nueva-skill.mjs`, que crea el andamiaje de una skill nueva y la registra.
5. Un criterio escrito en el README de qué hace buena a una skill y por qué conviene tener pocas.

## Qué NO hace (por ahora)

| Queda fuera | Por qué |
|---|---|
| **Catálogo web para navegar skills** | Para tres skills y dos personas, la tabla del README lo hace mejor |
| **Buscador, etiquetas, estadísticas de uso** | Son problemas de tener cuarenta skills. Hay tres |
| **Versionado e instalador propios** | Git y el sistema de plugins ya hacen las dos cosas |
| **Sincronizar el repo con `~/.claude/skills/`** | Hoy se copia a mano. Se automatiza cuando moleste de verdad, no antes |
| **Aceptar contribuciones de fuera** | Son dos personas que hablan entre sí |

## Cómo sabremos que funcionó

**La señal, dentro de un mes:** que al menos un cambio real en Saviare haya salido de una de estas skills — un arreglo de SEO aplicado, unos datos estructurados puestos en las fichas de producto — y que el amigo tenga al menos una instalada y la haya usado.

Si dentro de un mes el repositorio está igual y nadie ha ejecutado nada, es una estantería bonita. Esa es la señal de fracaso, y es más probable que cualquier fallo técnico.

## Restricciones

- **Tiempo:** amplio, sin plazo externo.
- **Equipo:** dos personas, con Claude Code como asistencia.
- **Presupuesto:** cero. Todo cabe en GitHub y en el sistema de plugins.
- **Lo que sí cuesta:** contexto. Cada skill instalada se paga en todas las sesiones.

### Arquitectura elegida

| Pieza | Qué se usa | Por qué |
|---|---|---|
| La biblioteca | Repositorio de Git como marketplace de plugins | Claude Code ya trae el mecanismo. No hay nada que construir |
| Distribución | `.claude-plugin/marketplace.json` + un plugin por skill | **Un plugin por skill** permite instalar solo lo que cada uno usa. Es la decisión que protege el presupuesto de tokens |
| Skills de terceros | Se copian con su `LICENSE` | El repo de origen mete sus ~50 skills en un plugin único: es todo o nada |
| Skills oficiales de Anthropic | **No se copian**, se instalan de su marketplace | Así llegan sus actualizaciones y no hay que arrastrar atribuciones |
| Uso en la máquina propia | Copia en `~/.claude/skills/` | Funciona sin pasar por plugins. El precio es mantener dos copias |

## Riesgos y supuestos

| Qué asumimos / qué puede fallar | Impacto | Cómo lo comprobamos barato |
|---|---|---|
| **Se llena la estantería y nunca se usa** | **Alto — es el modo de fallo real de este proyecto**, no lo técnico | La fase 2 no añade ni una skill: solo las usa. Si en una semana no sale nada, el problema es de raíz |
| Las dos copias (repo y `~/.claude/skills/`) se desincronizan | Medio: se edita una y la otra se queda vieja, sin aviso | Un script de sincronización en la fase 3. Mientras tanto, editar siempre en el repo |
| Las skills copiadas se quedan atrás respecto al original | Bajo: no cambian a menudo | Revisar el repo de origen cada pocos meses |
| Las skills de terceros asumen contexto estadounidense y están en inglés | Medio: `copywriting` se descartó justo por esto | Al usarlas: si hay que traducir demasiado, mejor escribir una propia |
| Cada skill nueva encarece todas las sesiones | Medio, y crece con el tiempo | Fase 3: mirar cuáles no se han disparado nunca y desinstalarlas |
| **No sabemos si `metis` es buena** | Medio: es la única propia y nunca se midió | `skill-creator` corre la misma tarea con y sin la skill y compara. Cuesta una tarde |

## Decisiones tomadas

- **Un plugin por cada skill**, en vez de un paquete único. Es algo más de estructura, pero es lo que permite instalar selectivamente — y como cada descripción instalada se paga en todas las sesiones, instalar de menos es ahorrar tokens.
- **Copiar 2 de ~50 en vez de añadir el marketplace de origen entero.** Allí las ~50 van en un solo plugin: instalarlo son cincuenta descripciones cargando siempre.
- **Las oficiales de Anthropic no se copian, se instalan.** Sin atribuciones que mantener y con actualizaciones automáticas.
- **Una sola skill de diseño, no tres.** `taste-skill`, `ui-ux-pro-max` y `frontend-design` atacan lo mismo; tener las tres es pagar tres veces y darle a Claude tres criterios distintos. Se eligió la oficial.
- **Repositorio público**, y el correo personal fuera del manifiesto.
- **Un solo repositorio de skills (6 de octubre de 2026).** Existía un segundo repo, `claude-skills` (plano, una carpeta por skill, instalación copiando a mano), creado el 22 de septiembre con las mismas skills: `metis`, `schema` y `seo-audit` eran copias idénticas byte a byte. Se eliminó y se conservó este, porque el mecanismo de marketplace permite instalar skill por skill y recibir actualizaciones — las dos cosas que harán falta cuando la biblioteca crezca. Aquel repo aportaba además una copia de `frontend-design`, que aquí no se incorpora: sigue vigente la decisión de instalar las oficiales de Anthropic desde su marketplace en vez de copiarlas.
- **Descartados y por qué:** legal y finanzas (son para despachos y bancas de inversión, y dependen de conectores de datos institucionales); docx/pdf/pptx/xlsx (ya vienen instaladas); la mayoría de `social-media-skills` (13 de 20 son de LinkedIn B2B); `copywriting` (sus ejemplos son Slack y "Start Free Trial", y aquí se vende shampoo sólido por WhatsApp).

## Preguntas abiertas

| Pregunta | Cuándo hace falta |
|---|---|
| ¿`biblioteca-skills` se queda como nombre? | Cuanto antes: cambiarlo hoy es renombrar tres cosas; con el amigo ya usándolo, cuesta más |
| ¿`reels-scripting` entra? | Solo si se hacen Reels para Saviare |
| ¿Se adapta `copywriting` al español y a venta al público, o se escribe una propia? | Después de la fase 2, cuando se sepa qué falta de verdad |
| ¿Es buena `metis`? | Fase 3 |

---

## Plan por fases

### Fase 0 — La estantería ✅ *hecha*

Repositorio como marketplace, `metis` empaquetada, script de andamiaje, README con el criterio.
**Terminó cuando:** los manifiestos validaron y el script creó una skill de prueba correctamente.

### Fase 1 — Los primeros libros ✅ *hecha*

**Terminó cuando:** el marketplace quedó publicado y accesible en GitHub con tres skills dentro.

- [x] Revisar seis repositorios y filtrar ~110 skills
- [x] Copiar `seo-audit` y `schema` conservando su licencia MIT
- [x] Publicar el repositorio
- [x] Instalar las tres en la máquina propia

### Fase 2 — Usarlas de verdad

**Objetivo:** comprobar que esto sirve antes de añadir nada más. Es deliberado que esta fase **no incorpore ni una skill**.
**Duración estimada:** 1 semana de uso, unas 3-4 horas de trabajo real
**Terminó cuando:** hay al menos un cambio aplicado a Saviare que salió de una de estas skills, y el amigo tiene una instalada y la ha usado.

- [ ] Correr `seo-audit` sobre Saviare y quedarse con los tres hallazgos de mayor impacto
- [ ] Aplicar al menos uno
- [ ] Usar `schema` para poner datos estructurados de producto en el catálogo
- [ ] Validar con el Rich Results Test de Google
- [ ] Instalar `frontend-design` y usarla en una pantalla real
- [ ] Pasarle el repositorio al amigo y ver si instala sin ayuda
- [ ] Anotar de cada skill: ¿aportó método, o dijo lo que ya sabías?

### Fase 3 — Cerrar el círculo

**Objetivo:** que la biblioteca se mantenga sola y no engorde sin darse cuenta.
**Duración estimada:** 2 días
**Terminó cuando:** un comando sincroniza repo y `~/.claude/skills/`, y está decidido por escrito qué se queda y qué se desinstala.

- [ ] Script de sincronización en ambos sentidos
- [ ] Revisar qué skills no se han disparado nunca y desinstalarlas
- [ ] Medir `metis` con `skill-creator`: la misma tarea con y sin ella
- [ ] Corregir `metis` con lo que salga

### Fase 4 — Skills propias

Sin fecha. Es el destino natural del proyecto: las skills que valen para este trabajo concreto no están en ningún repositorio público, porque nacen de lo que uno repite. Candidatas anotadas: copy de producto en español para Saviare, revisión previa al commit, despliegue.

Se detalla cuando la fase 2 diga qué falta de verdad. Escribirlas antes sería inventar necesidades.
