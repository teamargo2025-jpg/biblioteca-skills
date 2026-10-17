# Seguridad y calidad automáticas

Lo que una máquina revisa en cada PR, para que no dependa de acordarse. Sale
del estándar de calidad y seguridad de Argonauta
(`conocimiento/estandar/calidad-y-seguridad.md`) y de que se nos pasaron las
cabeceras de seguridad en Amira: ningún paso las pedía.

Probado el 17 de octubre de 2026 en `prueba-arranque`: los tres trabajos de
la CI en verde, y un token falso de GitHub puesto a propósito la dejó en rojo
sin mostrar su valor en el log.

## Qué se copia

| De `archivos/` | Qué revisa | Frena el merge |
|---|---|---|
| `public/_headers` | Las cabeceras de seguridad que publica Cloudflare Pages (CSP, marcos, permisos, HTTPS) | — (es la configuración) |
| `scripts/revisar-cabeceras.mjs` + su test | Que `dist/_headers` tenga las obligatorias y que la CSP no deje scripts abiertos | Sí |
| Paso "Dependencias sin vulnerabilidades altas" de `ci.yml` | `npm audit --omit=dev --audit-level=high` | Sí |
| Trabajo `secretos` de `ci.yml` | gitleaks sobre todo el historial | Sí |
| Trabajo `lighthouse` de `ci.yml` + `lighthouserc.json` | Accesibilidad, rendimiento, buenas prácticas y SEO | Solo accesibilidad bajo 90; lo demás avisa |
| `.github/dependabot.yml` | PRs semanales con actualizaciones agrupadas | — |

## Cómo se aplica

1. Copiar los archivos. Si el proyecto ya tiene `public/_headers` (ESCALA),
   comparar y quedarse con lo más estricto.
2. **Ajustar la CSP al proyecto antes de mezclar**: los comentarios del
   `_headers` dicen qué tocar. Lo que más se olvida:
   - **Cámara** (leer QR): `camera=(self)` en Permissions-Policy.
   - **Videos de YouTube**: `frame-src` con `youtube.com` y
     `youtube-nocookie.com`.
   - **Otra API o CDN**: agregarla en `connect-src`, `img-src` o `script-src`.
3. **Probar en el navegador** con el sitio publicado en una rama (F12 →
   Console): una CSP demasiado cerrada no rompe el build, rompe la página
   ("Refused to load..."). Recorrer cada pantalla que use algo de afuera.
4. `npm audit` en verde antes del primer PR. Si una vulnerabilidad alta no
   tiene arreglo todavía, anotarla en el PR y decidir con el otro socio.
5. Lighthouse en una app con login mide la pantalla de entrada. Si
   accesibilidad baja de 90, arreglarlo (contraste, etiquetas de los campos,
   texto alternativo) antes que bajar la vara.

## Comprobar después de publicar

```bash
curl -sI https://<la-app>/
```

Y la nota de https://developer.mozilla.org/en-US/observatory: apuntar a B o
más.

## Lo que todavía no está automatizado

- Pruebas del recorrido completo en un navegador (Playwright).
- Monitoreo de errores y de disponibilidad.
- 2FA del admin dentro de la app y los ajustes de Auth (largo de contraseña,
  límite de intentos): se revisan a mano en `lanzamiento`.
