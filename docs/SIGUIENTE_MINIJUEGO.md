# Siguiente revamp: Escanciar sidra

Después de integrar Costa Verde 2000, reharemos **Escanciar sidra**. Es la experiencia que mejor convierte Cimavilla en algo propio: reconocer un buen culín por el gesto, el chorro y el resultado en el vaso. Tiene potencial para disfrutarse por sí sola y permite concentrar el salto gráfico en pocos elementos de calidad.

Esta entrega selecciona y define el siguiente trabajo; el código de sidra conserva su implementación actual.

## Elección y orden

| Minijuego | Situación actual | Decisión |
|---|---|---|
| Escanciar sidra | Botella y brazo básicos; gesto reducido a mover ratón y mantener pulsado. El viento cambia al azar sin una señal previa útil. La puntuación combina cantidad, espuma y derrame pero explica poco la calidad del gesto. | **Siguiente.** Identidad asturiana, interacción táctil y mejora gráfica concentrada. |
| Burbujas del Muelle | Ya tiene sprites, captura de enemigos, plataformas y dos jugadores. Repetir una misma fase y las reglas de movimiento limitan su recorrido. | Después de sidra. Requiere diseño de fases, enemigos y progresión, además de arte. |
| Tenis de Chigre / Pong | Palas blancas, pelota cuadrada y AI simple. El movimiento depende del ritmo de frames. | Después de Burbujas. Primero necesita competición y carácter propios. |

Orden: **Tragaperras → Sidra → Burbujas → Tenis de Chigre**. Se cierra y valida cada experiencia antes de empezar la siguiente.

## Experiencia deseada

Barra de madera oscura, luz ámbar, manos bien animadas, botella verde con reflejos y vaso fino inclinado. El primer culín debe resultar satisfactorio aunque aún no haya clientes ni clasificación. La gracia viene de aprender un gesto real y notar la diferencia entre chorro limpio y sidra desperdiciada.

La referencia Yakuza/Shenmue es la atención al ritual, la respuesta de los objetos y la sensación de jugar dentro de un lugar vivo. El humor sale del chigrero y los pedidos: frases breves sin convertir cada intento en una caricatura.

## Primera entrega: un culín excelente

Una botella, un vaso y un pedido claro. El jugador controla alineación del vaso e inclinación/caudal de la botella. La altura afecta a la aireación y se introduce después de aprender a acertar el chorro. Ratón y mando deben transmitir el mismo gesto.

El líquido usa una simulación de juego estable: trayectoria continua, tiempo de vuelo, impacto en el borde, acumulación, espuma y derrame. La imagen acompaña esa simulación con chorro coherente, salpicaduras y refracción aproximada. No hace falta simular físicamente todo el fluido para obtener una buena respuesta.

Cada error tiene una señal antes de penalizar: chorro alejándose, vaso mal inclinado, caudal alto o nivel cercano al pedido. El modo interior inicial no tendrá viento aleatorio. Si después escanciamos fuera, el viento será gradual y visible en ambiente/chorro antes de afectar al resultado.

Al soltar, la botella corta el caudal con una pequeña cola de gotas; el vaso conserva su estado. Se evalúan **cantidad pedida, aireación y limpieza del gesto**. El resumen explica el resultado con una frase breve. La espuma por sí sola no debe premiar un derrame o una espera artificial.

## Prioridad gráfica y sonora

1. **Manos, botella y vaso:** siluetas, articulaciones, peso, contacto y reflejos. Cámara cercana y estable que muestre el chorro completo.
2. **Sidra:** chorro sin saltos, impacto, pequeñas gotas, nivel visible, espuma que nace y se disipa, marcas húmedas en la barra. Las partículas siguen el líquido y no atraviesan el vaso.
3. **Chigre:** madera gastada, fondo con profundidad y pocos objetos cuidados. La luz guía la atención al gesto.
4. **Sonido:** levantar botella, líquido variando con caudal/altura, impacto limpio frente a derrame, vaso sobre madera. Ambiente bajo y valoración breve del chigrero, sin repetirse en cada intento.

En Unity 6 URP: modelos de manos/botella/vaso, vidrio y líquido con coste controlado; trayectoria independiente de efectos y framerate. Compartir `IMinijuego` y separar reglas/presentación como en Costa Verde. Economía y guardado siguen perteneciendo al anfitrión.

## Criterio para ampliar

La primera prueba se da por buena cuando:

- Se entiende el gesto en un intento y se distingue acierto de derrame antes de ver la nota.
- Intentos iguales producen el mismo resultado a 30, 60 y 120 fps; pausar no crea líquido ni cambia el vaso.
- Ratón y mando permiten afinar y cortar con comodidad.
- Un buen culín se ve y se oye mejor que uno malo; la nota coincide con cantidad, aireación y limpieza.
- Apetece repetir cinco intentos sin cansarse de voces o celebración.

Después: rondas cortas con clientes y cantidades distintas, récord personal, dificultad visible y variantes de botella/vaso. Los pedidos, comentarios y pequeñas recompensas construyen la progresión. Primero se valida el gesto central; después se amplía el local y el metajuego.
