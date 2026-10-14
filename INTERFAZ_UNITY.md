# Interfaz común para portar a Unity

Cada minijuego es un módulo independiente (carpeta + asmdef propio) que implementa:

```csharp
public interface IMinijuego {
    string Id { get; }                       // igual que en juegos.js
    void Iniciar(ContextoMinijuego ctx);     // créditos, dificultad, semilla
    void Pausar(bool pausa);
    ResultadoMinijuego Terminar();          // liquida la visita y emite un único evento
    event System.Action<ResultadoMinijuego> Terminado;
}
public class ContextoMinijuego { public int Pesetas; public int Dificultad; public int Semilla; }
public class ResultadoMinijuego {
    public int Puntos; public int PesetasDelta; public bool Ganado;
    public int Partidas; public int MejorPremio;
}
```

Entrada solo con el Input System (acciones con nombre, no teclas fijas). Sin estado global: todo entra por ContextoMinijuego y sale por Terminado.
En la web, cada juego debería avisar al terminar con `parent.postMessage({tipo:"fin",id,puntos,ganado},"*")`, que es el mismo contrato.

## Implementación nativa disponible

Las tragaperras ya tienen este contrato en [Contracts.cs](unity/Packages/com.cimavilla.costa-verde/Runtime/Core/Contracts.cs), un motor puro de C# y un adaptador con Input System para **Unity 6 URP**. [Instalación del paquete y escena de prueba](unity/README.md).

`CostaVerdeController.Iniciar(contexto)` inicia una visita; `Pausar(bool)` añade/quita la pausa del anfitrión. `Terminar()` completa la tirada pagada pendiente, devuelve crédito y premios y emite `Terminado` una sola vez. El anfitrión aplica `PesetasDelta` en ese evento y llama a `Terminar()` antes de destruir el prefab. No se debe aplicar otra vez el resultado devuelto por el método.

`Guardar()` devuelve un JSON v1 y `Iniciar(contexto, json)` restaura la visita. El anfitrión persiste el JSON y su identificador de visita; descarta el guardado al liquidarla. En las tragaperras la semilla reproduce rodillos y bonus, `Dificultad` no altera probabilidades y el saldo guardado conserva el saldo inicial de esa visita. El paquete no escribe PlayerPrefs ni cambia el monedero global o `Time.timeScale`.
