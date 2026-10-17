// Revisa las cabeceras de seguridad de un sitio YA PUBLICADO.
//
// arranque las exige en el repo (scripts/revisar-cabeceras.mjs sobre
// dist/_headers); esto comprueba que lleguen de verdad al navegador, que es
// lo que importa. Solo pide la página, como cualquier visitante.
//
// Uso: node <ruta-de-la-skill>/scripts/cabeceras-en-linea.mjs https://la-app.pages.dev
//
// Referencia: punto 3.1 del estándar de calidad y seguridad de Argonauta.

const url = process.argv[2];
if (!url) {
  console.error('Uso: node cabeceras-en-linea.mjs https://la-app.pages.dev');
  process.exit(2);
}

const r = await fetch(url, { redirect: 'follow' });
const h = (n) => r.headers.get(n);
const csp = h('content-security-policy') ?? '';
const directiva = (nombre) =>
  csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.toLowerCase().startsWith(`${nombre} `))
    ?.slice(nombre.length)
    .trim();
const scripts = directiva('script-src') ?? directiva('default-src') ?? '';

const revisiones = [
  ['Content-Security-Policy', Boolean(csp), 'dice desde dónde puede cargar código la página'],
  ["CSP sin scripts 'unsafe-inline' ni 'unsafe-eval'", csp && !/'unsafe-(inline|eval)'/.test(scripts), 'es justo lo que la CSP tiene que impedir'],
  ["CSP con object-src 'none'", directiva('object-src') === "'none'", 'cierra plugins viejos'],
  [
    'Protección contra marcos invisibles',
    Boolean(directiva('frame-ancestors') || h('x-frame-options')),
    'frame-ancestors en la CSP o X-Frame-Options'
  ],
  ['Strict-Transport-Security', Boolean(h('strict-transport-security')), 'obliga a usar siempre HTTPS'],
  ['X-Content-Type-Options', h('x-content-type-options') === 'nosniff', 'debe ser nosniff'],
  ['Referrer-Policy', Boolean(h('referrer-policy')), 'qué se cuenta a otros sitios al salir'],
  ['Permissions-Policy', Boolean(h('permissions-policy')), 'apaga cámara, micrófono y ubicación si no se usan']
];

console.log(`Cabeceras de ${r.url} (HTTP ${r.status}):\n`);
let faltan = 0;
for (const [nombre, ok, porque] of revisiones) {
  if (!ok) faltan++;
  console.log(`  ${ok ? '✅' : '❌'} ${nombre}${ok ? '' : ` — ${porque}`}`);
}
console.log(
  faltan
    ? `\n${faltan} sin cumplir. Arreglo: public/_headers de la plantilla de arranque, ajustado al proyecto. Gravedad: "Antes de una semana".`
    : '\nCompletas. Confirmar la nota en https://developer.mozilla.org/en-US/observatory (B o más).'
);
process.exitCode = faltan ? 1 : 0;
