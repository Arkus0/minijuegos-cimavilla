# Interfaz común para portar a Unity

Cada minijuego es un módulo independiente (carpeta + asmdef propio) que implementa:

```csharp
public interface IMinijuego {
    string Id { get; }                       // igual que en juegos.js
    void Iniciar(ContextoMinijuego ctx);     // créditos, dificultad, semilla
    void Pausar(bool pausa);
    event System.Action<ResultadoMinijuego> Terminado;
}
public class ContextoMinijuego { public int Pesetas; public int Dificultad; public int Semilla; }
public class ResultadoMinijuego { public int Puntos; public int PesetasDelta; public bool Ganado; }
```

Entrada solo con el Input System (acciones con nombre, no teclas fijas). Sin estado global: todo entra por ContextoMinijuego y sale por Terminado.
En la web, cada juego debería avisar al terminar con `parent.postMessage({tipo:"fin",id,puntos,ganado},"*")`, que es el mismo contrato.
