using System;

namespace Cimavilla.Minigames.CostaVerde
{
    // A local clock: no Time.timeScale or UnityEngine.Random dependencies.
    public sealed class ReelMotion
    {
        private readonly double start, travel, duration;
        private double elapsed;
        public readonly int Target;
        public double Position { get; private set; }
        public bool Done { get { return elapsed >= duration; } }
        public ReelMotion(double initial, int target, int length, int turns, double seconds)
        {
            if (length < 1 || seconds <= 0 || turns < 0) throw new ArgumentOutOfRangeException();
            start = initial; Target = target; duration = seconds;
            travel = ((target - initial) % length + length) % length + turns * length;
            Position = initial;
        }
        public void Advance(double deltaSeconds, bool paused)
        {
            if (paused || Done) return;
            elapsed = Math.Min(duration, elapsed + Math.Max(0, deltaSeconds));
            double t = elapsed / duration;
            Position = Done ? Target : start + travel * (t - Math.Sin(t * 2 * Math.PI) / (2 * Math.PI));
        }
    }
}
