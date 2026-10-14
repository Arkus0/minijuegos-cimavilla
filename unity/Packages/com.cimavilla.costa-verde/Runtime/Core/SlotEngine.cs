using System;

namespace Cimavilla.Minigames.CostaVerde
{
    public sealed class SlotEngine
    {
        public const int Stake = 25;
        public const uint ZeroSeed = 0x6d2b79f5u;
        public static readonly string[] Symbols = { "cherry", "lemon", "watermelon", "seven", "bell" };
        // Indexes refer to Symbols; exact order and weights match the web's physical strips.
        private static readonly int[][] Strips = {
            new[] {0,1,0,2,1,0,3,1,0,2,0,4,1,0,2,1,3,0,1,2,0},
            new[] {2,1,0,1,3,0,2,0,1,4,0,1,2,0,3,1,0,2,1,0,0},
            new[] {1,0,2,0,1,2,3,0,1,0,4,1,0,2,1,3,0,1,2,0,0}
        };
        private static readonly int[] Pays = { 5, 10, 20, 50, 100 };
        private SlotState state;

        public SlotEngine(int pesetas = 500, int seed = 1992, SlotState snapshot = null)
        {
            if (pesetas < 0) throw new ArgumentOutOfRangeException(nameof(pesetas));
            state = new SlotState { wallet = pesetas, initialWallet = pesetas, rng = unchecked((uint)seed) };
            if (state.rng == 0) state.rng = ZeroSeed;
            if (IsValid(snapshot))
            {
                state = snapshot.Copy();
                if (state.mode == "spinning") FinishSpin();
                if (state.mode == "win") SettleWin();
            }
        }

        public string Mode { get { return state.mode; } }
        public bool CanSpin { get { return Ready && state.credits > 0; } }
        public bool CanCashOut { get { return Ready && ((long)state.credits + state.bank) > 0; } }
        public bool Empty { get { return state.wallet < Stake && state.credits == 0 && state.bank == 0; } }
        private bool Ready { get { return state.mode == "idle" || state.mode == "hold" || state.mode == "nudge"; } }
        public SlotState Snapshot() { return state.Copy(); }
        public static int StripLength(int reel) { CheckReel(reel); return Strips[reel].Length; }
        public static int SymbolAt(int reel, int position)
        {
            CheckReel(reel);
            int length = Strips[reel].Length;
            return Strips[reel][((position % length) + length) % length];
        }
        public static int[] Strip(int reel) { CheckReel(reel); return (int[])Strips[reel].Clone(); }
        private static void CheckReel(int reel)
        { if (reel < 0 || reel > 2) throw new ArgumentOutOfRangeException(nameof(reel)); }

        private double Random()
        {
            uint x = state.rng;
            unchecked { x ^= x << 13; x ^= x >> 17; x ^= x << 5; }
            state.rng = x;
            return x / 4294967296.0;
        }

        public static int Score(int a, int b, int c)
        {
            if (a < 0 || b < 0 || c < 0 || a > 4 || b > 4 || c > 4) return 0;
            if (a == b && b == c) return Pays[a];
            return a == 0 && b == 0 ? 2 : 0;
        }

        public bool InsertCoin()
        {
            if (!Ready || state.wallet < Stake) return false;
            int credits = checked(state.credits + 1);
            state.wallet -= Stake; state.credits = credits;
            return true;
        }

        public SpinPlan BeginSpin()
        {
            if (!CanSpin) return null;
            int spins = checked(state.spins + 1);
            var held = state.mode == "hold" ? (bool[])state.held.Clone() : new bool[3];
            var targets = new int[3];
            for (int i = 0; i < 3; i++)
                targets[i] = held[i] ? state.positions[i] : (int)Math.Floor(Random() * Strips[i].Length);
            state.credits--; state.spins = spins; state.mode = "spinning";
            state.nudges = 0; state.lastWin = 0;
            state.pending = new SpinPlan { targets = targets, held = held };
            return state.pending.Copy();
        }

        public SlotOutcome FinishSpin()
        {
            if (state.mode != "spinning" || state.pending == null) return null;
            state.positions = (int[])state.pending.targets.Clone();
            state.pending = null; state.held = new bool[3];
            return Resolve(true);
        }

        private SlotOutcome Resolve(bool fresh)
        {
            int reward = Score(SymbolAt(0, state.positions[0]), SymbolAt(1, state.positions[1]), SymbolAt(2, state.positions[2]));
            if (reward > 0)
            {
                int bank = checked(state.bank + reward);
                int totalWon = checked(state.totalWon + reward * Stake);
                int wins = checked(state.wins + 1);
                state.bank = bank; state.totalWon = totalWon; state.wins = wins;
                state.lastWin = reward; state.best = Math.Max(state.best, reward * Stake);
                state.nudges = 0; state.mode = "win";
                return new SlotOutcome("win", reward);
            }
            if (fresh)
            {
                double chance = Random();
                if (chance < .22)
                {
                    state.mode = "nudge"; state.nudges = 1 + (int)Math.Floor(Random() * 3);
                    return new SlotOutcome("nudge", nudges: state.nudges);
                }
                if (chance < .44) { state.mode = "hold"; return new SlotOutcome("hold"); }
            }
            state.mode = state.nudges > 0 ? "nudge" : "idle";
            return new SlotOutcome(state.mode == "nudge" ? "nudge" : "loss", nudges: state.nudges);
        }

        public bool ToggleHold(int index)
        {
            if (state.mode != "hold" || index < 0 || index > 2) return false;
            int count = 0; foreach (bool held in state.held) if (held) count++;
            if (!state.held[index] && count >= 2) return false;
            state.held[index] = !state.held[index]; return true;
        }

        public SlotOutcome Nudge(int index)
        {
            if (state.mode != "nudge" || state.nudges < 1 || index < 0 || index > 2) return null;
            state.positions[index] = (state.positions[index] + 1) % Strips[index].Length;
            state.nudges--; return Resolve(false);
        }

        public void SettleWin() { if (state.mode == "win") state.mode = "idle"; }

        public int CashOut()
        {
            if (!CanCashOut) return 0;
            int money = checked((state.credits + state.bank) * Stake);
            int wallet = checked(state.wallet + money);
            state.wallet = wallet; state.credits = 0; state.bank = 0;
            state.held = new bool[3]; state.nudges = 0; state.mode = "idle";
            return money;
        }

        public ResultadoMinijuego Result()
        {
            return new ResultadoMinijuego {
                Puntos = state.totalWon,
                PesetasDelta = checked(state.wallet + (state.credits + state.bank) * Stake - state.initialWallet),
                Ganado = state.wins > 0, Partidas = state.spins, MejorPremio = state.best
            };
        }

        public static bool IsValid(SlotState s)
        {
            if (s == null || s.version != 1 || s.rng == 0) return false;
            if (s.mode != "idle" && s.mode != "hold" && s.mode != "nudge" && s.mode != "spinning" && s.mode != "win") return false;
            if (s.wallet < 0 || s.initialWallet < 0 || s.credits < 0 || s.bank < 0 || s.nudges < 0 || s.nudges > 3 ||
                s.spins < 0 || s.wins < 0 || s.best < 0 || s.lastWin < 0 || s.totalWon < 0) return false;
            if (!ValidPositions(s.positions) || !ValidHolds(s.held)) return false;
            if (s.mode == "spinning") return s.pending != null && ValidPositions(s.pending.targets) && ValidHolds(s.pending.held);
            return s.pending == null;
        }
        private static bool ValidPositions(int[] p)
        {
            if (p == null || p.Length != 3) return false;
            for (int i = 0; i < 3; i++) if (p[i] < 0 || p[i] >= Strips[i].Length) return false;
            return true;
        }
        private static bool ValidHolds(bool[] h)
        {
            if (h == null || h.Length != 3) return false;
            int count = 0; foreach (bool held in h) if (held) count++;
            return count <= 2;
        }
    }
}
