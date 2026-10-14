using UnityEngine;

namespace Cimavilla.Minigames.CostaVerde
{
    // Only the generated sample scene starts a free-standing 500-peseta visit.
    public sealed class CostaVerdeDemo : MonoBehaviour
    {
        public CostaVerdeController machine;
        public int pesetas = 500, seed = 1992;
        private void Start()
        {
            machine.Terminado += result => Debug.Log("Costa Verde finalizó: " + JsonUtility.ToJson(result));
            machine.Iniciar(new ContextoMinijuego { Pesetas = pesetas, Semilla = seed });
        }
        public void NewNight()
        {
            machine.Terminar();
            machine.Iniciar(new ContextoMinijuego { Pesetas = pesetas, Semilla = ++seed });
        }
    }
}
