# Beat ’em up · brief inicial

**Estado: propuesta para una nueva recreativa.** Se plantea después del revamp de Burbujas. Nombre provisional: **Neon Riot**; título y fabricante comercial ficticio se concretarán con la dirección de arte.

Un beat ’em up con ritmo de **Final Fight / Streets of Rage**, ambientado en una ciudad ficticia propia: calles, puerto industrial, metro y fábrica. Es un juego comercial desarrollado fuera del pueblo y cuya máquina ha llegado a Cimavilla. Sus personajes, historia y estética pertenecen a ese universo independiente.

Cada sesión funciona como una partida de recreativa con comienzo claro, encuentros, jefe y puntuación. La presentación del fabricante, fecha ficticia, marquesina, pantalla de título, demostración y música deben ser coherentes con la época del juego principal.

## Aspecto y tono

Propuesta: **sprites 2D detallados**, animaciones con poses fuertes y movimiento con profundidad en la calle, como los beat ’em ups de los 90. Unity 6 URP gestiona la cámara, capas y efectos; el acabado visual se valida con un personaje y una escena representativos.

Siluetas grandes, color nocturno, reflejos en suelo húmedo, rótulos y escenarios con carácter. La cámara permite leer distancia y profundidad. Los detalles de Cimavilla están en el mueble y el local donde se juega; la ciudad de la pantalla conserva su identidad propia.

## La prioridad: que pegar dé gusto

Cada acción confirma preparación, arco del golpe, contacto, reacción y recuperación. Golpes ligeros y remates tienen ritmos distintos. El enemigo recibe el impacto con peso y responde a fuerza y dirección. Un fallo por distancia o profundidad debe entenderse visualmente.

Pausa breve de impacto, sacudida de cámara, sonido, destello y desplazamiento se ajustan para que se lea el contacto. El efecto de impacto utiliza el reloj del minijuego y mantiene independiente el juego principal.

Movimientos iniciales:

- Cadena corta de golpes con remate y posibilidad de orientar el ataque.
- Salto y golpe aéreo, con aterrizaje que tenga peso.
- Agarre cercano y lanzamiento útil para despejar espacio.
- Acción defensiva con coste o recuperación clara para escapar de una encerrona.

Cada movimiento resuelve una situación. El primer personaje tendrá un conjunto pequeño de acciones pulidas y controles cómodos con mando.

## Enemigos y encuentros

Tres arquetipos para el primer tramo: **peleón**, que entra a corta distancia; **rápido**, que flanquea y obliga a reposicionarse; **grandullón**, que anuncia golpes fuertes y deja una ventana de castigo. El encuentro reparte atacantes y aproxima a los demás sin amontonarlos en un punto.

Anticipación visible y límites claros de alcance. El jugador puede reaccionar y aprovechar el entorno. Barriles, cajas y obstáculos aportan decisiones y dejan visibles a los enemigos.

El primer minijefe combina patrones legibles con cambios de ritmo y oportunidades claras de castigo. Su dificultad se apoya en las decisiones del combate.

## Primera entrega revisable

**Un tramo de 3–5 minutos**, con un protagonista completamente animado, tres arquetipos de enemigo, elementos rompibles, minijefe y cierre con puntuación. Música y foley representan el acabado sonoro deseado. El juego completo apunta a uno o dos jugadores en cooperativo local; el segundo personaje se incorpora después de validar el combate del primero.

Primero se construye un combate de prueba en un espacio pequeño, con protagonista y un enemigo, para afinar alcance, desplazamiento, reacción e impacto. Después se viste y amplía el tramo. Desde la prueba inicial se incluyen animaciones y efectos representativos del acabado final.

## Criterio para ampliar

- Golpe acertado, fallado, bloqueado o recibido se distingue por imagen y sonido.
- Posición, alcance y profundidad son comprensibles; la cámara mantiene visibles a los participantes.
- Pelear contra un grupo tiene ritmo: posicionarse, golpear, apartarse y aprovechar aperturas.
- Simulación y colisiones funcionan de forma consistente a distintas tasas de refresco; pausa y reanudación no añaden daño ni movimiento.
- El minijefe se vence aprendiendo patrones y aprovechando sus aperturas.
- Apetece repetir por dominio del combate y puntuación, además del escenario.

Después: cooperativo, segundo personaje, nuevas zonas, enemigos y variantes de encuentros. `IMinijuego`, Input System, economía y guardado siguen el contrato del anfitrión. El diseño de estas reglas y la presentación comercial se mantienen independientes del mundo de Cimavilla.
