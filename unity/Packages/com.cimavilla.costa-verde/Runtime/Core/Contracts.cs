using System;

namespace Cimavilla.Minigames
{
    public interface IMinijuego
    {
        string Id { get; }
        void Iniciar(ContextoMinijuego contexto);
        void Pausar(bool pausa);
        ResultadoMinijuego Terminar();
        event Action<ResultadoMinijuego> Terminado;
    }

    [Serializable]
    public sealed class ContextoMinijuego
    {
        public int Pesetas;
        public int Dificultad;
        public int Semilla;
    }

    [Serializable]
    public sealed class ResultadoMinijuego
    {
        public int Puntos;
        public int PesetasDelta;
        public bool Ganado;
        public int Partidas;
        public int MejorPremio;
    }
}
