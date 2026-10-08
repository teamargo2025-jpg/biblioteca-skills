// Hook PostToolUse: formatea con Prettier cada archivo que Claude crea o edita.
//
// Claude Code manda por stdin un JSON con la ruta en tool_input.file_path.
// --ignore-unknown salta los tipos que Prettier no conoce, y Prettier respeta
// .prettierignore aunque se le pase la ruta explicita: el HTML y supabase/
// quedan sin tocar.
//
// Nunca falla hacia afuera: si Prettier no puede con el archivo, el cambio de
// Claude se conserva tal cual y el formato lo revisa despues la CI.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

let entrada = '';
for await (const trozo of process.stdin) entrada += trozo;

let archivo;
try {
  archivo = JSON.parse(entrada).tool_input?.file_path;
} catch {
  process.exit(0);
}
const proyecto = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const prettier = join(proyecto, 'node_modules', 'prettier', 'bin', 'prettier.cjs');

if (archivo && existsSync(archivo) && existsSync(prettier)) {
  spawnSync(process.execPath, [prettier, '--write', '--ignore-unknown', archivo], {
    cwd: proyecto,
    stdio: 'ignore'
  });
}
