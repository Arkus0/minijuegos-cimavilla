# Peticiones de assets para el ART-GATE

> **Obsoleto como lista de trabajo:** los encargos vivos están en `Arkus0/cimavilla-2d/encargos/` (01-ART-GATE.md y 02-MAPA.md), que es donde el usuario entrega. Esta copia queda como histórico de la primera petición.

Origen de entrega: `Arkus0/cimavilla-2d` (lo vigilo y voy integrando). Especificación: [ASSET-SPEC.md](ASSET-SPEC.md).
Estado: ⬜ pendiente · 🟨 recibido, hay que adaptarlo · ✅ integrado · ❌ no apto (con motivo)

## Prioridad 1: mínimo para el ART-GATE
| # | Asset | Tamaño orientativo | Notas | Estado |
|---|---|---|---|---|
| 1 | **Empedrado** (canto rodado gris-ocre de Cimavilla): tile base sin costuras + 3 variantes | 16×16 cada uno, mejor en una hoja | Variación de piedras, juntas oscuras, algo de musgo | ⬜ |
| 2 | **Acera de losa de granito + bordillo** y transición con el empedrado | 16×16 por tile | Bordes N/S/E/O y esquinas si se puede | ⬜ |
| 3 | **Fachada residencial con galería acristalada blanca** | ~112×176 (PB + 2 pisos + alero) | Revoco pastel, esquinas de sillería, teja árabe. Por capas si se puede (base, huecos, alero) | ⬜ |
| 4 | **Chigre**: fachada de planta baja con puerta legible y escaparate con luz cálida | ~112×176 | Rótulo pintado aparte (nombre a elegir) y pizarra "Hai sidra" | ⬜ |
| 5 | **Props del chigre** (3–4): cajas de sidra con botellas verdes, pipa o barrica, banco o taburete, farol de pared (`_off` y `_on`) | 16–32 px | Sueltos, fondo transparente, ancla en la base | ⬜ |

## Prioridad 2: para completar la microcalle
| # | Asset | Notas | Estado |
|---|---|---|---|
| 6 | Tapa de alcantarilla, charco, canaleta | Detalle de suelo | ⬜ |
| 7 | Nasas, boyas y redes; maceta con hortensias; bolardo | Carácter marinero y asturiano | ⬜ |
| 8 | Segunda variante de fachada (otro color de revoco o balcón de forja) | Para probar la recombinación | ⬜ |
| 9 | Personaje de escala 24×32 (idle y caminar en 4 direcciones) | Si no llega, uso uno provisional marcado como tal | ⬜ |

## Lo que haré yo mientras tanto
- Esqueleto Phaser con escala entera, mapa Tiled, ordenación por pies, capa `overhead`, modos debug, galería de assets aislados y herramientas de captura. Los huecos se rellenan con **placeholders grises rotulados**, nunca presentados como arte.
- Integración de cada entrega: recorte, cuantización a la paleta maestra, comprobación de costuras, manifest con procedencia y prueba en la escena.
