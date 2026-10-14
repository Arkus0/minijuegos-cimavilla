# POC-2D-EASTWARD-00 · ART-GATE de Cimavilla

Experimento aislado para probar si Juego2 puede tener en 2D (Phaser) una calidad visual a la altura de Eastward: «un Shenmue asturiano con el nivel gráfico de Eastward». **Pivot a 2D no aprobado. Estado: ART-GATE en curso.**

## Ejecutar
```sh
cd prototypes/poc-2d-eastward-00
npm ci
npm run dev            # http://127.0.0.1:5173
npm run build          # build de producción en dist/
npm run build:single   # un solo index.html con todo embebido (dist-single/) para la preview privada
npm run check:assets   # coherencia entre manifest, mapa y PNG
npm run capture -- <etiqueta>   # capturas + vídeo + análisis en reports/captures/<etiqueta>/ (requiere build)
python3 art-src/placeholders.py # regenera los placeholders (nunca pisa arte real)
python3 tools/build-map.py      # regenera maps/gate.tmj (Tiled JSON 1.10)
```

## Controles
| Tecla | Acción |
|---|---|
| WASD / flechas | Mover el caminante de prueba (o la cámara en modo libre) |
| F | Cámara libre o seguir al caminante |
| Tab | Galería: assets aislados a 1× y 3×, hoja completa, mosaicos de costuras y combinaciones aleatorias |
| L / R | Atardecer y luces / orbayu (apágalos para juzgar el arte base) |
| G / C / B | Rejilla de 16 px / colisiones y pies / límites y anclajes |
| O | Atenuación de tejados en primer plano |
| 1-4 / 0 | Forzar escala entera / automática |
| H | Ocultar el HUD |

## Arquitectura
- `assets/manifest.json`: fuente de verdad de cada asset (tamaño, ancla, capa, estado, procedencia, licencia y reutilización). `status: placeholder` significa que **no es arte**: rayado y rotulado.
- `maps/gate.tmj`: mapa Tiled (capas `ground`, `ground-detail`, `walls`, `props`, `overhead`, `lights`, `collision` y `spawn`). Los objetos son imágenes de una colección de Tiled, así que se pueden abrir y editar en Tiled.
- `src/`: Phaser 4.2.1 + TypeScript + Vite. Vista lógica de 480×270 con escalado entero, ordenación por la Y de los pies y tejados `overhead` que se atenúan. Luz y orbayu se pueden desactivar.
- `art-src/`: scripts reproducibles de arte y adaptación de assets.
- `tools/`: mapa, verificación y capturas automáticas con Playwright (costuras, escalado y recorrido).
- `docs/`: [ASSET-SPEC](docs/ASSET-SPEC.md) · [peticiones de assets](docs/PETICIONES-ASSETS.md).
- `reports/`: [00 auditoría](reports/00-capability-audit.md) · capturas en `reports/captures/`.

## Limitaciones actuales
- Todo el arte del escenario son **placeholders** mientras llegan los assets en estilo Eastward (ver peticiones).
- Sin NPC, interior ni combate: quedan fuera hasta que se apruebe el ART-GATE.
