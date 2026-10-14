# Bubble Parade

Revamp de Burbujas como una recreativa comercial de **Kirari Soft**, fabricante ficticio japonés de **1991**. PIP y POP recorren jardines lunares, grutas de cristal y una fábrica fantástica de caramelos. Cimavilla es el lugar donde está instalada la máquina; el juego tiene su universo propio.

Incluye seis fases, cuatro arquetipos de enemigo, uno o dos jugadores locales, cadenas hasta ×8, premios, vidas extra, clasificación, guardado y sonido FM original. El mueble tiene marquesina, palancas que se pueden arrastrar, botones, moneda, filtro CRT opcional y pantalla completa.

## Jugar

```sh
python -m http.server 4173
# http://localhost:4173/burbujas/
```

Empiezas con 500 pesetas virtuales. **M** compra un crédito por 25 pesetas; **1** inicia un jugador por un crédito y **2** inicia cooperativo por dos. La partida comienza con tres vidas por jugador. Cada 25.000 puntos da una vida extra, hasta cinco. El compañero eliminado vuelve con una vida al pasar de fase.

| Acción | PIP / J1 | POP / J2 |
|---|---|---|
| Mover | A / D | ← / → |
| Saltar | W / Espacio | ↑ |
| Lanzar burbuja | F | K |
| Estallido cercano | G | L |

**P / Escape:** pausa. **H:** ayuda. **V:** sonido. También puedes arrastrar las palancas, pulsar los botones o jugar con mando. En mando: stick/cruceta, A/sur salto, X/oeste burbuja, B/este estallido, Start pausa; en portada Y/norte mete moneda, A inicia 1P y X inicia 2P. En móviles, pantalla completa y orientación horizontal dan más espacio; los controles táctiles también funcionan en vertical.

Las burbujas capturan al chocar contra un enemigo. Puedes reventarlas al tocarlas o pulsando G/L cerca. Las burbujas atrapadas próximas estallan en cadena; cada enemigo vale 1.000 puntos por el multiplicador, hasta ×8. En cooperativo, si un jugador captura y otro revienta, el segundo recibe el 70% y el capturador el 30%; el grupo conserva la puntuación completa.

Recoger dulces da puntos. Terminar rápido y sin daño añade bonus. Si una burbuja atrapada se abre, el enemigo vuelve enfadado. Durante los últimos quince segundos de una fase, todos se aceleran. El cronómetro a cero elimina el bonus de tiempo, pero permite seguir intentando limpiar la sala.

## Guardado y anfitrión

El modo independiente guarda visita, saldo, fase, enemigos, capturas y puntuación en `localStorage`. La pausa manual se elimina al recargar; el estado del juego se conserva. Un bonus de fase guardado durante la celebración se acredita una sola vez. Los récords y las preferencias se guardan aparte. Datos inválidos no bloquean el arranque.

La API mantiene el ID `burbujas` del catálogo:

```js
window.CimavillaBurbujas.iniciar({ Pesetas: 500, Semilla: 1991 });
window.CimavillaBurbujas.pausar(true);
window.CimavillaBurbujas.pausar(false);
const estado = window.CimavillaBurbujas.guardar();
window.CimavillaBurbujas.iniciar(contexto, estado);
const resultado = window.CimavillaBurbujas.terminar();
```

`BubbleParade` es un alias de esa API. También acepta mensajes del parent con `{tipo:'iniciar',id:'burbujas',contexto,estado}`, `{tipo:'pausar',id:'burbujas',pausa}` y `{tipo:'terminar',id:'burbujas'}`. Solo procesa mensajes del propio parent. Al terminar emite una vez el evento local `minijuego:fin` y, en iframe, el mensaje `{tipo:'fin',id:'burbujas',puntos,ganado,pesetasDelta,partidas,fases,mejorCadena}`.

El anfitrión aplica `pesetasDelta` una vez: es el coste de los créditos jugados. El crédito sin jugar se devuelve al salir; los premios son puntos. `puntos` suma los puntos de la visita, `ganado` indica completar una campaña y `partidas` cuenta inicios. Un nuevo contexto del anfitrión usa su saldo propio y no escribe el guardado del modo independiente. `Dificultad` no altera esta campaña; la progresión está en sus seis fases.

## Probar y exportar

```sh
node --test burbujas/game.test.mjs
python tools/test_bubble_browser.py
python tools/export_bubble.py /tmp/bubble-parade.html
python tools/export_bubble_native.py /tmp/bubble-parade-unity-assets
```

El HTML exportado contiene módulos, imágenes, fuentes y sonido y funciona sin peticiones externas. Para terminar desde esa versión, los enlaces de salida muestran el resultado dentro de la máquina. El segundo exportador prepara un [kit de recursos para Unity 6 URP](UNITY_PORT.md), con PNG/JPG/TTF, 24 rectángulos de sprites, datos de las seis fases y 18 clips WAV/OGG. El motor C# y escena nativa de Burbujas todavía no forman parte de esta entrega.

La lógica pura está en `game.mjs`, las fases en `levels.mjs` y la presentación/entrada/audio en módulos separados. La simulación tiene un acumulador de 60 pasos por segundo; el render y los efectos no consumen su RNG. Pausa, ayuda y cambio de foco congelan juego y sonido. Se respeta movimiento reducido.

Las pruebas de lógica cubren saldo, cooperativo, pausa, equivalencia a 30/60/120 fps, captura/escape, cadena, salto y bordes de plataforma, recuperación, victoria y vidas extra. Chromium comprueba controles de teclado y palancas/botones, lectura de mando con dispositivo de prueba, pausa, recarga, cadena real, cambio de fase, escenas, salida, silencio y mezcla; cinco tamaños entre 320 y 1440 px. También verifica mensajes reales en iframe, devolución y aislamiento del guardado, y el HTML exportado en un documento sin conexión y sin peticiones HTTP. Queda comprobar mandos físicos y el futuro port dentro de Unity Editor.

## Recursos

Los dos atlas y los tres fondos se generaron para esta versión. Los atlas contienen 16 poses de héroes y ocho de enemigos; los originales tienen transparencia real. Plataformas, premios, burbujas, partículas y diseño del mueble se realizan en código. La música FM de 16 compases tiene una variante por mundo; foley y jingles se sintetizan localmente. La partida no usa servicios de generación.

DM Sans, Barlow Condensed y Lilita One están bajo SIL Open Font License, con sus avisos en `assets/fonts/`. Kirari Soft y Bubble Parade forman parte de la ficción de esta recreativa.
