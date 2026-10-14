import test from 'node:test';
import assert from 'node:assert/strict';
import { SlotGame, STAKE, STRIPS, SYMBOLS, PAYOUTS, score, validSnapshot } from './game.mjs';

function findMode(mode) {
  for (let seed = 1; seed < 2000; seed++) {
    const game = new SlotGame({ seed }); game.insertCoin(); game.beginSpin(); game.finishSpin();
    if (game.state.mode === mode) return game;
  }
  throw new Error(`No seed for ${mode}`);
}

test('all payline combinations follow the posted table', () => {
  for (const a of SYMBOLS) for (const b of SYMBOLS) for (const c of SYMBOLS) {
    const expected = a === b && b === c ? PAYOUTS[a] : a === 'cherry' && b === 'cherry' ? 2 : 0;
    assert.equal(score([a,b,c]), expected);
  }
});

test('inserting and refunding unplayed credit preserves every peseta', () => {
  const game = new SlotGame({ pesetas: 76, seed: 1 });
  for (let i = 0; i < 3; i++) assert.equal(game.insertCoin(), true);
  assert.equal(game.insertCoin(), false);
  assert.equal(game.state.wallet, 1);
  assert.equal(game.cashOut(), 75);
  assert.equal(game.state.wallet, 76);
  assert.equal(game.cashOut(), 0);
  assert.equal(game.result().pesetasDelta, 0);
});

test('a pending spin cannot charge twice or accept other machine input', () => {
  const game = new SlotGame({ seed: 35 }); game.insertCoin(); game.insertCoin();
  assert.ok(game.beginSpin());
  assert.equal(game.beginSpin(), null);
  assert.equal(game.insertCoin(), false);
  assert.equal(game.cashOut(), 0);
  assert.equal(game.toggleHold(0), false);
  assert.equal(game.nudge(0), null);
  assert.equal(game.state.spins, 1);
  assert.equal(game.state.credits, 1);
});

test('reloading during a paid spin restores the chosen result exactly once', () => {
  const original = new SlotGame({ seed: 240 }); original.insertCoin(); original.beginSpin();
  const saved = original.snapshot();
  assert.equal(validSnapshot(saved), true);
  original.finishSpin(); original.settleWin();
  const restored = new SlotGame({ snapshot: saved });
  assert.deepEqual(restored.snapshot(), original.snapshot());
  const again = new SlotGame({ snapshot: restored.snapshot() });
  assert.deepEqual(again.snapshot(), restored.snapshot());
});

test('retentions preserve chosen physical stops and require a paid spin', () => {
  const game = findMode('hold');
  assert.equal(game.toggleHold(0), true); assert.equal(game.toggleHold(1), true);
  assert.equal(game.toggleHold(2), false);
  assert.equal(game.toggleHold(-1), false); assert.equal(game.toggleHold(3), false);
  const before = [...game.state.positions];
  assert.equal(game.beginSpin(), null);
  game.insertCoin();
  const plan = game.beginSpin();
  assert.deepEqual(plan.held, [true,true,false]);
  assert.equal(plan.targets[0], before[0]); assert.equal(plan.targets[1], before[1]);
  game.finishSpin(); assert.deepEqual(game.state.held, [false,false,false]);
});

test('each nudge advances one physical stop, costs no money and can pay only once', () => {
  const game = findMode('nudge');
  const before = game.snapshot(), next = (before.positions[0] + 1) % STRIPS[0].length;
  assert.equal(game.nudge(3), null); assert.equal(game.state.nudges, before.nudges);
  const outcome = game.nudge(0);
  assert.equal(game.state.positions[0], next);
  assert.equal(game.state.wallet, before.wallet); assert.equal(game.state.credits, before.credits);
  assert.equal(game.state.spins, before.spins);
  if (outcome.type === 'win') {
    const bank = game.state.bank; assert.equal(game.nudge(0), null); assert.equal(game.state.bank, bank);
  } else assert.equal(game.state.nudges, before.nudges - 1);
});

test('cashout returns both prize and unplayed credits, once', () => {
  const game = findMode('win'), reward = game.state.lastWin * STAKE;
  assert.equal(game.cashOut(), 0); game.settleWin();
  game.insertCoin();
  assert.equal(game.cashOut(), reward + STAKE);
  assert.equal(game.state.wallet, 500 - STAKE + reward);
  assert.equal(game.state.bank, 0); assert.equal(game.state.credits, 0);
  assert.equal(game.result().pesetasDelta, reward - STAKE);
});

test('seeded sessions reproduce bonuses, positions and winnings', () => {
  const a = new SlotGame({ seed: 1992 }), b = new SlotGame({ seed: 1992 });
  for (let i = 0; i < 15; i++) {
    for (const g of [a,b]) {
      g.settleWin(); g.cashOut(); g.insertCoin(); g.beginSpin(); g.finishSpin();
      if (g.state.mode === 'nudge') g.nudge(1);
      if (g.state.mode === 'hold') g.toggleHold(2);
    }
    assert.deepEqual(a.snapshot(), b.snapshot());
  }
});

test('bankroll conservation survives spins, holds, advances and cashouts', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const game = new SlotGame({ pesetas: 5000, seed });
    for (let i = 0; i < 80; i++) {
      game.settleWin();
      if (game.state.wallet < STAKE) game.cashOut();
      if (!game.insertCoin()) break;
      game.beginSpin(); game.finishSpin();
      if (game.state.mode === 'hold') game.toggleHold(i % 3);
      while (game.state.mode === 'nudge') game.nudge(i % 3);
      const total = game.state.wallet + (game.state.credits + game.state.bank) * STAKE;
      assert.equal(total, 5000 - game.state.spins * STAKE + game.state.totalWon);
      assert.equal(validSnapshot(game.snapshot()), true);
      game.settleWin();
      if (i % 3 === 0) game.cashOut();
    }
  }
});

test('damaged saves fall back to a fresh game', () => {
  const clean = new SlotGame({ seed: 12 }).snapshot();
  for (const damaged of [null,{}, {...clean, wallet:-1}, {...clean, positions:[99,0,1]},
    {...clean, held:[true,true,true]}, {...clean, mode:'spinning',pending:null}, {...clean, rng:0},
    {...clean, credits:Infinity}, {...clean, version:2}]) {
    assert.equal(validSnapshot(damaged), false);
    assert.equal(new SlotGame({ seed: 12, snapshot: damaged }).state.wallet, 500);
  }
});
