// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { cifrar, descifrar } from './cifrado-copia.mjs';

const archivos = {
  'clientes.json': JSON.stringify([{ id: 1, nombre: 'Ana', telefono: '999888777' }]),
  'ventas.json': JSON.stringify([{ id: 2, total: 61.5 }])
};

describe('cifrado de la copia', () => {
  it('descifra exactamente lo que se cifró', () => {
    expect(descifrar(cifrar(archivos, 'clave-correcta'), 'clave-correcta')).toEqual(archivos);
  });

  it('no deja ningún dato legible en el archivo cifrado', () => {
    const cifrado = cifrar(archivos, 'clave-correcta');
    expect(cifrado).not.toContain('Ana');
    expect(cifrado).not.toContain('999888777');
  });

  it('dos copias de lo mismo no se parecen: la sal y el iv cambian', () => {
    expect(cifrar(archivos, 'clave')).not.toBe(cifrar(archivos, 'clave'));
  });

  it('falla con otra clave', () => {
    expect(() => descifrar(cifrar(archivos, 'clave-correcta'), 'otra-clave')).toThrow(
      /clave no es la correcta/
    );
  });

  it('falla si alguien alteró el archivo', () => {
    const sobre = JSON.parse(cifrar(archivos, 'clave'));
    const datos = Buffer.from(sobre.datos, 'base64');
    datos[0] ^= 1;
    sobre.datos = datos.toString('base64');
    expect(() => descifrar(JSON.stringify(sobre), 'clave')).toThrow(/alterado/);
  });

  it('se niega a cifrar sin clave', () => {
    expect(() => cifrar(archivos, '')).toThrow(/Falta la clave/);
  });
});
