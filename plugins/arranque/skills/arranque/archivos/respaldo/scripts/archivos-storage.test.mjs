// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { huella, reescribirUrlsStorage, rutaEnUrl } from './archivos-storage.mjs';

const VIEJO = 'https://viejo123.supabase.co/storage/v1/object/public/productos';
const NUEVO = 'https://nuevo456.supabase.co';

describe('reescribirUrlsStorage', () => {
  it('reescribe la imagen principal y cada imagen de la lista', () => {
    const fila = {
      imagen_principal: `${VIEJO}/shampoo/1-a.webp`,
      imagenes: [`${VIEJO}/shampoo/1-a.webp`, `${VIEJO}/shampoo/2-b.webp`]
    };
    expect(reescribirUrlsStorage(fila, NUEVO)).toEqual({
      imagen_principal: `${NUEVO}/storage/v1/object/public/productos/shampoo/1-a.webp`,
      imagenes: [
        `${NUEVO}/storage/v1/object/public/productos/shampoo/1-a.webp`,
        `${NUEVO}/storage/v1/object/public/productos/shampoo/2-b.webp`
      ]
    });
  });

  it('no toca textos que no son URLs de Storage', () => {
    const fila = {
      nombre: 'Shampoo sólido',
      descripcion: 'Visita https://viejo123.supabase.co para más',
      comprobante_url: 'uuid-del-pedido/123-captura.jpg',
      web: 'https://otro-sitio.com/storage/v1/object/public/x.png',
      precio: 25,
      activo: true,
      stock: null
    };
    expect(reescribirUrlsStorage(fila, NUEVO)).toEqual(fila);
  });

  it('acepta el destino con barra final', () => {
    expect(reescribirUrlsStorage({ a: `${VIEJO}/x.webp` }, `${NUEVO}/`).a).toBe(
      `${NUEVO}/storage/v1/object/public/productos/x.webp`
    );
  });

  it('no modifica la fila original', () => {
    const fila = { imagenes: [`${VIEJO}/x.webp`] };
    reescribirUrlsStorage(fila, NUEVO);
    expect(fila.imagenes[0]).toBe(`${VIEJO}/x.webp`);
  });
});

describe('huella', () => {
  it('cambia si cambia un solo byte', () => {
    expect(huella(Buffer.from('abc'))).not.toBe(huella(Buffer.from('abd')));
    expect(huella(Buffer.from('abc'))).toBe(huella(Buffer.from('abc')));
  });
});

describe('rutaEnUrl', () => {
  it('codifica cada tramo pero conserva las barras', () => {
    expect(rutaEnUrl('mi carpeta/foto ñ.webp')).toBe('mi%20carpeta/foto%20%C3%B1.webp');
  });
});
