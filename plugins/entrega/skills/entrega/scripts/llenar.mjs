#!/usr/bin/env node
// Llena una hoja del kit (oferta, acuerdo o acta) con los datos de un cliente
// y la deja lista para mandar: .md, .html y, si hay Chrome o Edge, .pdf.
//
//   node llenar.mjs <plantilla.md> <cliente.json> <carpeta-de-salida>
//
// cliente.json tiene una sección "comun" y una por hoja ("oferta", "acuerdo",
// "acta"); para cada hoja se usan "comun" + su sección. Una lista se escribe
// como lista si el campo ocupa su propia línea, y separada por comas si va
// dentro de una frase.
//
// Se niega a generar si falta un campo o está vacío: una hoja con un hueco
// no se le manda a nadie.

import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, rmSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const [plantillaRuta, datosRuta, salidaDir] = process.argv.slice(2);
if (!plantillaRuta || !datosRuta || !salidaDir) {
  console.error("Uso: node llenar.mjs <plantilla.md> <cliente.json> <carpeta-de-salida>");
  process.exit(1);
}

const hoja = basename(plantillaRuta, ".md");
const plantilla = readFileSync(plantillaRuta, "utf8");
const todo = JSON.parse(readFileSync(datosRuta, "utf8"));
const datos = { ...(todo.comun ?? {}), ...(todo[hoja] ?? {}) };
calcular(datos);

// 1. Campos: todos presentes y con contenido.
const campos = [...new Set([...plantilla.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
const faltan = campos.filter((c) => vacio(datos[c]));
if (faltan.length) {
  console.error(`No se generó ${hoja}: faltan o están vacíos estos campos en "comun" o "${hoja}":`);
  for (const c of faltan) console.error(`  - ${c}`);
  process.exit(1);
}

// 2. Reemplazo.
const md = plantilla
  .split("\n")
  .map((linea) => {
    const sola = linea.trim().match(/^\{\{(\w+)\}\}$/);
    if (sola && Array.isArray(datos[sola[1]])) return datos[sola[1]].map((v) => `- ${v}`).join("\n");
    return linea.replace(/\{\{(\w+)\}\}/g, (_, c) =>
      Array.isArray(datos[c]) ? datos[c].join(", ") : String(datos[c]),
    );
  })
  .join("\n");

// 3. Salida.
mkdirSync(salidaDir, { recursive: true });
const base = join(resolve(salidaDir), hoja);
writeFileSync(`${base}.md`, md);
const titulo = (md.match(/^# (.+)$/m) ?? [, hoja])[1];
writeFileSync(`${base}.html`, envolver(titulo, aHtml(md)));
console.log(`Listo: ${base}.md`);
console.log(`Listo: ${base}.html`);

const navegador = buscarNavegador();
if (!navegador) {
  console.log("No encontré Chrome ni Edge: abre el .html y usa Imprimir → Guardar como PDF.");
} else {
  const perfil = mkdtempSync(join(tmpdir(), "entrega-"));
  try {
    execFileSync(
      navegador,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        `--user-data-dir=${perfil}`,
        `--print-to-pdf=${base}.pdf`,
        pathToFileURL(`${base}.html`).href,
      ],
      { stdio: "ignore", timeout: 60000 },
    );
  } finally {
    rmSync(perfil, { recursive: true, force: true });
  }
  if (existsSync(`${base}.pdf`)) {
    const paginas = (readFileSync(`${base}.pdf`, "latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
    console.log(`Listo: ${base}.pdf (${paginas} página${paginas === 1 ? "" : "s"})`);
    if (paginas > 1) console.log("AVISO: la hoja debería entrar en una página. Acorta los textos del cliente.");
  } else {
    console.log("El navegador no generó el PDF: abre el .html y usa Imprimir → Guardar como PDF.");
  }
}

// ---------------------------------------------------------------------------

function vacio(v) {
  if (v === undefined || v === null) return true;
  if (Array.isArray(v)) return v.length === 0 || v.some((x) => String(x).trim() === "");
  return String(v).trim() === "";
}

function soles(n) {
  return n.toLocaleString("es-PE", { maximumFractionDigits: 2 });
}

// Campos que se deducen de otros, para no escribir dos veces lo mismo (y no
// equivocarse en una de las dos).
function calcular(d) {
  if (vacio(d.mitad_implementacion) && !vacio(d.precio_implementacion)) {
    const n = Number(String(d.precio_implementacion).replace(/[^\d.]/g, ""));
    if (n > 0) d.mitad_implementacion = soles(n / 2);
  }
  if (vacio(d.fecha_inicio_mensualidad) && /^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha_operacion ?? ""))) {
    const f = new Date(`${d.fecha_operacion}T12:00:00`);
    f.setDate(f.getDate() + 14);
    d.fecha_inicio_mensualidad = f.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
  }
}

function buscarNavegador() {
  const candidatos = [
    process.env.NAVEGADOR,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidatos.find((c) => c && existsSync(c));
}

// Markdown mínimo: lo que usan las hojas del kit (títulos, párrafos, negrita,
// código, enlaces, listas, casillas y tablas). Nada más.
function enLinea(t) {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

function aHtml(texto) {
  const lineas = texto.split("\n");
  const out = [];
  let i = 0;
  while (i < lineas.length) {
    const l = lineas[i];
    if (!l.trim()) {
      i++;
    } else if (/^#{1,3} /.test(l)) {
      const n = l.match(/^#+/)[0].length;
      out.push(`<h${n}>${enLinea(l.slice(n + 1))}</h${n}>`);
      i++;
    } else if (l.startsWith("|")) {
      const filas = [];
      while (i < lineas.length && lineas[i].startsWith("|")) filas.push(lineas[i++]);
      const celdas = (f) => f.slice(1, -1).split("|").map((c) => enLinea(c.trim()));
      const [cab, , ...cuerpo] = filas;
      out.push(
        "<table><thead><tr>" +
          celdas(cab).map((c) => `<th>${c}</th>`).join("") +
          "</tr></thead><tbody>" +
          cuerpo
            .map((f) => "<tr>" + celdas(f).map((c) => (c.startsWith("Firma:") ? `<td class="firma">${c}</td>` : `<td>${c}</td>`)).join("") + "</tr>")
            .join("") +
          "</tbody></table>",
      );
    } else if (/^(- |\d+\. )/.test(l)) {
      const ordenada = /^\d/.test(l);
      const items = [];
      while (i < lineas.length && (/^(- |\d+\. )/.test(lineas[i]) || /^\s{2,}\S/.test(lineas[i]))) {
        if (/^\s{2,}\S/.test(lineas[i])) items[items.length - 1] += " " + lineas[i].trim();
        else items.push(lineas[i].replace(/^(- |\d+\. )/, ""));
        i++;
      }
      const tag = ordenada ? "ol" : "ul";
      const lis = items.map((t) => {
        const casilla = t.match(/^\[( |x)\] (.*)$/);
        return casilla
          ? `<li class="casilla">${casilla[1] === "x" ? "☑" : "☐"} ${enLinea(casilla[2])}</li>`
          : `<li>${enLinea(t)}</li>`;
      });
      out.push(`<${tag}>${lis.join("")}</${tag}>`);
    } else {
      const parrafo = [];
      while (i < lineas.length && lineas[i].trim() && !/^(#{1,3} |\||- |\d+\. )/.test(lineas[i])) parrafo.push(lineas[i++].trim());
      out.push(`<p>${enLinea(parrafo.join(" "))}</p>`);
    }
  }
  return out.join("\n");
}

function envolver(titulo, cuerpo) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${enLinea(titulo)}</title>
<style>
  @page { size: A4; margin: 16mm 18mm; }
  body { font: 10.5pt/1.45 "Segoe UI", Arial, sans-serif; color: #1a1a1a; max-width: 760px; margin: 0 auto; }
  h1 { font-size: 17pt; margin: 0 0 4pt; }
  h2 { font-size: 12pt; margin: 12pt 0 4pt; border-bottom: 1px solid #ccc; padding-bottom: 2pt; }
  p, ul, ol { margin: 0 0 6pt; }
  ul, ol { padding-left: 18pt; }
  li.casilla { list-style: none; margin-left: -14pt; }
  table { border-collapse: collapse; width: 100%; margin: 4pt 0 8pt; }
  th, td { border: 1px solid #ccc; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #f3f3f3; }
  td.firma { height: 48pt; }
  code { font-family: Consolas, monospace; font-size: 9.5pt; }
  a { color: inherit; }
</style>
</head>
<body>
${cuerpo}
</body>
</html>
`;
}
