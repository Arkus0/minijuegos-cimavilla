using System;

namespace Cimavilla.Minigames.CostaVerde
{
    // Field names intentionally match game.mjs: saves and parity vectors share a schema.
    [Serializable]
    public sealed class SpinPlan
    {
        public int[] targets;
        public bool[] held;
        public SpinPlan Copy() { return new SpinPlan { targets = (int[])targets.Clone(), held = (bool[])held.Clone() }; }
    }

    [Serializable]
    public sealed class SlotState
    {
        public int version = 1;
        public int wallet, initialWallet, credits, bank;
        public int[] positions = { 0, 1, 6 };
        public bool[] held = { false, false, false };
        public string mode = "idle";
        public int nudges, spins, wins, best, lastWin, totalWon;
        public SpinPlan pending;
        public uint rng;

        public SlotState Copy()
        {
            var copy = (SlotState)MemberwiseClone();
            copy.positions = (int[])positions.Clone();
            copy.held = (bool[])held.Clone();
            copy.pending = pending == null ? null : pending.Copy();
            return copy;
        }
    }

    public sealed class SlotOutcome
    {
        public readonly string Type;
        public readonly int Reward;
        public readonly int Nudges;
        public SlotOutcome(string type, int reward = 0, int nudges = 0)
        { Type = type; Reward = reward; Nudges = nudges; }
    }
}
