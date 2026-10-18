// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { leerReglaGeneral, problemasDeCabeceras } from './revisar-cabeceras.mjs';

const revisar = (texto) => problemasDeCabeceras(leerReglaGeneral(texto));

describe('revisar-cabeceras', () => {
  it('la plantilla de arranque pasa', () => {
    const plantilla = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
    expect(revisar(plantilla)).toEqual([]);
  });

  it('dice qué falta si no hay cabeceras', () => {
    const problemas = revisar('/sw.js\n  Cache-Control: no-cache\n');
    expect(problemas.join(' ')).toMatch(/content-security-policy/);
    expect(problemas.join(' ')).toMatch(/strict-transport-security/);
  });

  it('solo cuenta la regla general, no la de otras rutas', () => {
    const texto = '/api/*\n  Content-Security-Policy: default-src *\n';
    expect(revisar(texto).join(' ')).toMatch(/Falta content-security-policy/);
  });

  it('frena una CSP que permite scripts en línea', () => {
    const texto = [
      '/*',
      "  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'",
      '  X-Content-Type-Options: nosniff',
      '  Referrer-Policy: strict-origin-when-cross-origin',
      '  Permissions-Policy: camera=()',
      '  Strict-Transport-Security: max-age=63072000'
    ].join('\n');
    expect(revisar(texto).join(' ')).toMatch(/unsafe-inline/);
  });

  it('pide protección contra marcos invisibles', () => {
    const texto = [
      '/*',
      "  Content-Security-Policy: default-src 'self'; object-src 'none'",
      '  X-Content-Type-Options: nosniff',
      '  Referrer-Policy: no-referrer',
      '  Permissions-Policy: camera=()',
      '  Strict-Transport-Security: max-age=63072000'
    ].join('\n');
    expect(revisar(texto).join(' ')).toMatch(/frame-ancestors/);
  });
});
