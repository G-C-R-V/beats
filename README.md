# Beats Landing

Landing page moderna y responsiva para promocionar y vender instrumentales urbanos.

## Características
- Hero con CTA y estética urbana oscura con acentos en violeta, rojo y dorado.
- Catálogo filtrable por género o tipo de licencia con reproductores de preview.
- Servicios de producción y combos con descuento detallados, regalías y políticas de reserva.
- Secciones de valor, testimonios, oferta especial y detalles de licencias.
- Botones de compra simulados (PayPal y MercadoPago) listos para enlazar.
- Animaciones sutiles, tipografías Google Fonts (Bebas Neue + Poppins) y diseño mobile-first.

## Estructura del proyecto
`
beats-landing/
|-- index.html
|-- assets/
|   |-- css/
|   |   -- style.css
|   |-- js/
|   |   -- main.js
|   |-- img/
|   |   |-- hero-bg.jpg        # reemplaza con tu fondo urbano
|   |   |-- beat1.png          # carátulas de cada beat
|   |   |-- beat2.png
|   |   -- ...
|   |-- audio/
|   |   |-- neon-nights-preview.mp3
|   |   |-- golden-flow-preview.mp3
|   |   -- ...
|   -- fonts/                 # opcional si usas tipografías locales
-- README.md
`

## Cómo usar
1. Clona o descarga este repositorio.
2. Abre index.html en tu navegador favorito.
3. Reemplaza las imágenes dentro de ssets/img/ y los previews en ssets/audio/ con tu material real.
4. Personaliza precios, licencias y botones de compra con los enlaces a tus pasarelas reales.

## Personalización
- **Colores:** modifica las variables CSS en ssets/css/style.css (:root) para ajustar la paleta.
- **Tipografías:** si prefieres fuentes locales, colócalas en ssets/fonts/ y actualiza @font-face en el CSS.
- **Catálogo:** duplica o elimina cards en la sección Catálogo de Beats dentro de index.html y ajusta los data-genre/data-license para que los filtros funcionen.
- **Servicios y combos:** actualiza precios, regalías y políticas en la sección Servicios para reflejar tus paquetes reales.
- **JS:** en ssets/js/main.js puedes adaptar los eventos de scroll, filtrado o integrar tu lógica de compra.

## Notas
- Los audios incluidos son referencias vacías; agrega tus propios archivos MP3/WAV con previews de 30 segundos.
- El diseño utiliza scroll-behavior: smooth nativo del navegador; se mantiene un fallback básico para compatibilidad.

## Licencia
Uso libre para proyectos comerciales o personales. No olvides reemplazar el branding y los assets por los tuyos.
