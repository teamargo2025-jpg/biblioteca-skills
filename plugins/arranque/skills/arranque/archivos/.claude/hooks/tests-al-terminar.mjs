// Hook Stop: antes de que Claude de un cambio por terminado, corre los tests.
//
// Solo si hay cambios sin commitear en las carpetas de CODIGO (ajustar
// CARPETAS_DE_CODIGO a cada proyecto): si la sesion fue solo conversacion o
// documentacion, no hay nada que probar y no se hace esperar.
//
// Si los tests fallan, devuelve decision "block" con el error: Claude no puede
// terminar y recibe el motivo para arreglarlo. Si ya lo intento una vez
// (stop_hook_active) y siguen fallando, deja de bloquear para no entrar en un
// bucle y avisa a la persona.

import { spawnSync } from 'node:child_process';

// Donde vive el codigo que los tests cubren. Ajustar a cada proyecto.
const CARPETAS_DE_CODIGO = ['src', 'scripts'];

let entrada = '';
for await (const trozo of process.stdin) entrada += trozo;
const { stop_hook_active: yaReintento } = JSON.parse(entrada || '{}');

const proyecto = process.env.CLAUDE_PROJECT_DIR || process.cwd();
// git se lanza directo; npm necesita shell en Windows (es un .cmd), y por eso
// va como un solo string: con shell, Node no escapa una lista de argumentos.
const cambios = spawnSync('git', ['status', '--porcelain', '--', ...CARPETAS_DE_CODIGO], {
  cwd: proyecto,
  encoding: 'utf8'
}).stdout.trim();
if (!cambios) process.exit(0);

const tests = spawnSync('npm test', { cwd: proyecto, encoding: 'utf8', shell: true });
if (tests.status === 0) process.exit(0);

const salida = `${tests.stdout}\n${tests.stderr}`.trim().split('\n').slice(-40).join('\n');

if (yaReintento) {
  console.log(
    JSON.stringify({
      systemMessage:
        'Los tests siguen fallando despues de un intento de arreglo. Revisalo antes de hacer commit.'
    })
  );
} else {
  console.log(
    JSON.stringify({
      decision: 'block',
      reason: `npm test falla. Arreglalo antes de dar el cambio por terminado:\n\n${salida}`
    })
  );
}
