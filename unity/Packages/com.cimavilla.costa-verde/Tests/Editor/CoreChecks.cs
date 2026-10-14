using System;
using Cimavilla.Minigames;
using Cimavilla.Minigames.CostaVerde;

namespace Cimavilla.CostaVerde.Tests
{
    [Serializable] public sealed class GoldenFile { public GoldenCase[] cases; }
    [Serializable] public sealed class GoldenCase { public int seed, pesetas; public GoldenStep[] steps; }
    [Serializable] public sealed class GoldenStep { public string operation; public int arg; public SlotState expected; }

    public static class CoreChecks
    {
        private static void Require(bool condition, string message)
        { if (!condition) throw new InvalidOperationException(message); }

        public static int Parity(GoldenFile file, Func<SlotState, string> serialize)
        {
            int checkpoints = 0;
            foreach (var c in file.cases)
            {
                var engine = new SlotEngine(c.pesetas, c.seed);
                foreach (var s in c.steps)
                {
                    switch (s.operation)
                    {
                        case "restore": engine = new SlotEngine(snapshot: engine.Snapshot()); break;
                        case "insertCoin": engine.InsertCoin(); break;
                        case "toggleHold": engine.ToggleHold(s.arg); break;
                        case "beginSpin": engine.BeginSpin(); break;
                        case "finishSpin": engine.FinishSpin(); break;
                        case "nudge": engine.Nudge(s.arg); break;
                        case "settleWin": engine.SettleWin(); break;
                        case "cashOut": engine.CashOut(); break;
                        default: throw new InvalidOperationException(s.operation);
                    }
                    Require(serialize(s.expected) == serialize(engine.Snapshot()),
                        "Web/C# mismatch: seed " + c.seed + ", checkpoint " + checkpoints + ", " + s.operation);
                    checkpoints++;
                }
            }
            return checkpoints;
        }

        public static void Lifecycle()
        {
            var session = new SlotSession(); int events = 0;
            session.Terminado += result => events++;
            session.Iniciar(new ContextoMinijuego { Pesetas = 500, Semilla = 1992 });
            Require(session.InsertCoin(), "Coin rejected");
            Require(session.BeginSpin() != null, "Spin rejected");
            var saved = session.Engine.Snapshot();
            var restored = new SlotEngine(snapshot: saved);
            var expected = restored.Result();
            session.Pausar(true);
            Require(!session.InsertCoin() && session.BeginSpin() == null && session.FinishSpin() == null,
                "Pause accepted an action");
            var result = session.Terminar();
            Require(events == 1 && result.PesetasDelta == expected.PesetasDelta && result.Puntos == expected.Puntos,
                "Closing a paused paid spin lost money or changed its result");
            session.Terminar();
            Require(events == 1 && !session.Active && !session.InsertCoin(), "Finish fired twice or accepted input");
            session.Iniciar(new ContextoMinijuego { Pesetas = 100, Semilla = 1 });
            session.InsertCoin(); session.InsertCoin();
            Require(session.Terminar().PesetasDelta == 0 && events == 2, "Unused credit was not refunded");
            var reentrant = new SlotSession();
            reentrant.Iniciar(new ContextoMinijuego { Pesetas=500,Semilla=1992 });
            reentrant.InsertCoin(); reentrant.BeginSpin();
            reentrant.Terminado += prior => reentrant.Iniciar(new ContextoMinijuego { Pesetas=900,Semilla=1 });
            Require(reentrant.Terminar().Partidas == 1 && reentrant.Engine.Snapshot().wallet == 900,
                "A host starting a new visit changed the returned prior result");

            var engine = new SlotEngine(); var copy = engine.Snapshot();
            copy.positions[0] = 10; copy.wallet = 0;
            Require(engine.Snapshot().positions[0] == 0 && engine.Snapshot().wallet == 500, "Save aliases live state");
            Require(!SlotEngine.IsValid(new SlotState { mode = "spinning", rng = 1 }), "Invalid pending save accepted");
            for (int s = 0; s < 5; s++) Require(SlotEngine.Score(s,s,s) == new[] {5,10,20,50,100}[s], "Payout changed");
            Require(SlotEngine.Score(0,0,3) == 2 && SlotEngine.Score(1,1,0) == 0, "Partial payout changed");
            var nudge = new SlotEngine(snapshot: new SlotState { wallet=500,initialWallet=500,rng=1,
                mode="nudge",nudges=3,positions=new[]{20,1,6} });
            nudge.Nudge(0);
            Require(nudge.Snapshot().positions[0] == 0 && nudge.Snapshot().nudges == 2 && nudge.Snapshot().spins == 0,
                "Free nudge did not follow the physical wrap");

            var motion = new ReelMotion(0, 20, 21, 2, 2.25);
            motion.Advance(.5, false); double position = motion.Position;
            motion.Advance(30, true);
            Require(motion.Position == position && !motion.Done, "Pause advanced the reel");
            motion.Advance(30, false);
            Require(motion.Done && motion.Position == 20, "Frame overrun missed the target");
        }
    }
}
