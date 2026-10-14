# ASSET-SPEC — POC-2D-EASTWARD-00

Especificación técnica que deben cumplir **todos** los assets, los subas tú a `Arkus0/cimavilla-2d` o los prepare yo. Lo que no la cumpla se puede rescatar, pero cuesta limpieza manual y suele perder calidad.

Lema del proyecto (va en todo prompt de imagen): **"Shenmue asturiano con el nivel gráfico de Eastward"**.

## 1. Rejilla, resolución y escala
| Decisión | Valor | Motivo |
|---|---|---|
| Tile lógico | **16×16 px** | Densidad tipo Eastward/ALttP; coincide con el prototipo `cimavilla-2d` |
| Resolución lógica | **480×270** | 30×17 tiles visibles; escala entera exacta a 960×540 (×2), 1440×810 (×3) y 1920×1080 (×4) |
| Escalado | Solo entero, *nearest neighbour*, barras si sobra espacio | Sin blur ni píxeles de tamaño desigual |
| Personaje | Frame **24×32**, figura de 28–30 px de alto, ancla en el centro inferior (pies) | Escala humana de referencia |
| Puerta | ~20–24 px de ancho × 32–36 de alto | Debe caber el personaje |
| Planta de edificio | ~48–56 px de alto (3–3,5 tiles) | Coherencia de escala entre fachadas |
| Ventana / hueco de galería | ~12–16 × 18–24 px | |

## 2. Proyección y luz (una sola gramática)
- **3/4 frontal** (Eastward / Zelda ALttP / Alundra): el suelo se ve desde arriba y las fachadas en alzado frontal, paralelas a la pantalla. **Nada de puntos de fuga ni perspectiva cónica.** Tejados y aleros escorzados, vistos un poco desde arriba.
- Laterales de edificios, si aparecen, en oblicuo simple y con el mismo ángulo en todas las piezas.
- **Luz desde arriba a la izquierda.** Sombras proyectadas hacia abajo a la derecha, en capa aparte cuando sea posible.

## 3. Formato de fichero
- **PNG RGBA**, con **1 píxel de arte = 1 píxel de imagen**. Si el asset viene ampliado (p. ej. ×4 desde una IA), indica el factor. Si no lo sabes, lo detecto yo, pero hay que limpiarlo.
- Bordes duros, con alfa 0 o 255. Sin antialias ni halos. Las semitransparencias solo en capas de sombra o luz.
- **Nada de JPG ni WebP con pérdida**, que ensucian la paleta y los bordes.
- Paleta cerrada: toda la escena debería compartir ≤ 64 colores. Si no, la cuantizo yo a la paleta maestra.
- Nombres con el patrón `categoria_nombre_variante.png`. Ejemplos: `suelo_canto_base.png`, `suelo_canto_v2.png`, `fachada_galeria_a.png`, `prop_cajas_sidra.png`, `pj_paseante_walk.png`.

## 4. Fachadas y edificios (macro-sprites modulares)
Lo ideal es entregarlas **por capas**, como PNG del mismo tamaño o recortes con su posición:
1. `base`: pared, zócalo y esquinas de sillería.
2. `huecos`: ventanas, galería, puertas y balcones.
3. `alero`: tejado y alero. Va en la capa **overhead**, que tapa al jugador cuando pasa por detrás.
4. `rotulo`: letreros y carteles, para poder cambiar textos.
5. `sombra` y `luz`: opcionales.

Si llega un PNG completo, lo recorto yo. Si se puede, la anchura de la fachada va en múltiplos de 16 px y se repite por **crujías** de 32 o 48 px, para recombinarla.

## 5. Suelo (tiles)
- Base de 16×16 **sin costuras**: debe repetirse en mosaico 3×3 sin que se note la junta.
- ≥ 3 variantes con el mismo borde, más transiciones: bordillo, acera de losa, cuneta o canaleta, tapa de alcantarilla y charco.
- Formato preferido: una hoja (*tileset*) alineada a la rejilla de 16 px, sin márgenes ni separación. Si hay separación, indícala.

## 6. Props
- Cada prop en un PNG con fondo transparente, recortado al contenido. **Ancla en el centro de la base**, el punto que toca el suelo.
- Sombra de contacto en un PNG aparte o integrada en gris oscuro sólido, sin degradado.
- Los props con luz, como el farol o una ventana encendida, llevan dos estados: `_off` y `_on`.

## 7. Personajes
- Hoja de 24×32 por frame. Filas: abajo, izquierda, derecha y arriba. Columnas: idle más 4–6 frames de caminar.
- Contorno y luz coherentes con los escenarios.

## 8. Capas del mapa (convención Tiled)
| Capa | Tipo | Uso |
|---|---|---|
| `ground` | tiles | Pavimento base |
| `ground-detail` | tiles | Variantes, alcantarillas, charcos y musgo |
| `walls` | objetos | Fachadas como macro-sprites (`image` + ancla) |
| `props` | objetos | Props ordenados por la Y del pie |
| `overhead` | objetos | Aleros y tejados que tapan al jugador; se atenúan cuando hay alguien detrás |
| `lights` | objetos | Fuentes de luz (`radius`, `color`, `flicker`) |
| `collision` | objetos | Rectángulos de colisión (`collides=true`) |

## 9. Procedencia y licencia (obligatorio)
Junto a cada entrega, en el mensaje del commit o en un `ORIGEN.md`: **herramienta o autor, fecha y licencia o condiciones de uso**. Si es IA, añade el prompt. No se aceptan gráficos extraídos, calcados ni retocados de Eastward, Alundra, SEGA ni ningún juego comercial. El manifest (`assets/manifest.json`) registra todo esto.
