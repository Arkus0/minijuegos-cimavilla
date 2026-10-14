using System;

namespace Cimavilla.Minigames.CostaVerde
{
    // Owns one visit to the machine. The host owns persistence and the overall wallet.
    public sealed class SlotSession : IMinijuego
    {
        public string Id { get { return "tragaperras"; } }
        public SlotEngine Engine { get; private set; }
        public bool Paused { get; private set; }
        public bool Finished { get; private set; }
        public bool Active { get { return Engine != null && !Finished; } }
        public event Action<ResultadoMinijuego> Terminado;

        public void Iniciar(ContextoMinijuego contexto) { Iniciar(contexto, null); }
        public void Iniciar(ContextoMinijuego contexto, SlotState saved)
        {
            if (contexto == null) throw new ArgumentNullException(nameof(contexto));
            if (Active) throw new InvalidOperationException("Termina la visita actual antes de iniciar otra.");
            Engine = new SlotEngine(contexto.Pesetas, contexto.Semilla, saved);
            Paused = false; Finished = false;
        }
        public void Pausar(bool pausa) { Paused = pausa; }
        private bool Accept { get { return Active && !Paused; } }
        public bool InsertCoin() { return Accept && Engine.InsertCoin(); }
        public SpinPlan BeginSpin() { return Accept ? Engine.BeginSpin() : null; }
        public SlotOutcome FinishSpin() { return Accept ? Engine.FinishSpin() : null; }
        public bool ToggleHold(int index) { return Accept && Engine.ToggleHold(index); }
        public SlotOutcome Nudge(int index) { return Accept ? Engine.Nudge(index) : null; }
        public void SettleWin() { if (Accept) Engine.SettleWin(); }
        public int CashOut() { return Accept ? Engine.CashOut() : 0; }

        public ResultadoMinijuego Terminar()
        {
            if (Engine == null) return null;
            if (!Finished)
            {
                // Closing during a spin, a win or pause must neither lose nor replay money.
                Engine.FinishSpin(); Engine.SettleWin(); Engine.CashOut();
                Finished = true; Paused = false;
                var callback = Terminado;
                var result = Engine.Result();
                if (callback != null) callback(result);
                return result;
            }
            return Engine.Result();
        }
    }
}
