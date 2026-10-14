using UnityEngine;
using UnityEngine.Audio;

namespace Cimavilla.Minigames.CostaVerde
{
    public sealed class MachineSound : MonoBehaviour
    {
        public AudioClip coin, payoutCoin, click, bonus, anticipation, win, jackpot, attract, motor;
        public AudioClip welcomeVoice, prizeVoice;
        public AudioClip[] stops;
        public AudioMixerGroup effectsOutput, voiceOutput;
        [Range(0,1)] public float volume = 1;
        public bool Muted { get; private set; }
        private AudioSource effects, mechanism, voice;
        private AudioClip queuedVoice;
        private float voiceDelay;
        private bool welcomed, paused;

        private void Awake()
        {
            effects = Source(effectsOutput); mechanism = Source(effectsOutput); voice = Source(voiceOutput);
            mechanism.loop = true; mechanism.clip = motor;
        }
        private AudioSource Source(AudioMixerGroup output)
        {
            var source = gameObject.AddComponent<AudioSource>();
            source.playOnAwake = false; source.spatialBlend = 0; source.outputAudioMixerGroup = output;
            return source;
        }
        public void ResetVisit() { StopAll(); welcomed = false; }
        public void Tick(float delta)
        {
            effects.volume = mechanism.volume = voice.volume = Muted ? 0 : volume;
            if (paused || queuedVoice == null) return;
            voiceDelay -= delta;
            if (voiceDelay <= 0) { voice.clip = queuedVoice; queuedVoice = null; if (!Muted) voice.Play(); }
        }
        public void Play(AudioClip clip)
        { if (!Muted && !paused && clip) { effects.volume = volume; effects.PlayOneShot(clip); } }
        public void Welcome()
        {
            if (welcomed || Muted) return;
            welcomed = true; Play(attract); QueueVoice(welcomeVoice, .16f);
        }
        public void Prize(bool big) { StopVoice(); Play(big ? jackpot : win); QueueVoice(prizeVoice, .36f); }
        private void QueueVoice(AudioClip clip, float delay)
        { if (Muted) return; StopVoice(); queuedVoice = clip; voiceDelay = delay; }
        public void StopVoice() { queuedVoice = null; if (voice) voice.Stop(); }
        public void StartMotor()
        { StopVoice(); mechanism.volume = Muted ? 0 : volume; mechanism.Play(); }
        public void StopMotor() { if (mechanism) mechanism.Stop(); }
        public void StopAll()
        { StopVoice(); StopMotor(); if (effects) effects.Stop(); paused = false; }
        public void SetPaused(bool value)
        {
            paused = value;
            foreach (var source in new[] { effects, mechanism, voice })
                if (source) { if (value) source.Pause(); else source.UnPause(); }
        }
        public void ToggleMuted()
        {
            Muted = !Muted; if (Muted) StopVoice();
            effects.volume = mechanism.volume = voice.volume = Muted ? 0 : volume;
        }
        private void OnDisable() { StopAll(); }
    }
}
