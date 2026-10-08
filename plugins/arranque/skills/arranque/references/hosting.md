# Dónde publicar: regla de hosting

Se decide el **día 1**, no cuando el proyecto ya tiene clientes. Mudar después
cuesta más, y mientras tanto el sitio puede estar incumpliendo las condiciones
del hosting gratis: si el proveedor lo detecta, lo puede bajar sin aviso.

## La regla

> Si un negocio gana dinero con el sistema, o si a alguien le pagan por
> hacerlo, es **comercial**.

| Tipo de proyecto | Hosting por defecto |
|---|---|
| Comercial: clientes, negocios, tiendas, herramientas internas de una empresa | **Cloudflare Pages** (plan gratis) |
| Personal, portafolio, prototipo, documentación | Cualquiera: GitHub Pages, Vercel Hobby o Cloudflare Pages |
| Necesita algo que solo da Vercel (Next.js con servidor, por ejemplo) | Vercel **Pro**, pagado por el cliente |

## Por qué (verificado el 7 de octubre de 2026 en la documentación de cada uno)

- **GitHub Pages** no puede usarse para sitios "primarily directed at either
  facilitating commercial transactions or providing commercial software as a
  service". Una tienda o un SaaS incumplen.
  Fuente: docs.github.com → GitHub Pages limits.
- **Vercel Hobby** es solo para "non-commercial personal use". Comercial es
  cualquier deploy con fin de lucro "of **anyone** involved in **any part of
  the production**", incluido quien escribe el código si le pagan. Pedir
  donaciones no cuenta como comercial.
  Fuente: vercel.com/docs/limits/fair-use-guidelines.
- **Vercel Pro**: US$ 20 al mes, que incluyen 1 persona que publica (cada
  persona extra, otros US$ 20). Permite uso comercial.
- **Cloudflare Pages**: su documentación de límites no restringe el uso
  comercial en el plan gratis (500 builds al mes, 20.000 archivos por sitio).
  La restricción conocida es el video, que exige plan de pago. Revisar sus
  términos si el proyecto es grande.

Las condiciones cambian: volver a verificarlas cada año, o al empezar un
proyecto importante.

## Cómo publicar en Cloudflare Pages

1. En Cloudflare: Workers & Pages → crear un proyecto de Pages de **subida
   directa** (Direct Upload). **No conectarlo a git**: si Cloudflare también
   compila desde el repo, sus builds pisan los que hace GitHub Actions (pasó
   en Amyra y Volka).
2. Crear un token de API con permiso "Cloudflare Pages: Edit" y anotar el id
   de la cuenta.
3. En el repo de GitHub, cargar los secretos `CLOUDFLARE_API_TOKEN` y
   `CLOUDFLARE_ACCOUNT_ID`.
4. Copiar `archivos/.github/workflows/deploy-cloudflare.yml` y poner el nombre
   del proyecto. Publica al mezclar en `main` y corre los tests antes.

Probada el 8 de octubre de 2026 en `prueba-arranque`: el sitio quedó en
`prueba-arranque.pages.dev`, publicado por GitHub Actions al mezclar. Hacer
los pasos 1 a 3 **antes del primer merge**: sin el proyecto y los secretos,
el primer deploy de `main` sale en rojo.

Dos cosas que aparecieron al mudar Saviare (8 de octubre de 2026):

- **Crear el proyecto desde la terminal:** `wrangler pages project create`
  (desde la 4.148) intenta convertir el proyecto en un Worker. Si se corre
  dentro del repo, **modifica `package.json` y `vite.config.js`** sin
  preguntar. Correrlo desde una carpeta vacía y con `--force`:
  `wrangler pages project create <nombre> --production-branch=main --force`.
  Después, `git status` en el repo para confirmar que no tocó nada.
- **Cloudflare quita el `.html`:** `catalogo.html` redirige (308) a
  `catalogo`. Las canónicas, `og:url`, el sitemap y los datos estructurados
  van **sin `.html`**, porque una canónica que redirige confunde a Google.
  Los enlaces internos pueden seguir con `.html`: el servidor de desarrollo de
  Vite los necesita, y la redirección no rompe nada.

## Dominio

- El sitio funciona gratis en `<proyecto>.pages.dev`. El dominio propio es
  opcional y se paga por año.
- **A nombre de quien es dueño del negocio**, nunca de quien programa. Con
  clientes, a nombre del cliente desde el primer día.
- Para varios proyectos de una misma organización (por ejemplo, los de una
  ONG), un solo dominio con subdominios (`proyecto.organizacion.pe`) cuesta
  un solo pago anual. El negocio no es dueño de esa dirección: si se
  independiza, se muda a la suya.
- Al comparar precios, mirar el de **renovación**, no el del primer año.
