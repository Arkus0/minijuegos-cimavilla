# C0 — Auditoría de capacidades

Fecha: 2026-10-14 · Rama: `ccr-324be5cd-py8gxv` · Carpeta: `prototypes/poc-2d-eastward-00/`

## 1. Entorno verificado (comandos ejecutados)
| Recurso | Resultado |
|---|---|
| Repo y rama | `minijuegos-cimavilla`, rama `ccr-324be5cd-py8gxv`, árbol limpio. La versión Unity 3D **no está en este repo** y no se toca |
| Node / npm | v22.22.0 / 10.9.4 |
| Python | 3.13 + Pillow 12.3 + numpy 2.5 |
| Imagen | ImageMagick `convert`. **Sin** Tiled, Aseprite ni GIMP |
| Navegador de pruebas | Playwright 1.56.1 + Chromium 1194 (headless); ffmpeg en `/opt/pw-browsers/ffmpeg-1011` |
| npm (`npm view`) | phaser 4.2.1 (latest) / 3.90.0 (última v3), vite 8.3.4, vite-plugin-singlefile 2.3.3 |
| Red | Hay acceso a OpenGameArt, Kenney, itch y Hugging Face; GitHub, a través del proxy de git. Wikimedia Commons devolvió **429 (rate limit)** |
| MCP de GitHub | Falló al conectar. No bloquea nada: `git push` funciona por el proxy |

## 2. Vías de creación artística
| Vía | Resultado | Valoración |
|---|---|---|
| Herramienta nativa de generación de imágenes | **No disponible** en la sesión | — |
| Meshy | Requiere cuenta y API key (la API responde 404 sin clave). Orientado sobre todo a 3D | No usable sin una clave tuya |
| Pollinations (anónimo) | Funciona, pero solo con el modelo `sana`. Prueba con el lema "Shenmue asturiano con el nivel gráfico de Eastward": **foto pintada en perspectiva cónica, sin pixel art, con marca de agua** | ❌ No apto ni como concepto |
| AI Horde (anónimo, gratuito) | Acepta trabajos (modelos `AIO Pixel Art`, `Pixel Illustrious`, SDXL, Flux Schnell). Cloudflare bloquea el User-Agent de Python (error 1010); con curl funciona. Prioridad baja, sin resultados todavía | Posible fuente de **conceptos**, no de tiles limpios |
| Packs gratuitos | Estudiados (ver §3) | Útiles como relleno, no como base Eastward |
| **Assets del usuario en `Arkus0/cimavilla-2d`** | El usuario anuncia assets 3/4 frontales de estilo Eastward | **Vía principal desde ahora** |

## 3. Estudio de packs gratuitos (hojas revisadas visualmente)
| Pack | Licencia | Rejilla | Veredicto |
|---|---|---|---|
| LPC City Outside / Tile Atlas 1-2 | CC-BY-SA 3.0 / GPL | 32 px | Europeo pero "RPG genérico"; incluye toriis y piezas de fantasía. Calidad irregular |
| LPC Revised (buildings/terrain) | CC-BY 3.0 / OGA-BY 3.0 | 32 px | Muros y tejados recoloreables (hay teja anaranjada); empedrado rojizo muy repetitivo |
| LPC Base Assets (personajes de Redshrike/Sharm) | también OGA-BY 3.0 | 32 px, frames de 64×64 | Válido como *walker* provisional |
| Universal LPC Character Generator | por capa (OGA-BY / CC-BY-SA / GPL / CC0) | 64×64 | Válido para personajes provisionales con créditos |
| Slates (Ivan Voirol) | CC-BY 4.0 | 32 px (arte ×2) | Muy coherente, pero entramado alemán; densidad distinta a LPC |
| Zelda-like (ArMM1998) | CC0 | 16 px | Limpio pero genérico de fantasía |
| Kenney RPG Urban / Roguelike City | CC0 | 16 px | Plano, riesgo de "RPG Maker" |
| Ninja Adventure | CC0 | 16 px | Riesgo de "ciudad japonesa" |

**Conclusión:** ningún pack gratuito alcanza el objetivo Eastward ni la arquitectura asturiana. Además, mezclar packs de 32 px con 16 px rompe la densidad de píxel (condición de rechazo). Con los assets del usuario en estilo Eastward, la rejilla pasa a **16 px** (ver `docs/ASSET-SPEC.md`) y los packs LPC de 32 px quedan **descartados** para el escenario.

## 4. Prototipo previo `Arkus0/cimavilla-2d` (revisado)
- Plazuela en Phaser 4.2.1 con arte 100 % generado por código (`art/gen2.py`): paleta de 40 colores, tiles de 16 px, sprites de 24×32, vista de 320×180.
- **Puntos fuertes:** identidad asturiana clara (galerías, "Chigre Casa Pachu", Ultramarinos, carteles de Semana Negra 92 y del Sporting, cables, ropa tendida) y paleta cálida coherente.
- **Puntos débiles** (coincido con el usuario en que no llega): empedrado de ruido repetitivo que domina la escena, fachadas planas sin volumen ni aleros que tapen, mezcla de alzado frontal con suelo cenital sin transición, personajes muy esquemáticos y tejados como franja plana. Está lejos de Eastward.
- No hay PNG en el repo; los assets se generan al construir. Se toman como **referencia de identidad**, no como arte final.

## 5. Referencias fotográficas
No hay fotos de Cimavilla en el workspace. Wikimedia Commons dio 429 en la consulta. Las fotos solo se enlazarán como referencia, nunca se calcan ni se suben al repo.

## 6. Preview
Elegida: **Artifact privado de claude.ai** (build en un solo HTML). No se despliega nada público.

## 7. Bloqueos y riesgos
1. **La calidad del ART-GATE depende de los assets que entregues.** Yo aporto integración, adaptación, recombinación y la escena. No puedo pintar a nivel Eastward por código: el prototipo `cimavilla-2d` es la prueba de ese techo.
2. Los assets generados por IA suelen llegar con la rejilla de píxel sucia, en perspectiva incoherente y sin costuras limpias, así que cada uno requiere limpieza.
3. Licencias: cada entrega necesita procedencia (ver ASSET-SPEC §9).
4. Cambio respecto al plan: se usará **Phaser 4.2.1** en lugar de 3.90 para alinearse con `cimavilla-2d`. La compatibilidad real se verifica en la build.
