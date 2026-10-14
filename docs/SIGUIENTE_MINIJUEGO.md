# Recreativas: Bubble Parade y próximos proyectos

La prioridad son las **recreativas**. Burbujas ya tiene una nueva versión jugable como **Bubble Parade**: personajes propios, seis fases en tres mundos, cadenas, cooperativo y música FM. La siguiente propuesta es crear un **beat ’em up**, y después rehacer **Pong**. Escanciar sidra queda para una ampliación futura.

La [guía de Bubble Parade](../burbujas/README.md) recoge la entrega y sus pruebas. Su [kit para Unity 6 URP](../burbujas/UNITY_PORT.md) prepara recursos y datos; todavía debe implementarse el motor C# y validarse la escena nativa. El beat ’em up será la nueva recreativa protagonista; su [brief inicial](BRIEF_BEAT_EM_UP.md) define el primer tramo que hay que validar.

## Criterio para todas las recreativas

Las máquinas son **juegos comerciales desarrollados fuera de Cimavilla** y llegados a sus locales. Cada juego tiene título, fabricante ficticio, universo, personajes y música propios. Su presentación debe resultar verosímil para una recreativa de la época.

Cimavilla aporta el lugar físico: salón, chigre, posición de la máquina, desgaste, ambiente y relación con el jugador del juego principal. El contenido de la pantalla puede ser fantasía, ciencia ficción, deporte o acción urbana. El detalle local de una máquina concreta, como Costa Verde, es una decisión de esa máquina.

Los nombres actuales del catálogo permiten identificar los prototipos. En el revamp se revisarán los títulos comerciales y las marquesinas para que la procedencia de cada juego se entienda.

## Orden y motivos

| Recreativa | Base actual | Prioridad propuesta |
|---|---|---|
| Bubble Parade / Burbujas | Revamp web jugable: atlas propios, seis distribuciones de plataformas, cuatro arquetipos, cooperativo, cadenas y tiempo fijo. Recursos preparados para Unity. | Revisar esta entrega antes de ampliar o pasar al siguiente proyecto. |
| Beat ’em up | Nueva recreativa deseada; necesita combate, personajes, enemigos y escenarios. | **Siguiente proyecto.** Crear un juego propio empezando por un tramo de combate muy cuidado. |
| Pong / Tenis de Chigre | Palas blancas, pelota cuadrada, AI que sigue la pelota y duelo a siete. Movimiento por frame. | **Tercero.** Darle presentación deportiva, rivales y un juego de golpes con más intención. |

Orden: **Tragaperras → Burbujas → Beat ’em up → Pong**. Se desarrolla uno por turno, con una versión jugable revisable antes de ampliar o cambiar de recreativa.

## Burbujas: dirección artística

Referencia de ritmo y claridad: **Bubble Bobble y Snow Bros**. Bubble Parade es una fantasía colorida de **Kirari Soft**, fabricante ficticio japonés de 1991, con PIP y POP como protagonistas y criaturas de siluetas distintas. Los criterios de diseño siguientes guían su revisión y ampliación.

El salto de calidad empieza por la imagen:

1. **Personajes animados:** espera con personalidad, carrera, anticipación del salto, disparo, daño y celebración. Proporciones y dirección de mirada legibles durante la acción.
2. **Burbujas:** volumen, reflejo, deformación al atrapar, enemigo que forcejea, aviso antes de escapar y estallido que confirme el acierto.
3. **Escenarios:** mundos distintos, como jardines, cavernas de cristal y fábricas fantásticas; planos de fondo, profundidad y luz, con plataformas fáciles de distinguir de la decoración.
4. **Máquina:** marquesina e ilustraciones propias, botones y palancas, demostración, créditos, clasificación e inicio de uno o dos jugadores. CRT opcional, con intensidad moderada y texto legible.

El color y la luz ayudan a localizar al jugador, enemigos libres y burbujas a punto de abrirse. La celebración debe dejar visibles plataformas y amenazas activas.

## Rehacer el juego, además del aspecto

El ciclo central seguirá siendo **moverse → atrapar → reunir burbujas → reventarlas → recoger premio**. La puntuación premiará preparar cadenas y resolver grupos, con contador de combo, notas ascendentes y un breve respiro al limpiar la sala.

Las seis fases tienen distribuciones y encuentros distintos. Los enemigos tienen comportamientos reconocibles: setas que patrullan, saltadores, murciélagos aéreos y rotores que anuncian su carga. La dificultad se apoya en esos encuentros y en la geometría.

El cooperativo conserva su sencillez. Ambos jugadores deben distinguirse con facilidad; capturar para que el compañero complete una cadena tiene que resultar útil. Daño, vidas, escape y fin de fase se entienden durante la acción.

En sonido: tema de recreativa con variantes, disparo suave, captura reconocible, estallido contundente, escalada de notas del combo y cierre de fase. La mezcla debe soportar muchos eventos a la vez y ofrecer suficiente variedad para partidas repetidas.

## Entrega revisable de Bubble Parade

La versión web incluye **seis fases en tres mundos**, cuatro tipos de enemigo, uno y dos jugadores, cadenas de burbujas, premios, daño/vidas, pausa y fin de partida. La presentación y el sonido comparten la identidad de Kirari Soft y sus dos protagonistas.

Para revisar esta entrega y decidir futuras ampliaciones:

- Personaje, plataforma, amenaza y burbuja capturada se identifican inmediatamente.
- Capturar y reventar se sienten bien; una cadena resulta claramente más satisfactoria.
- Salto, colisiones, escape y puntuación producen el mismo resultado a 30, 60 y 120 fps. La simulación usa pasos fijos y un reloj propio.
- Pausa y cambio de foco congelan juego, efectos y audio; reanudar no produce un salto de simulación.
- Teclado y mando permiten jugar con comodidad; el cooperativo se inicia y termina correctamente.
- Apetece jugar varias partidas para mejorar la marca.

## Continuidad con Unity 6 URP

Las reglas web están separadas de render, efectos y entrada. El anfitrión aporta contexto y recibe el resultado una vez; el futuro motor C# adoptará `IMinijuego`. Créditos, clasificación y guardado siguen ese contrato. El movimiento no depende de `requestAnimationFrame` ni de la tasa de refresco.

Dirección de arte y animaciones se validan antes de producir muchas fases. Mueble, juego e interfaz comparten esa dirección para funcionar como recreativa instalada en Cimavilla y como juego independiente.
