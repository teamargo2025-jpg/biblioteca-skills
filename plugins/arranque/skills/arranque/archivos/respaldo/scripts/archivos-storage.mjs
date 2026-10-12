// Utilidades compartidas por el backup y la restauracion de Supabase Storage.

import { createHash } from 'node:crypto';

// Las imagenes se guardan en la base como URL publica completa:
// https://<proyecto>.supabase.co/storage/v1/object/public/<bucket>/<ruta>.
// Al restaurar en un proyecto nuevo, esas URLs siguen apuntando al viejo, y si
// el viejo ya no existe todas las fotos quedan rotas. Esto las reescribe para
// que apunten al proyecto de destino.
const URL_PUBLICA_STORAGE = /^https:\/\/[a-z0-9-]+\.supabase\.co(\/storage\/v1\/object\/public\/)/;

const reescribirValor = (valor, destino) =>
  typeof valor === 'string' && URL_PUBLICA_STORAGE.test(valor)
    ? valor.replace(URL_PUBLICA_STORAGE, `${destino}$1`)
    : valor;

// Devuelve una copia de la fila con las URLs de Storage apuntando a `destino`
// (por ejemplo https://nuevo.supabase.co). Revisa los campos de texto y las
// listas de texto; el resto queda igual.
export const reescribirUrlsStorage = (fila, destino) => {
  const base = destino.replace(/\/+$/, '');
  return Object.fromEntries(
    Object.entries(fila).map(([campo, valor]) => [
      campo,
      Array.isArray(valor)
        ? valor.map((v) => reescribirValor(v, base))
        : reescribirValor(valor, base)
    ])
  );
};

// Huella del contenido: si cambia un solo byte, cambia la huella.
export const huella = (buffer) => createHash('sha256').update(buffer).digest('hex');

// Codifica cada tramo de una ruta de Storage sin tocar las barras.
export const rutaEnUrl = (ruta) => ruta.split('/').map(encodeURIComponent).join('/');
