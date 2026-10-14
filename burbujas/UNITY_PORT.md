# Bubble Parade · recursos para Unity 6 URP

La entrega jugable es la versión web. Los recursos y datos están preparados para el port: atlas PNG con transparencia, fondos JPG, fuentes TTF, seis fases y exportación del sonido original a WAV/OGG. **El motor C# y la escena nativa de Burbujas aún deben implementarse y validarse en Unity Editor.**

Desde la raíz del repositorio, con el servidor local iniciado:

```sh
python tools/export_bubble_native.py /tmp/bubble-parade-unity-assets
```

El ZIP contiene `Assets/BubbleParade/Art`, `Fonts`, `Audio` y `Data`, más esta guía. Es un kit de recursos, no un paquete UPM de juego nativo. Las fuentes incluyen su licencia SIL OFL.

## Imagen y coordenadas

- Espacio de juego: **960 × 600**; suelo en `y=552`. La lógica web mide desde arriba a la izquierda.
- Cámara ortográfica; con **60 píxeles por unidad**, el área visible es 16 × 10 unidades y `orthographicSize=5`.
- Posición del pie de un actor: `UnityX=(x+w/2)/60`, `UnityY=(600-y-h)/60`.
- Héroes: atlas de 4 × 4, ocho poses por personaje. Enemigos: atlas de 4 × 2, dos poses por arquetipo. `Data/sprites.json` da los 24 rectángulos en coordenadas inferiores de Unity, nombres y pivote. Las dimensiones originales no siempre son divisibles por el número de celdas: usa estos rectángulos, que incluyen valores fraccionarios.
- Importar atlas como **Sprite (2D and UI) / Multiple**, sin mipmaps, filtro bilinear, malla Full Rect y compresión que conserve los bordes con alpha. Héroes y enemigos caben en 2048 px.
- El héroe se dibuja a 80 × 80 px y el enemigo a 68 × 68 px; su colisión utiliza un cuerpo más pequeño y deja orejas/efectos fuera. Ajusta la escala del SpriteRenderer a ese tamaño, respetando el pivote del pie.
- Los fondos se ajustan para cubrir el encuadre y se recortan verticalmente. No tienen colisión. Las plataformas se construyen con los rectángulos de `Data/levels.json`, con paso desde abajo y superficie al caer.

La presentación puede usar sprites sin iluminación dentro de URP o un Renderer 2D con luces suaves. La lógica de captura y colisión se conserva igual en ambos casos. Orden de dibujo: fondo, plataformas, premios, enemigos, burbujas, héroes y efectos; HUD en una capa independiente.

## Motor y reloj

`game.mjs` es la referencia de reglas, separada de navegador, entrada, gráficos y audio. `levels.mjs` define fases, dimensiones, precio y controles. `FixedClock` ejecuta la simulación a **60 pasos por segundo**, con un acumulador propio y recuperación limitada tras un frame largo.

Al portar a C#, conserva el Xorshift32 y su semilla de contexto. No utilices el RNG del render para decidir botín, enemigos o estado guardado. Mueve los SpriteRenderer desde el modelo; las animaciones y partículas escuchan eventos. Evita que dos sistemas de física resuelvan a la vez las mismas posiciones.

Pausar detiene simulación, efectos y AudioSources del minijuego, sin cambiar `Time.timeScale` del juego principal. Una pérdida de foco no debe acumular segundos pendientes. La pausa del anfitrión se combina con ayuda y pausa manual.

## Controles

Usa acciones del Input System por jugador: **Move** (eje), **Jump**, **Shoot**, **Burst**, y acciones de visita **Coin**, **Start1**, **Start2**, **Pause**, **Help**, **Exit**, **ToggleSound**.

| Acción | PIP / J1 | POP / J2 | Mando por jugador |
|---|---|---|---|
| Move | A / D | ← / → | Stick horizontal o cruceta |
| Jump | W / Espacio | ↑ | A / sur |
| Shoot | F | K | X / oeste |
| Burst | G | L | B / este |

Asigna cada mando a su jugador; las dos asignaciones de teclado pueden compartir el dispositivo. En la portada, Y / norte inserta moneda, A inicia 1P y X inicia 2P. Start pausa. El anfitrión desactiva sus controles de personaje mientras la visita está abierta.

## Audio

`Data/audio.json` identifica 18 clips exportados de la síntesis web: **tres temas FM de 16 compases** y 15 efectos/jingles. Los temas OGG son estéreo y están preparados para bucle; los efectos WAV son mono. El exportador renderiza dos ciclos y toma el segundo para conservar el estado de la mezcla en el punto de unión. La fuente de la música es `audio.mjs`.

Usa fuentes separadas para música y efectos, con grupos de AudioMixer. Panorámica de efectos por jugador, pausa real de las fuentes y silencio que afecte también a notas/jingles pendientes. Los archivos ya incluyen la mezcla de la versión web. Revisa volumen, compresión y bucle en el hardware objetivo.

## Economía, guardado y resultado

`ContextoMinijuego.Pesetas` aporta el saldo; `Semilla` determina la partida. **M** compra un crédito por 25 pesetas, iniciar 1P consume uno e iniciar 2P consume dos. Los premios son puntos, sin devolución de pesetas por matar enemigos. Salir devuelve exclusivamente el crédito sin jugar.

El snapshot **v2** incluye wallet, initialWallet, credits, spent, RNG, modo, fase, temporizadores, jugadores, enemigos, burbujas atrapadas, premios e IDs. Siempre se cumple `wallet + credits*25 + spent = initialWallet`. Restaurar una celebración conserva su bonus y continúa a la siguiente fase sin acreditarlo otra vez.

El contrato `IMinijuego` es el mismo del juego principal: iniciar contexto, pausar y terminar con un único evento. `Puntos` corresponde a puntos ganados durante la visita; `PesetasDelta=-spent`; `Ganado` indica haber completado una campaña. La web añade `partidas`, `fases` y `mejorCadena`; pueden conservarse como estadísticas de Burbujas.

## Verificación del port

Las pruebas de `game.test.mjs` cubren economía, captura, escape, cadenas/cooperativo, salto/plataformas, recarga de bonus, victoria, vidas y equivalencia a 30/60/120 fps. Al portar, genera estados de referencia desde JavaScript y compáralos con C#, como en Costa Verde.

En Unity verifica además recortes de los atlas, pivotes, colisión visible, lectura del HUD, mandos asignados, pausa de sonidos y bucle de los tres temas. Este kit todavía no ha pasado por un editor de Unity en el entorno de desarrollo.
