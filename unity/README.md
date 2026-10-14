# Costa Verde 2000 · preparación para Unity 6 URP

Paquete UPM nativo en [`Packages/com.cimavilla.costa-verde`](Packages/com.cimavilla.costa-verde). Incluye motor de C#, presentación 2.5D, recursos convertidos, Input System y generador de escena/prefab. La versión web continúa siendo la referencia visual y jugable.

1. Abre un proyecto **Unity 6 / Universal 3D**.
2. En **Window → Package Manager → + → Install package from disk**, selecciona `unity/Packages/com.cimavilla.costa-verde/package.json` de este checkout. También puedes instalar el `.tgz` con **Install package from tarball**.
3. Activa el Input System en **Project Settings → Player → Active Input Handling** (`Input System Package` o `Both`). Reinicia el editor si Unity lo pide.
4. Ejecuta **Cimavilla → Costa Verde → Crear escena de prueba**.
5. Abre **solo** la escena `Assets/CimavillaSamples/CostaVerde/CostaVerde.unity` y pulsa Play. La carpeta recibe un sufijo si ya existe; el generador conserva las escenas abiertas.

La escena empieza con 500 pesetas y semilla 1992. El prefab generado espera el contexto del juego principal. Las instrucciones completas, el contrato de guardado y la lista de validación están en el [README del paquete](Packages/com.cimavilla.costa-verde/README.md).

El núcleo se ha compilado con .NET 8 y coincide con **601 estados** de la implementación web. También se han probado pausa, cierre durante una tirada pagada, devoluciones y evento único. **No se ha ejecutado Unity Editor en este entorno**: importación, shader URP, escena y controles en Play Mode necesitan la validación descrita en el paquete.

**Bubble Parade** ya tiene un revamp web y un [kit de recursos para Unity 6 URP](../burbujas/UNITY_PORT.md); el motor C# de Burbujas y su escena nativa quedan pendientes. Después se propone un **beat ’em up**, seguido de **Pong**, como recreativas con universos propios. Véanse el [orden de recreativas](../docs/SIGUIENTE_MINIJUEGO.md) y el [brief del beat ’em up](../docs/BRIEF_BEAT_EM_UP.md).

## Reproducir comprobaciones y exportación

Desde la raíz del repositorio, con Node y .NET 8:

```sh
node --test tragaperras/game.test.mjs
dotnet run --project unity/CoreChecks/CoreChecks.csproj
```

Las referencias JSON se generaron desde el motor web, no desde el port. Para regenerarlas tras un cambio deliberado de reglas:

```sh
node tools/unity_golden.mjs
dotnet run --project unity/CoreChecks/CoreChecks.csproj
```

Para reconstruir recursos y empaquetar, instala Playwright, fontTools con brotli e Inkscape y sirve primero el repositorio con `python -m http.server 4173`:

```sh
python tools/export_unity_assets.py
python tools/unity_package.py --output /tmp/com.cimavilla.costa-verde-0.1.0.tgz
```

El exportador renderiza el frontal aprobado, separa sus zonas dinámicas y conserva las coordenadas. Convierte SVG/WOFF2/WebP y renderiza el foley original mediante OfflineAudioContext. Las voces quedan filtradas dentro de los WAV. Los `.meta` llevan GUID estables derivados de la ruta.
