#!/usr/bin/env node
// Andamiaje para una skill nueva: crea el plugin, el esqueleto de la skill
// y la registra en el marketplace.
//
//   node scripts/nueva-skill.mjs mi-skill "Qué hace y cuándo usarla"

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

const [nombre, descripcion] = process.argv.slice(2);

if (!nombre || !descripcion) {
  console.error('Uso: node scripts/nueva-skill.mjs <nombre-kebab-case> "Descripción de una línea"');
  process.exit(1);
}

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(nombre)) {
  console.error(`"${nombre}" no es kebab-case. Usa minúsculas y guiones: mi-skill`);
  process.exit(1);
}

const destino = join(raiz, "plugins", nombre);
if (existsSync(destino)) {
  console.error(`Ya existe plugins/${nombre}. Elige otro nombre o edita el que hay.`);
  process.exit(1);
}

const manifiestoPath = join(raiz, ".claude-plugin", "marketplace.json");
const manifiesto = JSON.parse(readFileSync(manifiestoPath, "utf8"));
const autor = manifiesto.owner?.name ?? "";

mkdirSync(join(destino, ".claude-plugin"), { recursive: true });
mkdirSync(join(destino, "skills", nombre, "references"), { recursive: true });

writeFileSync(
  join(destino, ".claude-plugin", "plugin.json"),
  JSON.stringify({ name: nombre, description: descripcion, version: "1.0.0", author: { name: autor } }, null, 2) + "\n",
);

writeFileSync(
  join(destino, "skills", nombre, "SKILL.md"),
  `---
name: ${nombre}
description: ${descripcion}
---

# ${nombre}

<!--
La descripción de arriba es lo único que Claude lee para decidir si usa esta
skill. Debe decir qué hace y en qué situaciones, con las frases que usaría
alguien de verdad al pedirlo.

Aquí abajo van las instrucciones. Explica el porqué de cada cosa: las skills
que razonan funcionan mejor que las que solo mandan. Menos de 500 líneas; lo
largo o de consulta ocasional va a references/ y se lee solo cuando hace falta.
-->
`,
);

manifiesto.plugins.push({
  name: nombre,
  source: `./plugins/${nombre}`,
  description: descripcion,
  version: "1.0.0",
  author: { name: autor },
});
writeFileSync(manifiestoPath, JSON.stringify(manifiesto, null, 2) + "\n");

console.log(`Listo: plugins/${nombre}`);
console.log(`Escribe la skill en  plugins/${nombre}/skills/${nombre}/SKILL.md`);
console.log(`Y añade su fila a la tabla del README.`);
