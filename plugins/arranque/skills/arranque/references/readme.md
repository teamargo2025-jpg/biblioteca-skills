# Plantilla de README

El README es para **personas**: el compañero que llega, el cliente, uno mismo
en seis meses. Responde qué es esto, cómo lo levanto y cómo se publica.
Lo que es instrucción de trabajo para Claude va en `CLAUDE.md`, no acá.

## Reglas

- **Verdad de hoy.** Cada afirmación se comprueba en el código. El error típico
  (pasó en Saviare) es un README que describe la primera versión del proyecto
  y miente sobre la actual.
- **Comandos que se pueden copiar y funcionan**, en el orden en que se usan.
- **Nunca valores de claves**: solo el nombre de la variable y de dónde sale.

## Plantilla

```markdown
# <Nombre>

<Qué es y para quién, en dos o tres líneas.>

**En línea:** <URL>

## Cómo está armado

| Pieza | Qué es |
|---|---|
| <Interfaz> | <...> |
| <Datos> | <...> |
| Publicación | <hosting, automática desde GitHub Actions> |

## Levantar en local

    npm install
    cp .env.example .env    # y completar <qué variables, de dónde salen>
    npm run dev

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | <...> |
| `npm test` | Tests |
| `npm run lint` | ESLint |
| `npm run format` | Formatea con Prettier |
| `npm run build` | <...> |

## Publicación

<Qué workflow publica, cuándo, qué secretos necesita.>

## Cómo se trabaja

- Cada cambio va en una rama y entra a `main` por Pull Request.
- En cada PR, la CI corre lint, formato, tests y build.
- `CLAUDE.md` tiene las reglas del proyecto para Claude Code.
```
