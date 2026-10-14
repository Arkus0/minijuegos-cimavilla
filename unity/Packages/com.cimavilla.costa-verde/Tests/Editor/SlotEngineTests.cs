using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using Newtonsoft.Json;

namespace Cimavilla.CostaVerde.Tests
{
    public class SlotEngineTests
    {
        [Test] public void MatchesPublishedWebEngine()
        {
            var json = AssetDatabase.LoadAssetAtPath<TextAsset>(
                "Packages/com.cimavilla.costa-verde/Tests/Fixtures/web-parity.json");
            Assert.IsNotNull(json);
            Assert.Greater(CoreChecks.Parity(JsonConvert.DeserializeObject<GoldenFile>(json.text), s => JsonConvert.SerializeObject(s)), 400);
        }
        [Test] public void ProtectsWalletPauseAndSingleFinishEvent() { CoreChecks.Lifecycle(); }
        [Test] public void NativeJsonRoundTripPreservesNullPendingAndUnsignedSeed()
        {
            var engine = new Cimavilla.Minigames.CostaVerde.SlotEngine(seed: -123);
            var json = JsonConvert.SerializeObject(engine.Snapshot());
            var saved = JsonConvert.DeserializeObject<Cimavilla.Minigames.CostaVerde.SlotState>(json);
            Assert.IsTrue(Cimavilla.Minigames.CostaVerde.SlotEngine.IsValid(saved));
            Assert.IsNull(saved.pending); Assert.AreEqual(unchecked((uint)-123),saved.rng);
            engine.InsertCoin(); engine.BeginSpin();
            saved = JsonConvert.DeserializeObject<Cimavilla.Minigames.CostaVerde.SlotState>(JsonConvert.SerializeObject(engine.Snapshot()));
            Assert.IsTrue(Cimavilla.Minigames.CostaVerde.SlotEngine.IsValid(saved));
            Assert.AreEqual(engine.Snapshot().pending.targets,saved.pending.targets);
        }
    }
}
