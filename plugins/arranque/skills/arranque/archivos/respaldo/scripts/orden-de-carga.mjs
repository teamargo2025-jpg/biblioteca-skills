// En que orden se cargan las tablas al restaurar una copia.
//
// Una fila que apunta a otra tabla (cliente_id, vendedor_id...) solo se puede
// insertar si la fila apuntada ya existe. Con muchas tablas, una lista escrita a
// mano se desactualiza en la primera migracion que agregue una referencia, y
// el error aparece justo el dia que hace falta restaurar. Por eso el orden se
// deduce del propio SQL del repo: cada "references" de un create table o un
// alter table es una dependencia.
//
// Las referencias a otros esquemas (auth.users, storage) no cuentan: esas
// tablas las maneja Supabase y la restauracion las resuelve aparte.

const sinComentarios = (sql) => sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

// Devuelve { tabla: Set(de las tablas publicas a las que apunta) }.
export const dependencias = (textosSql) => {
  const deps = {};
  for (const texto of textosSql) {
    for (const sentencia of sinComentarios(texto).split(';')) {
      const m =
        sentencia.match(
          /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/i
        ) ??
        sentencia.match(
          /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/i
        );
      if (!m) continue;
      const tabla = m[1].toLowerCase();
      deps[tabla] ??= new Set();
      for (const r of sentencia.matchAll(
        /references\s+(?:(public|[a-z_]+)\.)?([a-z_][a-z0-9_]*)/gi
      )) {
        const esquema = (r[1] ?? 'public').toLowerCase();
        const destino = r[2].toLowerCase();
        if (esquema === 'public' && destino !== tabla) deps[tabla].add(destino);
      }
    }
  }
  return deps;
};

// Ordena las tablas para que cada una vaya despues de las que apunta. Entre
// las que no dependen entre si, orden alfabetico, para que el resultado sea
// siempre el mismo. Falla si hay un ciclo: ahi no existe un orden valido y
// hay que resolverlo a mano.
export const ordenDeCarga = (tablas, deps) => {
  const pendientes = new Set(tablas);
  const orden = [];
  while (pendientes.size) {
    const listas = [...pendientes]
      .filter((t) => [...(deps[t] ?? [])].every((d) => !pendientes.has(d)))
      .sort();
    if (!listas.length) {
      throw new Error(`Referencias circulares entre: ${[...pendientes].sort().join(', ')}`);
    }
    for (const t of listas) {
      orden.push(t);
      pendientes.delete(t);
    }
  }
  return orden;
};
