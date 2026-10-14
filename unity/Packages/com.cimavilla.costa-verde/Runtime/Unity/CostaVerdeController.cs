using System;
using UnityEngine;
using UnityEngine.InputSystem;
using Newtonsoft.Json;

namespace Cimavilla.Minigames.CostaVerde
{
    public sealed class CostaVerdeController : MonoBehaviour, IMinijuego
    {
        public CostaVerdeView view;
        public MachineSound sound;
        public CoinShower coins;
        public InputActionAsset inputActions;
        public bool reducedMotion;
        public string Id { get { return "tragaperras"; } }
        public event Action<ResultadoMinijuego> Terminado;
        private readonly SlotSession session = new SlotSession();
        private readonly ReelMotion[] motions = new ReelMotion[3];
        private InputActionAsset ownedActions;
        private InputActionMap map;
        private SlotOutcome nudgeOutcome;
        private SpinPlan currentPlan;
        private float clock, idleClock, lastAttract, winTime, payoutTime, payoutNext;
        private int payoutCoins;
        private bool hostPaused, manualPaused, focusPaused, subscribed;
        private bool Busy { get { return HasMotion || winTime > 0 || payoutTime > 0; } }
        private bool HasMotion { get { return motions[0] != null || motions[1] != null || motions[2] != null; } }

        private void Awake() { Configure(); }
        private void Configure()
        {
            if (subscribed) return;
            subscribed = true;
            ownedActions = Instantiate(inputActions);
            map = ownedActions.FindActionMap("CostaVerde", true);
            foreach (var action in map.actions) action.performed += OnAction;
            view.coinButton.onClick.AddListener(InsertCoin);
            view.spinButton.onClick.AddListener(Spin);
            view.cashButton.onClick.AddListener(CashOut);
            for (int i = 0; i < 3; i++) { int reel = i; view.holdButtons[i].onClick.AddListener(() => ReelAction(reel)); }
            view.helpButton.onClick.AddListener(ToggleHelp);
            view.soundButton.onClick.AddListener(ToggleSound);
            view.exitButton.onClick.AddListener(Exit);
            view.resumeButton.onClick.AddListener(TogglePause);
        }
        public void Iniciar(ContextoMinijuego context) { Iniciar(context, null); }
        public void Iniciar(ContextoMinijuego context, string savedJson)
        {
            Configure();
            SlotState saved = string.IsNullOrEmpty(savedJson) ? null : JsonConvert.DeserializeObject<SlotState>(savedJson);
            if (saved != null && !SlotEngine.IsValid(saved)) throw new ArgumentException("Guardado inválido", nameof(savedJson));
            session.Iniciar(context, saved);
            hostPaused = manualPaused = focusPaused = false;
            clock = idleClock = lastAttract = winTime = payoutTime = 0;
            currentPlan = null; nudgeOutcome = null;
            for (int i = 0; i < 3; i++) { motions[i] = null; view.SetReel(i, session.Engine.Snapshot().positions[i]); }
            view.helpPanel.SetActive(false); sound.ResetVisit(); coins.Clear(); map.Enable(); Refresh();
        }
        public string Guardar()
        {
            return session.Active ? JsonConvert.SerializeObject(session.Engine.Snapshot()) : null;
        }
        public void Pausar(bool pause) { hostPaused = pause; ApplyPause(); }
        public void TogglePause() { if (hostPaused) return; manualPaused = !manualPaused; ApplyPause(); }
        public void ToggleHelp() { view.helpPanel.SetActive(!view.helpPanel.activeSelf); ApplyPause(); }
        public void ToggleSound() { sound.ToggleMuted(); view.soundLabel.text = sound.Muted ? "SONIDO: OFF" : "SONIDO: ON"; }
        public void Exit() { Terminar(); }
        private void ApplyPause()
        {
            bool paused = hostPaused || manualPaused || focusPaused || view.helpPanel.activeSelf;
            session.Pausar(paused); sound.SetPaused(paused); Refresh();
        }
        private void OnApplicationFocus(bool focused)
        { focusPaused = !focused; if (session.Active) ApplyPause(); }
        private void OnAction(InputAction.CallbackContext ctx)
        {
            switch (ctx.action.name)
            {
                case "Coin": InsertCoin(); break;
                case "Spin": Spin(); break;
                case "CashOut": CashOut(); break;
                case "Hold1": ReelAction(0); break;
                case "Hold2": ReelAction(1); break;
                case "Hold3": ReelAction(2); break;
                case "Pause": TogglePause(); break;
                case "Help": ToggleHelp(); break;
                case "ToggleSound": ToggleSound(); break;
                case "Exit": if (view.helpPanel.activeSelf) ToggleHelp(); else Terminar(); break;
            }
        }
        private bool Accept { get { return session.Active && !session.Paused && !Busy; } }
        public void InsertCoin()
        {
            if (!Accept || !session.InsertCoin()) return;
            idleClock = 0; sound.Play(sound.coin); sound.Welcome(); Refresh();
        }
        public void Spin()
        {
            if (!Accept) return;
            var initial = session.Engine.Snapshot().positions;
            currentPlan = session.BeginSpin(); if (currentPlan == null) return;
            idleClock = 0; sound.Play(sound.click); sound.StartMotor();
            bool suspense = SlotEngine.SymbolAt(0,currentPlan.targets[0]) == SlotEngine.SymbolAt(1,currentPlan.targets[1]);
            for (int i = 0; i < 3; i++) if (!currentPlan.held[i])
            {
                double duration = 2.25 + .58*i + (i == 2 && suspense ? .65 : 0);
                motions[i] = new ReelMotion(initial[i],currentPlan.targets[i],SlotEngine.StripLength(i),2+i,reducedMotion ? .42 : duration);
            }
            Refresh();
        }
        public void ReelAction(int index)
        {
            if (!Accept || index < 0 || index > 2) return;
            idleClock = 0;
            if (session.Engine.Mode == "hold") { if (session.ToggleHold(index)) sound.Play(sound.click); }
            else if (session.Engine.Mode == "nudge")
            {
                int initial = session.Engine.Snapshot().positions[index];
                nudgeOutcome = session.Nudge(index);
                if (nudgeOutcome != null)
                {
                    sound.Play(sound.click);
                    motions[index] = new ReelMotion(initial,session.Engine.Snapshot().positions[index],SlotEngine.StripLength(index),0,.38);
                }
            }
            Refresh();
        }
        public void CashOut()
        {
            if (!Accept) return;
            int amount = session.CashOut(); if (amount == 0) return;
            sound.StopVoice(); idleClock = 0;
            payoutCoins = Math.Min(amount / SlotEngine.Stake,18); payoutTime = payoutCoins*.07f+.4f; payoutNext = 0;
            if (!reducedMotion) coins.Begin(payoutTime,false);
            view.tray.text = amount + " PTS. COBRADAS"; Refresh();
        }
        private void Update()
        {
            if (!session.Active || session.Paused) return;
            float delta = Time.unscaledDeltaTime; clock += delta; idleClock += delta; sound.Tick(delta);
            coins.Tick(delta);
            view.AnimateLamps(clock,session.Engine.Mode == "win",reducedMotion);
            bool wasMoving = HasMotion;
            for (int i = 0; i < 3; i++) if (motions[i] != null)
            {
                motions[i].Advance(delta,false); view.SetReel(i,motions[i].Position);
                if (motions[i].Done)
                {
                    motions[i] = null; sound.Play(sound.stops[i]);
                    if (i == 1 && currentPlan != null && !currentPlan.held[2] && motions[2] != null &&
                        SlotEngine.SymbolAt(0,currentPlan.targets[0]) == SlotEngine.SymbolAt(1,currentPlan.targets[1]))
                    { sound.StopVoice(); sound.Play(sound.anticipation); view.ShowAnticipation(); }
                }
            }
            if (wasMoving && !HasMotion)
            {
                sound.StopMotor(); var outcome = nudgeOutcome ?? session.FinishSpin();
                nudgeOutcome = null; currentPlan = null; Present(outcome);
            }
            if (winTime > 0 && !(wasMoving && !HasMotion))
            {
                winTime = Mathf.Max(0,winTime-delta);
                if (winTime == 0) { session.SettleWin(); Refresh(); }
            }
            if (payoutTime > 0)
            {
                payoutTime = Mathf.Max(0,payoutTime-delta); payoutNext -= delta;
                while (payoutCoins > 0 && payoutNext <= 0)
                { sound.Play(sound.payoutCoin); payoutCoins--; payoutNext += .07f; }
                if (payoutTime == 0) Refresh();
            }
            if (!Busy && session.Engine.Mode == "idle" && idleClock >= 18 && clock-lastAttract >= 26)
            { sound.Play(sound.attract); lastAttract = clock; }
        }
        private void Present(SlotOutcome outcome)
        {
            if (outcome == null) return;
            if (outcome.Type == "win")
            {
                bool big = outcome.Reward >= 50;
                winTime = reducedMotion || sound.Muted ? 1.4f : big ? 3.3f : 2.9f;
                sound.Prize(big);
                if (!reducedMotion) coins.Begin(winTime,true);
            }
            else if (outcome.Type == "hold" || outcome.Type == "nudge") { sound.StopVoice(); sound.Play(sound.bonus); }
            Refresh();
        }
        private void Refresh()
        {
            if (session.Engine != null) view.Render(session.Engine.Snapshot(),!Accept,session.Paused,session.Finished,hostPaused);
            if (nudgeOutcome != null) view.winPanel.SetActive(false);
        }
        public ResultadoMinijuego Terminar()
        {
            bool wasActive = session.Active;
            if (map != null) map.Disable(); sound.StopAll(); coins.Clear();
            for (int i = 0; i < 3; i++) motions[i] = null;
            nudgeOutcome = null; currentPlan = null; winTime = payoutTime = 0;
            view.helpPanel.SetActive(false);
            var result = session.Terminar();
            if (session.Engine != null)
                for (int i = 0; i < 3; i++) view.SetReel(i,session.Engine.Snapshot().positions[i]);
            Refresh();
            if (wasActive && Terminado != null) Terminado(result);
            return result;
        }
        private void OnEnable() { if (session.Active) { map.Enable(); ApplyPause(); } }
        private void OnDisable() { if (map != null) map.Disable(); if (sound) sound.SetPaused(true); }
        private void OnDestroy()
        {
            // Hosts must call Terminar before destroying the prefab; lifecycle callbacks do not mutate their wallet.
            if (ownedActions) Destroy(ownedActions);
        }
    }
}
