using UnityEngine;
using UnityEngine.UI;

namespace Cimavilla.Minigames.CostaVerde
{
    public sealed class CostaVerdeView : MonoBehaviour
    {
        public RawImage[] reels, lamps, enabledButtons;
        public Color[] lampColors;
        public int[] lampPhases;
        public Button coinButton, spinButton, cashButton;
        public Button helpButton, soundButton, exitButton, resumeButton;
        public Text soundLabel;
        public Button[] holdButtons;
        public Text credits, bank, wallet, stats, status, hint, marquee, tray;
        public Text[] holdLabels, heldLabels;
        public GameObject winPanel, pausePanel, helpPanel;
        public Text winValue, pauseLabel;
        private Material[] reelMaterials;

        private void Awake()
        {
            // Per-instance materials: two machines must not move each other's reels.
            reelMaterials = new Material[reels.Length];
            for (int i = 0; i < reels.Length; i++)
            {
                reelMaterials[i] = new Material(reels[i].material);
                int[] strip = SlotEngine.Strip(i); var symbols = new float[strip.Length];
                for (int j = 0; j < strip.Length; j++) symbols[j] = strip[j];
                reelMaterials[i].SetFloatArray("_Symbols", symbols);
                reelMaterials[i].SetFloat("_Aspect", reels[i].rectTransform.rect.width / reels[i].rectTransform.rect.height);
                reels[i].material = reelMaterials[i];
            }
        }
        public void SetReel(int index, double position)
        {
            var material = reelMaterials != null ? reelMaterials[index] : reels[index].material;
            material.SetFloat("_Stop", (float)(position % SlotEngine.StripLength(index)));
        }
        public void Render(SlotState state, bool blocked, bool paused, bool finished, bool hostPaused)
        {
            credits.text = (state.credits * SlotEngine.Stake).ToString("D5");
            bank.text = (state.bank * SlotEngine.Stake).ToString("D5");
            wallet.text = state.wallet.ToString("N0", System.Globalization.CultureInfo.GetCultureInfo("es-ES")) + " pts.";
            stats.text = "PARTIDAS  " + state.spins.ToString("D2") + "\nMEJOR PREMIO  " + state.best + " pts.";
            bool ready = state.mode == "idle" || state.mode == "hold" || state.mode == "nudge";
            coinButton.interactable = !blocked && ready && state.wallet >= SlotEngine.Stake;
            spinButton.interactable = !blocked && ready && state.credits > 0;
            cashButton.interactable = !blocked && ready && state.credits + state.bank > 0;
            enabledButtons[0].enabled = coinButton.interactable;
            enabledButtons[1].enabled = spinButton.interactable;
            enabledButtons[2].enabled = cashButton.interactable;
            for (int i = 0; i < 3; i++)
            {
                holdButtons[i].interactable = !blocked && (state.mode == "hold" || state.mode == "nudge");
                enabledButtons[3+i].enabled = holdButtons[i].interactable;
                heldLabels[i].transform.parent.gameObject.SetActive(state.held[i]);
                holdLabels[i].text = state.mode == "nudge" ? "AVANZAR" : "RETENER";
            }
            winPanel.SetActive(state.mode == "win" && !finished);
            winValue.text = "+" + (state.lastWin * SlotEngine.Stake) + " PTS.";
            pausePanel.SetActive(paused && !helpPanel.activeSelf && !finished);
            resumeButton.interactable = !hostPaused;
            pauseLabel.text = hostPaused ? "ESPERANDO AL JUEGO" : "UN MOMENTO…\nP / CONTINUAR";
            status.text = finished ? "HASTA OTRA NOCHE" : state.mode == "spinning" ? "SUERTE" :
                state.mode == "win" ? "¡PREMIO!" : state.mode == "hold" ? "RETENCIONES" :
                state.mode == "nudge" ? "AVANCES GRATIS" : state.credits > 0 ? "PULSE JUGAR" :
                state.bank > 0 ? "PREMIO DISPONIBLE" : "INTRODUZCA MONEDA";
            hint.text = state.mode == "nudge" ? state.nudges + " AVANCES · A / S / D" :
                state.mode == "hold" ? "RETENGA HASTA DOS · A / S / D" : "UNA PARTIDA · 25 PESETAS";
            marquee.text = state.mode == "spinning" ? "¡QUE RUEDEN LOS RODILLOS!" :
                state.mode == "win" ? "¡QUE SUENEN ESAS PESETAS!" : state.mode == "hold" ? "¡GUARDA LOS BUENOS!" :
                state.mode == "nudge" ? "¡UN EMPUJONCITO!" : "¡LA SUERTE LLAMA!";
        }
        public void AnimateLamps(float clock, bool winning, bool reducedMotion)
        {
            for (int i = 0; i < lamps.Length; i++)
            {
                float intensity = reducedMotion ? .65f : winning ?
                    .6f + .4f * Mathf.Sin(clock * Mathf.PI / .65f + lampPhases[i] * .085f) :
                    .45f + .45f * Mathf.Pow(.5f + .5f * Mathf.Sin((clock + lampPhases[i] * .13f) * Mathf.PI * 2 / 3.2f), 3);
                Color c = lampColors[i]; c.a = intensity; lamps[i].color = c;
            }
        }
        public void ShowAnticipation() { status.text = "UNO MÁS…"; marquee.text = "¡CRUZA LOS DEDOS!"; }
        private void OnDestroy()
        {
            if (reelMaterials != null) foreach (var material in reelMaterials) if (material) Destroy(material);
        }
    }
}
