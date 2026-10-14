// Golden states come from the shipped web engine, never from the C# implementation.
import { SlotGame } from '../tragaperras/game.mjs';
import { writeFileSync } from 'node:fs';

const cases = [0, 1, 1992, 123456, -123, -2147483648].map(seed => {
  let game = new SlotGame({ pesetas: 5000, seed });
  const steps = [];
  function step(operation, arg = 0) {
    if (operation === 'restore') game = new SlotGame({ snapshot: game.snapshot() });
    else game[operation](arg);
    steps.push({ operation, arg, expected: game.snapshot() });
  }
  for (let spin = 0; spin < 16; spin++) {
    step('insertCoin');
    if (game.state.mode === 'hold') [0, 1, 2].forEach(i => step('toggleHold', i));
    step('beginSpin');
    // Include attempts to act while spinning and paid-spin recovery.
    step('insertCoin');
    step(spin % 4 === 0 ? 'restore' : 'finishSpin');
    while (game.state.mode === 'nudge') step('nudge', (spin + game.state.nudges) % 3);
    step('settleWin');
    if (spin % 5 === 0) step('cashOut');
  }
  step('cashOut');
  return { seed, pesetas: 5000, steps };
});
const path = new URL('../unity/Packages/com.cimavilla.costa-verde/Tests/Fixtures/web-parity.json', import.meta.url);
writeFileSync(path, JSON.stringify({ source: 'tragaperras/game.mjs', cases }) + '\n');
console.log(`Golden fixtures: ${cases.length} seeds, ${cases.reduce((n, c) => n + c.steps.length, 0)} checkpoints.`);
