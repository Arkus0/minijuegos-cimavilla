# Costa Verde 2000

Tragaperras jugable de Cimavilla, 1992. Máquina de chigre con carcasa de latón y granate, cristal ilustrado, rodillos curvos en Canvas y sonido mecánico procedural. Funciona sin dependencias, servicios externos ni pasos de compilación. Los demás minijuegos mantienen su implementación.

## Jugar y probar

Desde la raíz del repositorio:

```sh
python -m http.server 4173
# Abrir http://localhost:4173/tragaperras/
node --test tragaperras/game.test.mjs
# Exportar un solo HTML que funciona sin servidor ni conexión:
python tools/export_tragaperras.py /tmp/costa-verde-2000.html
# Pruebas de navegador (requieren Playwright y Chromium):
python tools/test_tragaperras_browser.py
```

- **M**: introducir una moneda de 25 pesetas desde el bolsillo.
- **Espacio**: jugar con un crédito de 25 pesetas.
- **A / S / D**: retener o avanzar el rodillo correspondiente cuando se enciende ese bonus.
- **C**: devolver al bolsillo los premios y los créditos pendientes.
- **H / ?**: ayuda. **P / Escape**: pausa.
- Todos los controles están disponibles con ratón y pantalla táctil.

En el modo independiente se empieza con 500 pesetas virtuales. El bolsillo, el crédito, los premios, los rodillos y los bonus se guardan en `localStorage`. Una tirada interrumpida por una recarga conserva su coste y resuelve el resultado ya seleccionado una sola vez. La navegación de salida devuelve todo el saldo pendiente.

Los cinco premios de tres iguales son 125, 250, 500, 1.250 y 2.500 pesetas. Dos cerezas en los dos primeros rodillos pagan 50. Las retenciones permiten guardar hasta dos rodillos para la siguiente tirada pagada. Los avances son gratuitos y recorren el siguiente símbolo de una tira física fija; el símbolo que aparece arriba baja a la línea. No hay apuestas con dinero real ni un porcentaje de retorno anunciado.

## Integración con el juego principal

El adaptador ofrece el contrato de `INTERFAZ_UNITY.md` sin mezclar la economía del modo independiente con el contexto del anfitrión:

```js
window.CimavillaTragaperras.iniciar({ Pesetas: 500, Semilla: 1992 });
window.CimavillaTragaperras.pausar(true);
window.CimavillaTragaperras.pausar(false);
const resultado = await window.CimavillaTragaperras.terminar();
```

También admite mensajes del `parent` en un iframe:

```js
iframe.contentWindow.postMessage({
  tipo: 'iniciar', id: 'tragaperras', contexto: { Pesetas: 500, Semilla: 1992 }
}, location.origin);
iframe.contentWindow.postMessage({ tipo: 'pausar', id: 'tragaperras', pausa: true }, location.origin);
iframe.contentWindow.postMessage({ tipo: 'terminar', id: 'tragaperras' }, location.origin);
```

Al terminar se emite una sola vez `parent.postMessage({ tipo: 'fin', id: 'tragaperras', puntos, ganado, pesetasDelta, partidas, mejorPremio }, '*')` y el evento local `minijuego:fin` con el mismo resultado. `pesetasDelta` incluye todos los créditos y premios pendientes. `puntos` es el total de pesetas ganadas en premios durante la sesión. La semilla reproduce las tiradas y los bonus; `Dificultad` no altera las probabilidades de esta máquina.

En un WebView puede usarse el adaptador directamente o escuchar `minijuego:fin` para pasar el resultado a C#. La API `estado()` devuelve una copia del estado para inspección. La lógica pura está en `game.mjs`; `reels.mjs`, `audio.mjs` y `app.mjs` gestionan presentación y entradas.

La pausa congela rodillos, sonido y presentación. Abrir ayuda o la tabla de premios pausa la máquina; cerrar el diálogo la reanuda. Cambiar de pestaña también la pausa. Se respeta `prefers-reduced-motion`, hay navegación de teclado, anuncios de estado y funcionamiento silencioso si Web Audio no está disponible.

## Recursos

`assets/chigre.webp` y `assets/coast.webp` son ilustraciones creadas para esta versión con generación de imágenes. Los cinco símbolos SVG y el audio procedural se han creado para el minijuego. Las fuentes se sirven localmente: DM Sans, Cormorant Garamond y Barlow Condensed, bajo SIL Open Font License; sus licencias están en `assets/fonts/`.
