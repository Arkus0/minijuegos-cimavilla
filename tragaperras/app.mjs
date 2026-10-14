import { SlotGame, STAKE, STRIPS, SYMBOLS, LABELS, PAYOUTS } from './game.mjs';
import { MechanicalReels } from './reels.mjs';
import { MachineAudio } from './audio.mjs';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'cimavilla.costa-verde.v1', SOUND_KEY = 'cimavilla.costa-verde.sound';
const standalone = window.parent === window;
const fmt = n => n.toLocaleString('es-ES');
const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
const readStorage = key => { try { return localStorage.getItem(key); } catch { return null; } };
const writeStorage = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Private browsing: play in memory. */ } };
let restored = null;
try { restored = standalone ? JSON.parse(readStorage(STORAGE_KEY)) : null; } catch { /* Ignore a damaged save. */ }
let game = new SlotGame({ seed: seed(), snapshot: restored });
const reels = new MechanicalReels([...document.querySelectorAll('.reel canvas')]);
const audio = new MachineAudio();
audio.setMuted(readStorage(SOUND_KEY) === 'off');
const actionButtons = [...document.querySelectorAll('[data-reel-action]')];
const reelElements = [...document.querySelectorAll('.reel')];
const pauses = new Set();
let busy = false, hostSession = !standalone, toastTimer, activeOperation = Promise.resolve(), finished = false, ending = false;
const pendingWaits = new Set();
let keys = { coin: 'm', spin: ' ', cashout: 'c', reel1: 'a', reel2: 's', reel3: 'd' };

for (let i = 0; i < 24; i++) {
  const bulb = document.createElement('i'); bulb.className = 'bulb'; bulb.style.setProperty('--i', i);
  $('top-bulbs').append(bulb);
}
for (const symbol of [...SYMBOLS].reverse()) {
  const row = document.createElement('div'), icons = document.createElement('span'); icons.className = 'symbols';
  for (let i = 0; i < 3; i++) {
    const img = document.createElement('img'); img.src = `assets/${symbol}.svg`; img.alt = i === 0 ? LABELS[SYMBOLS.indexOf(symbol)] : '';
    icons.append(img);
  }
  const value = document.createElement('strong'); value.textContent = fmt(PAYOUTS[symbol] * STAKE);
  const unit = document.createElement('small'); unit.textContent = ' pts.'; value.append(unit);
  row.append(icons, value); $('payout-table').append(row);
}

function save() { if (standalone && !hostSession) writeStorage(STORAGE_KEY, JSON.stringify(game.snapshot())); }
function toast(message) {
  $('toast').textContent = message; $('toast').classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2600);
}
function story(kicker, title, copy) {
  $('status-kicker').textContent = kicker; $('status-title').textContent = title; $('status-copy').textContent = copy;
}
function machine(message, hint = 'UNA PARTIDA · 25 PESETAS') {
  $('machine-status').textContent = message; $('machine-hint').textContent = hint;
}

function describeState() {
  const s = game.state;
  if (s.mode === 'hold') {
    story('RETENCIONES ENCENDIDAS', 'Lo bueno, guárdatelo.', 'Retén hasta dos rodillos con A, S y D. Se quedarán quietos en la siguiente tirada de 25 pesetas.');
    machine('RETENCIONES', 'ELIJA HASTA DOS RODILLOS');
  } else if (s.mode === 'nudge') {
    story(`${s.nudges} AVANCE${s.nudges === 1 ? '' : 'S'} GRATIS`, 'Un pequeño empujón.', 'Mira el símbolo de arriba. A, S o D lo bajan a la línea. Cada avance cuenta: elige bien.');
    machine(`AVANCES: ${s.nudges}`, 'A · S · D PARA AVANZAR');
  } else if (game.empty) {
    story('EL BOLSILLO ESTÁ VACÍO', 'La noche pide una pausa.', 'No quedan pesetas. Puedes empezar otra noche con un bolsillo nuevo de 500 pesetas.');
    machine('FIN DE LA NOCHE', 'EMPIECE OTRA PARTIDA');
  } else if (s.credits > 0) {
    story('LA MÁQUINA TE ESPERA', 'A ver qué trae la marea.', 'Pulsa JUGAR o la barra de espacio. Tres iguales en la línea y el premio es tuyo.');
    machine('HAGAN JUEGO', 'PULSE JUGAR');
  } else if (s.bank > 0) {
    story('HAY PREMIO EN LA MÁQUINA', 'Eso ya es tuyo.', `Tienes ${fmt(s.bank * STAKE)} pesetas de premio. Cóbralas con C o mete otra moneda para seguir jugando.`);
    machine('PREMIO DISPONIBLE', 'PULSE C PARA COBRAR');
  } else if (s.spins === 0) {
    story('LA NOCHE EMPIEZA AQUÍ', 'Todo empieza con cinco duros.', 'Mete una moneda de 25 pesetas y deja que los rodillos hagan lo suyo.');
    machine('INTRODUZCA MONEDA');
  } else {
    story('OTRA VUELTA AL SOL', 'La siguiente es otra historia.', 'Esta vez no ha salido. Una moneda más, o cobra el saldo y vuelve al barrio cuando quieras.');
    machine('INTRODUZCA MONEDA');
  }
}

function render({ describe = true } = {}) {
  const s = game.state, blocked = busy || pauses.size > 0 || finished;
  $('wallet').textContent = fmt(s.wallet);
  $('credits').textContent = String(s.credits * STAKE).padStart(5, '0');
  $('bank').textContent = String(s.bank * STAKE).padStart(5, '0');
  $('spin-count').textContent = String(s.spins).padStart(2, '0');
  $('best-win').textContent = fmt(s.best);
  $('coin-button').disabled = blocked || s.wallet < STAKE;
  $('spin-button').disabled = blocked || !game.canSpin;
  $('cashout-button').disabled = blocked || !game.canCashOut;
  $('new-night').disabled = blocked || hostSession;
  $('mobile-new-night').disabled = blocked || hostSession;
  $('cabinet').classList.toggle('has-credit', s.credits > 0);
  document.body.classList.toggle('playing', s.spins > 0 || s.credits > 0 || s.bank > 0);
  $('cabinet').classList.toggle('bonus-active', s.mode === 'hold' || s.mode === 'nudge');
  actionButtons.forEach((button, i) => {
    const actionable = s.mode === 'hold' || s.mode === 'nudge';
    button.disabled = blocked || !actionable;
    button.classList.toggle('is-held', s.held[i]);
    button.querySelector('.action-label').textContent = s.mode === 'nudge' ? 'AVANZAR' : 'RETENER';
    button.setAttribute('aria-label', `${s.mode === 'nudge' ? 'Avanzar' : 'Retener'} rodillo ${i + 1}, tecla ${['A','S','D'][i]}`);
    if (s.mode === 'hold') button.setAttribute('aria-pressed', String(s.held[i]));
    else button.removeAttribute('aria-pressed');
    reelElements[i].classList.toggle('held', s.held[i]);
  });
  $('reel-window').setAttribute('aria-label', s.mode === 'spinning' ? 'Rodillos girando' : `Rodillos: ${game.symbols.map(s => LABELS[SYMBOLS.indexOf(s)]).join(', ')}`);
  if (describe && s.mode !== 'spinning' && s.mode !== 'win') describeState();
}

function stopped(index) {
  audio.stop(index);
  const element = reelElements[index]; element.classList.remove('just-stopped');
  void element.offsetWidth; element.classList.add('just-stopped');
}

function wait(ms) {
  if (ending) return Promise.resolve();
  return new Promise(resolve => {
    let remaining = ms, previous = performance.now(), frame;
    const finish = () => { cancelAnimationFrame(frame); pendingWaits.delete(finish); resolve(); };
    pendingWaits.add(finish);
    function tick(now) {
      if (!pauses.size) remaining -= Math.min(now - previous, 50);
      previous = now;
      if (remaining <= 0) finish(); else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  });
}

async function presentOutcome(outcome) {
  if (!outcome) return;
  if (outcome.type === 'win') {
    const amount = outcome.reward * STAKE, big = outcome.reward >= 50;
    $('cabinet').classList.add('celebrating');
    $('win-flash-label').textContent = big ? '¡PREMIO GRANDE!' : '¡PREMIO!';
    $('win-flash-value').replaceChildren(document.createTextNode(`+${fmt(amount)} `));
    const unit = document.createElement('small'); unit.textContent = 'PTS.'; $('win-flash-value').append(unit);
    $('win-flash').classList.add('visible');
    story(big ? 'ESTA LA CUENTAS MAÑANA' : 'LA MAREA TRAJO PREMIO', big ? 'Hoy el puerto es tuyo.' : '¡Esas pesetas son tuyas!', `Has ganado ${fmt(amount)} pesetas. El premio está guardado en la máquina; pulsa C para cobrarlo.`);
    machine('¡PREMIO!', `+${fmt(amount)} PESETAS`);
    audio.win(big); render({ describe: false }); save();
    await wait(audio.muted ? 1200 : big ? 2200 : 1700);
    $('win-flash').classList.remove('visible');
    $('cabinet').classList.remove('celebrating');
    game.settleWin();
  } else if (outcome.type === 'hold' || outcome.type === 'nudge') audio.bonus();
}

function insertCoin() {
  if (busy || pauses.size || finished) return;
  if (!game.insertCoin()) { toast('No quedan duros en el bolsillo. Cobra el saldo o empieza otra noche.'); return; }
  audio.unlock().then(() => audio.coin());
  $('coin-button').classList.remove('coin-inserted'); void $('coin-button').offsetWidth;
  $('coin-button').classList.add('coin-inserted');
  $('tray-coins').replaceChildren(); $('tray-label').textContent = 'SU PREMIO, AQUÍ';
  render(); save();
}

async function spin() {
  if (busy || pauses.size || finished) return;
  if (!game.canSpin) { toast(game.state.bank > 0 ? 'Mete una moneda con M, o cobra tu premio con C.' : 'Primero mete una moneda de 25 pesetas con M.'); return; }
  busy = true;
  const plan = game.beginSpin();
  save(); render({ describe: false });
  story('QUE RUEDEN LOS RODILLOS', 'Un segundo de esperanza.', 'El puerto sabe guardar secretos. A ver qué te cuenta esta vez.');
  machine('SUERTE', 'LOS RODILLOS ESTÁN GIRANDO');
  $('tray-coins').replaceChildren();
  await audio.unlock(); audio.click(); audio.startMotor();
  await reels.spin(plan.targets, plan.held, index => {
    stopped(index);
    if (index === 1 && !plan.held[2] && STRIPS[0][plan.targets[0]] === STRIPS[1][plan.targets[1]]) {
      $('cabinet').classList.add('anticipation');
      machine('UNO MÁS…', 'LA SUERTE ESTÁ EN EL ÚLTIMO');
      audio.tone(220, .55, 0, .12, 'triangle');
    }
  });
  $('cabinet').classList.remove('anticipation');
  audio.stopMotor();
  const outcome = game.finishSpin(); save();
  render({ describe: false });
  await presentOutcome(outcome);
  busy = false; render(); save();
}

async function reelAction(index) {
  if (busy || pauses.size || finished) return;
  if (game.state.mode === 'hold') {
    if (!game.toggleHold(index)) { toast('Puedes retener hasta dos rodillos. Deja uno a la suerte.'); return; }
    await audio.unlock(); audio.click(); render(); save();
  } else if (game.state.mode === 'nudge') {
    busy = true;
    const outcome = game.nudge(index); save(); render({ describe: false });
    await audio.unlock(); audio.click();
    await reels.nudge(index, game.state.positions[index], stopped);
    await presentOutcome(outcome);
    busy = false; render(); save();
  }
}

async function cashOut() {
  if (busy || pauses.size || finished || !game.canCashOut) return;
  busy = true;
  const amount = game.cashOut(); save(); render({ describe: false });
  story('DEL PREMIO AL BOLSILLO', 'Que suenen esas monedas.', `${fmt(amount)} pesetas han vuelto a tu bolsillo. La Costa Verde te espera si quieres otra ronda.`);
  machine('COBRANDO', `${fmt(amount)} PESETAS`);
  $('coin-tray').classList.add('paying'); $('tray-coins').replaceChildren();
  await audio.unlock();
  const count = Math.min(amount / STAKE, 18);
  for (let i = 0; i < count; i++) {
    const coin = document.createElement('span'); coin.className = 'tray-coin';
    coin.style.cssText = `--x:${18 + (i * 29) % 68}%;--y:${(i * 3) % 9 - 3}px;--r:${i * 37}deg;--delay:0s`;
    $('tray-coins').append(coin); audio.coin(); await wait(70);
  }
  await wait(400);
  $('coin-tray').classList.remove('paying'); $('tray-label').textContent = `${fmt(amount)} PTS. COBRADAS`;
  busy = false; render({ describe: false }); machine('PREMIO COBRADO', 'GRACIAS Y BUENA SUERTE');
  toast(`${fmt(amount)} pesetas al bolsillo.`); save();
}

function run(action) {
  if (busy) return activeOperation;
  activeOperation = Promise.resolve(action()).catch(error => {
    console.error('Costa Verde:', error);
    audio.stopMotor(); reels.finishImmediately();
    if (game.state.mode === 'spinning') game.finishSpin();
    game.settleWin(); busy = false; render(); save(); toast('La máquina ha recuperado la partida. Puedes continuar.');
  });
  return activeOperation;
}

function setPause(reason, paused) {
  if (paused) pauses.add(reason); else pauses.delete(reason);
  const active = pauses.size > 0;
  reels.pause(active); audio.pause(active);
  $('pause-veil').hidden = !(pauses.has('manual') || pauses.has('host'));
  $('resume-button').disabled = pauses.has('host');
  $('resume-button').textContent = pauses.has('host') ? 'ESPERANDO AL JUEGO' : 'CONTINUAR';
  render({ describe: false });
}
function openDialog(id) {
  if (finished) return;
  $(id).showModal(); setPause('dialog', true);
}
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('close', () => setPause('dialog', false));
  dialog.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', e => {
    const r = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dialog.close();
  });
});
$('help-button').onclick = () => openDialog('help-dialog');
$('payout-button').onclick = () => openDialog('payout-dialog');
$('new-night').onclick = () => { if (!busy && !hostSession) openDialog('new-night-dialog'); };
$('mobile-new-night').onclick = $('new-night').onclick;
$('confirm-new-night').onclick = () => {
  game = new SlotGame({ seed: seed() }); finished = false;
  reels.setPositions(game.state.positions); $('tray-coins').replaceChildren(); $('tray-label').textContent = 'SU PREMIO, AQUÍ';
  $('new-night-dialog').close(); render(); save(); toast('Otra noche. 500 pesetas. La suerte empieza de nuevo.');
};
$('coin-button').onclick = insertCoin;
$('spin-button').onclick = () => run(spin);
$('cashout-button').onclick = () => run(cashOut);
actionButtons.forEach((b,i) => b.onclick = () => run(() => reelAction(i)));
$('resume-button').onclick = () => setPause('manual', false);

function renderSound() {
  document.body.classList.toggle('is-muted', audio.muted);
  $('sound-button').setAttribute('aria-label', audio.muted ? 'Activar sonido' : 'Silenciar sonido');
  $('sound-button').setAttribute('aria-pressed', String(!audio.muted));
  $('sound-label').textContent = audio.muted ? 'SIN SONIDO' : 'SONIDO';
}
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reels.reduced) {
  const area = document.querySelector('.machine-area');
  area.addEventListener('pointermove', e => {
    const box = area.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width - .5;
    const y = (e.clientY - box.top) / box.height - .5;
    $('cabinet').style.setProperty('--tilt-y', `${x * 2.2}deg`);
    $('cabinet').style.setProperty('--tilt-x', `${-y * 1.2}deg`);
  });
  area.addEventListener('pointerleave', () => {
    $('cabinet').style.setProperty('--tilt-y', '0deg');
    $('cabinet').style.setProperty('--tilt-x', '0deg');
  });
}
$('sound-button').onclick = async () => {
  audio.setMuted(!audio.muted); await audio.unlock();
  if (pauses.size) audio.pause(true);
  writeStorage(SOUND_KEY, audio.muted ? 'off' : 'on'); renderSound();
};

document.addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (document.querySelector('dialog[open]')) return;
  const key = e.key.toLowerCase();
  if (key === 'escape' || key === 'p') { e.preventDefault(); setPause('manual', !pauses.has('manual')); return; }
  if (key === '?' || key === 'h') { e.preventDefault(); openDialog('help-dialog'); return; }
  // Space keeps native activation when a control has keyboard focus.
  if (key === ' ' && e.target.closest('button,a')) return;
  const action = Object.entries(keys).find(([, binding]) => binding === key)?.[0];
  if (!action) return;
  e.preventDefault();
  if (action === 'coin') insertCoin();
  else if (action === 'spin') run(spin);
  else if (action === 'cashout') run(cashOut);
  else run(() => reelAction(Number(action.slice(-1)) - 1));
});
document.addEventListener('visibilitychange', () => setPause('visibility', document.hidden));
window.addEventListener('pagehide', save);

function finish() {
  if (busy) return null;
  if (!finished) {
    game.cashOut(); save(); finished = true;
    const result = game.result();
    if (!standalone) window.parent.postMessage(result, '*');
    window.dispatchEvent(new CustomEvent('minijuego:fin', { detail: result }));
    render({ describe: false });
  }
  return game.result();
}
[$('exit-link'), $('footer-exit')].forEach(link => link.addEventListener('click', e => {
  if (busy) { e.preventDefault(); toast('Espera a que termine la máquina para volver al barrio.'); return; }
  const result = finish();
  if (!standalone && result) e.preventDefault();
}));

// Small adapter for a host or Unity WebView. The engine itself has no global state.
window.CimavillaTragaperras = Object.freeze({
  id: 'tragaperras',
  iniciar(context = {}) {
    if (busy) throw new Error('Espera a que termine la acción actual antes de iniciar otra sesión.');
    const pesetas = context.Pesetas ?? context.pesetas ?? 500;
    if (!Number.isSafeInteger(pesetas) || pesetas < 0) throw new TypeError('Pesetas debe ser un entero positivo o cero.');
    hostSession = true; finished = false;
    game = new SlotGame({ pesetas, seed: context.Semilla ?? context.semilla ?? seed() });
    if (context.controles) keys = { ...keys, ...context.controles };
    reels.setPositions(game.state.positions); $('tray-coins').replaceChildren();
    render();
  },
  pausar(paused) { setPause('host', Boolean(paused)); },
  async terminar() {
    ending = true;
    setPause('host', false); setPause('manual', false);
    setPause('visibility', false);
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    setPause('dialog', false);
    reels.finishImmediately(); pendingWaits.forEach(finish => finish());
    await activeOperation;
    const result = finish(); ending = false; return result;
  },
  estado() { return game.snapshot(); },
});
window.addEventListener('message', e => {
  if (standalone || e.source !== window.parent || !e.data || e.data.id !== 'tragaperras') return;
  if (e.data.tipo === 'iniciar') {
    try { window.CimavillaTragaperras.iniciar(e.data.contexto || {}); } catch (error) { toast(error.message); }
  } else if (e.data.tipo === 'pausar') window.CimavillaTragaperras.pausar(e.data.pausa);
  else if (e.data.tipo === 'terminar') window.CimavillaTragaperras.terminar();
});

reels.setPositions(game.state.positions); renderSound(); render(); save();
if (game.empty && !hostSession) {
  $('new-night-title').textContent = 'La última moneda ya rodó.';
  $('new-night-copy').textContent = 'Esta noche se acabaron las pesetas. Puedes volver al barrio o empezar otra partida con 500 pesetas nuevas.';
  openDialog('new-night-dialog');
}
