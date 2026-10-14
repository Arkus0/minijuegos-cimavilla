# Siguiente revamp propuesto: Burbujas del Muelle

La próxima prioridad son las **recreativas**. La propuesta es rehacer **Burbujas**, crear después un **beat ’em up**, y dejar **Pong** para el siguiente turno. Escanciar sidra pasa a una ampliación futura.

Burbujas ya tiene captura de enemigos, salto, dos jugadores locales y récords. Esa base permite concentrar el siguiente trabajo en personajes, animaciones, escenarios variados y una respuesta visual y sonora que invite a repetir. El beat ’em up será la nueva recreativa protagonista; su [brief inicial](BRIEF_BEAT_EM_UP.md) define el primer tramo que hay que validar.

## Criterio para todas las recreativas

Las máquinas son **juegos comerciales desarrollados fuera de Cimavilla** y llegados a sus locales. Cada juego tiene título, fabricante ficticio, universo, personajes y música propios. Su presentación debe resultar verosímil para una recreativa de la época.

Cimavilla aporta el lugar físico: salón, chigre, posición de la máquina, desgaste, ambiente y relación con el jugador del juego principal. El contenido de la pantalla puede ser fantasía, ciencia ficción, deporte o acción urbana. El detalle local de una máquina concreta, como Costa Verde, es una decisión de esa máquina.

Los nombres actuales del catálogo permiten identificar los prototipos. En el revamp se revisarán los títulos comerciales y las marquesinas para que la procedencia de cada juego se entienda.

## Orden y motivos

| Recreativa | Base actual | Prioridad propuesta |
|---|---|---|
| Burbujas / Burbujas del Muelle | Plataformas, captura, enemigos, dos jugadores y récords. Al pasar de nivel se mantiene el mapa y crecen el número y la velocidad de enemigos. Movimiento y tiempos dependen de frames. | **Siguiente revamp.** La mecánica ya admite una partida completa y tiene margen gráfico y jugable claro. |
| Beat ’em up | Nueva recreativa deseada; necesita combate, personajes, enemigos y escenarios. | **Segundo.** Crear un juego propio empezando por un tramo de combate muy cuidado. |
| Pong / Tenis de Chigre | Palas blancas, pelota cuadrada, AI que sigue la pelota y duelo a siete. Movimiento por frame. | **Tercero.** Darle presentación deportiva, rivales y un juego de golpes con más intención. |

Orden: **Tragaperras → Burbujas → Beat ’em up → Pong**. Se desarrolla uno por turno, con una versión jugable revisable antes de ampliar o cambiar de recreativa.

## Burbujas: dirección artística

Referencia de ritmo y claridad: **Bubble Bobble y Snow Bros**. Un mundo de fantasía colorido, protagonistas pequeños con personalidad y criaturas de siluetas distintas. Se escogerá una identidad comercial propia antes de producir el conjunto de assets.

El primer salto de calidad será gráfico:

1. **Personajes animados:** espera con personalidad, carrera, anticipación del salto, disparo, daño y celebración. Proporciones y dirección de mirada legibles durante la acción.
2. **Burbujas:** volumen, reflejo, deformación al atrapar, enemigo que forcejea, aviso antes de escapar y estallido que confirme el acierto.
3. **Escenarios:** mundos distintos, como jardines, cavernas de cristal y fábricas fantásticas; planos de fondo, profundidad y luz, con plataformas fáciles de distinguir de la decoración.
4. **Máquina:** marquesina e ilustraciones propias, botones y palancas, demostración, créditos, clasificación e inicio de uno o dos jugadores. CRT opcional, con intensidad moderada y texto legible.

El color y la luz ayudan a localizar al jugador, enemigos libres y burbujas a punto de abrirse. La celebración debe dejar visibles plataformas y amenazas activas.

## Rehacer el juego, además del aspecto

El ciclo central seguirá siendo **moverse → atrapar → reunir burbujas → reventarlas → recoger premio**. La puntuación premiará preparar cadenas y resolver grupos, con contador de combo, notas ascendentes y un breve respiro al limpiar la sala.

Las fases tendrán distribuciones y encuentros distintos. Los enemigos necesitarán comportamientos reconocibles: uno que patrulla, otro que salta hacia plataformas y otro que obliga a cambiar de altura. La dificultad se apoya en esos encuentros y en la geometría.

El cooperativo conserva su sencillez. Ambos jugadores deben distinguirse con facilidad; capturar para que el compañero complete una cadena tiene que resultar útil. Daño, vidas, escape y fin de fase se entienden durante la acción.

En sonido: tema de recreativa con variantes, disparo suave, captura reconocible, estallido contundente, escalada de notas del combo y cierre de fase. La mezcla debe soportar muchos eventos a la vez y ofrecer suficiente variedad para partidas repetidas.

## Primera entrega revisable

Una fase completa con el acabado visual objetivo, dos tipos de enemigo, uno y dos jugadores, cadenas de burbujas, premios, daño/vidas, pausa y fin de partida. Incluirá la presentación de la siguiente fase para comprobar que el formato admite progresión.

Antes de producir muchas fases, la muestra debe cumplir:

- Personaje, plataforma, amenaza y burbuja capturada se identifican inmediatamente.
- Capturar y reventar se sienten bien; una cadena resulta claramente más satisfactoria.
- Salto, colisiones, escape y puntuación producen el mismo resultado a 30, 60 y 120 fps. La simulación usa pasos fijos y un reloj propio.
- Pausa y cambio de foco congelan juego, efectos y audio; reanudar no produce un salto de simulación.
- Teclado y mando permiten jugar con comodidad; el cooperativo se inicia y termina correctamente.
- Apetece jugar varias partidas para mejorar la marca.

## Continuidad con Unity 6 URP

Las reglas se separarán de render, efectos y entrada. El anfitrión aporta contexto y recibe el resultado mediante `IMinijuego`; créditos, clasificación y guardado de la visita se integran con ese contrato. El movimiento no depende de `requestAnimationFrame` ni de la tasa de refresco.

Dirección de arte y animaciones se validan antes de producir muchas fases. Mueble, juego e interfaz comparten esa dirección para funcionar como recreativa instalada en Cimavilla y como juego independiente.
