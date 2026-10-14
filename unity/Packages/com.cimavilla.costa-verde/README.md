# Costa Verde 2000 · Unity 6 URP

Preparación de port nativo de las tragaperras de Cimavilla 1992. Versión **0.1.0**. La muestra conserva el frontal de latón y granate aprobado, con sus reclamos noventeros, mediante UI 2.5D. El motor también se puede utilizar con una máquina 3D.

## Instalar y abrir la muestra

- Proyecto Unity **6000.0 o posterior de la familia Unity 6**, creado con la plantilla **Universal 3D**. Utiliza la versión de URP suministrada por ese editor.
- Instala `package.json` desde disco, o el `.tgz` desde Package Manager. Dependencias declaradas: Input System **1.11.2**, UGUI **2.0.0** y el paquete oficial Newtonsoft JSON **3.2.1**. No necesita servicios externos al jugar.
- Activa `Input System Package` o `Both` en Active Input Handling.
- Ejecuta **Cimavilla → Costa Verde → Crear escena de prueba**. Se crean escena, prefab, material de rodillos e InputActionAsset en una carpeta nueva bajo `Assets/CimavillaSamples/`.
- Abre **CostaVerde.unity sola** y pulsa Play. El generador conserva tus escenas abiertas. La muestra sola evita duplicar cámaras, AudioListener y EventSystem de otras escenas.

`CostaVerdeDemo` aporta 500 pesetas y semilla 1992. **Otra noche** termina la visita antes de empezar otra. La composición de referencia de 1440 × 1034 se ajusta al área segura y está pensada para escritorio y mando en horizontal. En vertical se reduce toda la composición; una interfaz móvil específica queda pendiente.

## Integrar el prefab

`Runtime/Core` es C# sin referencias a Unity: reglas, RNG, snapshots, resultados y reloj de rodillos. `Runtime/Unity` contiene adaptador y presentación. El contrato común está en `Contracts.cs`.

```csharp
using Cimavilla.Minigames;
using Cimavilla.Minigames.CostaVerde;

CostaVerdeController maquina = instancia.GetComponent<CostaVerdeController>();
maquina.Terminado += resultado => {
    bolsillo += resultado.PesetasDelta;
    // Cerrar el minijuego y restaurar los controles del personaje.
};
maquina.Iniciar(new ContextoMinijuego {
    Pesetas = bolsillo, Dificultad = 0, Semilla = 1992
});

maquina.Pausar(true);  // El jugador no puede cancelar la pausa del anfitrión.
maquina.Pausar(false);
maquina.Terminar();    // Liquida la tirada pendiente y devuelve todo el saldo.
```

Aplica `PesetasDelta` **una sola vez**, en `Terminado`. El valor devuelto por `Terminar()` permite consultar el resultado; no apliques de nuevo ese delta. `Puntos` cuenta premios ganados; `Ganado` indica al menos un premio; `Partidas` cuenta tiradas pagadas; `MejorPremio` es el mayor premio en pesetas.

Mantén una visita activa por jugador y desactiva los controles del personaje mientras juega. El adaptador clona acciones y materiales; no cambia `Time.timeScale`, el RNG de Unity, PlayerPrefs ni el monedero global. Necesita el AudioListener y el EventSystem con `InputSystemUIInputModule` del anfitrión. La escena de muestra los incluye; el prefab no los duplica.

Llama a `Terminar()` **antes de destruir** el prefab. Los callbacks de destrucción no liquidan la economía del anfitrión. Para ocultarlo temporalmente, usa `Pausar(true)` antes de ocultar y reanuda al mostrarlo.

## Guardar y recuperar

```csharp
string estado = maquina.Guardar(); // null si la visita terminó
// Persistir con el identificador de visita; restaurar en una instancia nueva:
maquina.Iniciar(contextoDeLaVisita, estado);
```

El snapshot **v1** conserva nombres, índices físicos y RNG `uint` de la web. Newtonsoft preserva `pending: null` y semillas sin signo. Una tirada pagada guarda sus tres destinos antes de animarse: restaurar completa ese resultado una vez y salta la celebración. Guardar durante una victoria no vuelve a acreditar el premio.

El guardado conserva el saldo inicial y es la autoridad al restaurar. No lo combines con una segunda entrega de créditos. El anfitrión invalida el guardado al recibir `Terminado` y registra que la visita ya se liquidó. Durante la pausa no se compra ni juega; terminar sigue devolviendo el saldo.

## Entradas

`Data/input-actions.json` se convierte en un InputActionAsset editable. El adaptador lo clona por instancia y lo activa solo durante la visita.

| Acción | Teclado | Mando |
|---|---|---|
| Coin | M | Botón oeste |
| Spin | Espacio | Botón sur |
| CashOut | C | Botón norte |
| Hold1 / Hold2 / Hold3 | A / S / D | Cruceta izquierda / abajo / derecha |
| Pause | P | Start |
| Help | H | Hombro izquierdo |
| Exit | Escape | Select |
| ToggleSound | V | Botón de pantalla |

Coin, Spin, CashOut, las tres acciones de rodillo, ayuda, salida y sonido tienen botones de pantalla. Escape cierra la ayuda si está abierta; fuera de ella termina la visita. Pausa manual, anfitrión, ayuda y pérdida de foco se combinan: quitar una no elimina las demás. Continuar solo elimina la pausa manual. `reducedMotion` mantiene luces estables, limita giros a 0,42 s y omite monedas animadas.

## Reglas y tiempos

- Moneda/tirada: **25 pesetas**. Tres cerezas / limones / sandías / sietes / campanas: **125 / 250 / 500 / 1.250 / 2.500 pesetas**. Dos cerezas a la izquierda: **50**.
- Tres tiras físicas de **21 posiciones**, idénticas a la web. `Data/reel-strips.json` sirve para herramientas externas; `SlotEngine` es la fuente utilizada en ejecución.
- Xorshift32 con semilla del contexto. `Dificultad` no modifica probabilidades.
- Tras una tirada nueva perdedora: 22% de posibilidad de 1–3 avances; el siguiente 22% ofrece retenciones. Los avances recorren posiciones físicas y las retenciones guardan hasta dos rodillos para la siguiente tirada pagada.
- Premio acumulado hasta cobrar; cobrar y terminar devuelven también crédito sin jugar.
- Paradas a **2,25 / 2,83 / 3,41 s**; el tercero espera **0,65 s** más si coinciden los dos primeros destinos. Avance **0,38 s**. Curva `t − sin(2πt)/(2π)`.

## Recursos y dirección gráfica

El frontal transparente de **1200 × 1604 px** procede de la máquina aprobada. Su layout usa **600 × 802** unidades; rodillos, luces, indicadores, mensajes y botones son zonas dinámicas nativas.

| Recurso | Uso |
|---|---|
| `Art/cabinet-front.png` | Latón, granate, cristal, tabla de premios |
| `Art/button-*.png` | Botones iluminados |
| `Art/symbol-atlas.png` | Cinco símbolos transparentes: cereza, limón, sandía, siete, campana desde abajo |
| `Art/cherry.png` … `bell.png` | Símbolos individuales para el futuro modelo |
| `Art/coin-25.png`, `pesetas.png` | Monedas y reclamo |
| `Art/chigre.jpg`, `coast.jpg` | Entorno y cristal del Cantábrico |
| `Data/cabinet-layout.json` | Zonas dinámicas y **82 bombillas** |
| `Fonts/*.ttf` | DM Sans, Cormorant Garamond y Barlow Condensed; OFL incluidas |
| `Audio/*.wav` | 14 clips mono, 44,1 kHz / PCM 16 bits |

`MechanicalReel.shader` es un shader de UGUI dentro de URP. Proyecta cinco posiciones próximas con seno/coseno, comprime símbolos al borde y añade sombra/reflejo de cristal. Los destinos proceden del motor. Las luces recorren una secuencia de **3,2 s** con fases de **0,13 s**; el premio acelera los destellos. El pool de 18 monedas tiene su propio movimiento, sin consumir RNG de resultados.

La muestra dibuja el brillo en UI. Screen Space Overlay no recibe bloom del Volume de URP. Para situar la máquina dentro del chigre, el siguiente trabajo gráfico es modelar mueble, biseles, cristal y bandeja, colocar cámara y convertir bombillas en emisores de material URP. Atlas y motor se conservan.

Referencia para el modelo: latón envejecido `#b39053` (metallic ~0,8 / smoothness ~0,35), granate `#742b3c` (~0,15 / ~0,3), plástico `#191b16`; bombillas `#ffd887`, `#9aeaab`, `#ff917d`. Emisiones y pocas luces reales iluminan el mueble; evita 82 luces dinámicas. El reclamo y el premio se exageran; el chigre mantiene un tono cálido y gastado.

## Sonido

Los WAV proceden del foley y las dos locuciones originales de la web: moneda, cobro, pulsador, tres paradas, motor en bucle, bonus, anticipación, premio, premio gordo, reclamo y voces. Voces filtradas como altavoz y efectos con la mezcla/compresión web ya aplicada.

`MachineSound` separa efectos, motor y voz en AudioSources propios y acepta grupos de AudioMixer. La primera moneda inicia el saludo; giro y bonus cortan la voz. El reclamo espera 18 s de inactividad y deja 26 s entre jingles. Pausa congela presentación y fuentes; silencio cancela la voz pendiente; terminar detiene todas las fuentes.

## Validación

**Ejecutado fuera de Unity:** núcleo compilado con .NET 8; 601 checkpoints de seis semillas frente a JavaScript, incluidos cero/negativas, acciones bloqueadas, retenciones, avances y restauración. Probados cierre de tirada pausada, reembolso, evento único, copia de snapshot y reloj de rodillos. Los 14 WAV contienen señal sin recorte PCM. Comprobados layout, atlas, fuentes y GUID.

**Pendiente en Unity:** no hay editor instalado en el entorno de preparación. Importación, shader, escena generada y Play Mode necesitan validación real. Esta entrega prepara el port con una muestra 2.5D; el modelo 3D y la integración final en el juego principal quedan pendientes.

Añade el paquete a `testables` en `Packages/manifest.json` del proyecto, conservando las otras entradas:

```json
"testables": ["com.cimavilla.costa-verde"]
```

Ejecuta sus tres tests Edit Mode en **Window → General → Test Runner**. Después comprueba en la escena:

1. Sin errores de importación/compilación ni material rosa; símbolo central igual a `SlotEngine.SymbolAt`.
2. M/Espacio debitando 25; C/Escape devolviendo premios y crédito sin jugar.
3. Ratón, teclado y mando; máximo dos retenciones; el avance lleva el símbolo superior a la línea.
4. Pausa del anfitrión y manual durante giro/premio/audio; cerrar ayuda no elimina una pausa del anfitrión.
5. Guardar durante giro y restaurar en otra instancia conserva saldo/resultado; terminar repetido emite un único evento.
6. Volumen/silencio sin voces atrasadas; composición y brillo legibles a 1920×1080 y 1280×720.

Economía del juego principal, mueble 3D, mezcla espacial, cámara de interacción y ajuste al hardware objetivo son el trabajo siguiente del port.
