#!/usr/bin/env python3
"""Browser integration checks. Run a local server first; requires Playwright."""
from pathlib import Path
import argparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base', default='http://127.0.0.1:4173')
parser.add_argument('--chromium', default='/usr/bin/chromium')
parser.add_argument('--screenshots', type=Path)
args = parser.parse_args()


def ready(page):
    page.wait_for_function('window.CimavillaTragaperras !== undefined')


def settled(page):
    page.wait_for_function('!document.querySelector("#coin-button").disabled')


def state(page):
    return page.evaluate('CimavillaTragaperras.estado()')


def start(page, seed, pesetas=500):
    page.evaluate('(ctx) => CimavillaTragaperras.iniciar(ctx)', {'Pesetas':pesetas, 'Semilla':seed})


def picture(page, name):
    if args.screenshots:
        args.screenshots.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(args.screenshots / f'{name}.png'), full_page=True)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=args.chromium, headless=True, args=['--no-sandbox'])
    errors = []
    context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(args.base + '/tragaperras/'); ready(page)
    page.evaluate('document.fonts.ready'); picture(page, 'desktop')

    # Two advances on a real strip turn C / W / C into a three-cherry prize.
    start(page, 1)
    page.keyboard.press('m'); page.keyboard.press('Space'); settled(page)
    assert state(page)['mode'] == 'nudge' and state(page)['nudges'] == 2
    assert page.locator('[data-reel-action="1"] .action-label').inner_text() == 'AVANZAR'
    picture(page, 'avances')
    page.keyboard.press('s'); settled(page)
    assert state(page)['nudges'] == 1 and state(page)['positions'][1] == 1
    page.keyboard.press('s'); settled(page)
    assert state(page)['bank'] == 5 and state(page)['best'] == 125
    assert state(page)['spins'] == 1 and state(page)['wallet'] == 475
    page.keyboard.press('c'); settled(page)
    assert state(page)['wallet'] == 600 and state(page)['bank'] == 0
    picture(page, 'cobro')
    print('PASS: avances físicos, premio único y cobro')

    # Retain two; a third is rejected. Retained stops survive the next paid spin.
    start(page, 2)
    page.keyboard.press('m'); page.keyboard.press('Space'); settled(page)
    assert state(page)['mode'] == 'hold'
    before = state(page)['positions']
    for key in ['a','s','d']: page.keyboard.press(key)
    assert state(page)['held'] == [True,True,False]
    assert page.locator('[data-reel-action="0"]').get_attribute('aria-pressed') == 'true'
    picture(page, 'retenciones')
    page.keyboard.press('m'); page.keyboard.press('Space'); settled(page)
    assert state(page)['positions'][:2] == before[:2]
    assert state(page)['held'] == [False,False,False] and state(page)['spins'] == 2
    print('PASS: máximo de dos retenciones y siguiente tirada')

    # Credits and prizes are both returned, and ending emits only one result.
    start(page, 7)
    page.keyboard.press('m'); page.keyboard.press('m'); page.keyboard.press('Space'); settled(page)
    assert state(page)['credits'] == 1 and state(page)['bank'] == 2
    page.keyboard.press('c'); settled(page)
    assert state(page)['wallet'] == 525
    page.evaluate("window.endEvents = []; addEventListener('minijuego:fin', e => endEvents.push(e.detail))")
    result = page.evaluate('CimavillaTragaperras.terminar()')
    page.evaluate('CimavillaTragaperras.terminar()')
    assert result['pesetasDelta'] == 25 and result['puntos'] == 50
    assert page.evaluate('endEvents.length') == 1
    print('PASS: saldo completo y contrato de fin único')

    start(page, 1992)
    page.locator('#help-button').click()
    assert page.locator('#help-dialog').is_visible()
    picture(page, 'ayuda'); page.keyboard.press('Escape')
    assert not page.locator('#help-dialog').is_visible()
    page.locator('#payout-button').click()
    assert page.locator('#payout-dialog').is_visible()
    page.keyboard.press('Escape')
    page.keyboard.press('p'); assert page.locator('#pause-veil').is_visible()
    page.locator('#resume-button').click(); assert not page.locator('#pause-veil').is_visible()
    page.locator('#sound-button').click()
    assert page.locator('#sound-button').get_attribute('aria-pressed') == 'false'
    print('PASS: ayuda, premios, pausa y silencio')
    context.close()

    # Standalone save: a paid spin interrupted by reload resolves once.
    context = browser.new_context(viewport={'width':1440,'height':1000})
    page = context.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(args.base + '/tragaperras/'); ready(page)
    page.keyboard.press('m'); page.keyboard.press('Space')
    pending = state(page)
    assert pending['mode'] == 'spinning'
    page.reload(); ready(page); settled(page)
    after = state(page)
    assert after['spins'] == 1 and after['positions'] == pending['pending']['targets']
    assert after['wallet'] == 475 and after['credits'] == 0
    page.reload(); ready(page); settled(page)
    assert state(page) == after
    print('PASS: recarga durante una tirada sin pérdidas ni premios duplicados')

    # Actual motion pauses on a dialog and on host pause; no canvas movement.
    start(page, 7); page.keyboard.press('m'); page.keyboard.press('Space')
    page.wait_for_timeout(220)
    page.locator('#help-button').click()
    frame = page.locator('.reel canvas').first.evaluate('(canvas) => canvas.toDataURL()')
    page.wait_for_timeout(500)
    assert page.locator('.reel canvas').first.evaluate('(canvas) => canvas.toDataURL()') == frame
    page.keyboard.press('Escape')
    page.evaluate('CimavillaTragaperras.pausar(true)')
    assert page.locator('#resume-button').is_disabled()
    frame = page.locator('.reel canvas').first.evaluate('(canvas) => canvas.toDataURL()')
    page.wait_for_timeout(300)
    assert page.locator('.reel canvas').first.evaluate('(canvas) => canvas.toDataURL()') == frame
    # Ending during a paused spin finishes its selected outcome and returns promptly.
    result = page.evaluate('CimavillaTragaperras.terminar()')
    assert result['partidas'] == 1 and result['pesetasDelta'] == 25
    print('PASS: animación congelada y terminación durante pausa')
    context.close()

    for width,height in [(1440,900),(1024,768),(820,1180),(390,844),(320,640)]:
        context = browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce', has_touch=width < 700)
        page = context.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(args.base + '/tragaperras/'); ready(page); page.evaluate('document.fonts.ready')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        if width == 390:
            page.locator('#coin-button').tap()
            assert page.locator('body').evaluate('(e) => e.classList.contains("playing")')
            picture(page, 'movil')
            page.locator('#spin-button').tap(); settled(page)
            assert state(page)['spins'] == 1
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        context.close()
    print('PASS: cinco tamaños de pantalla y controles táctiles')

    # Parent messages only; iframe result sent to parent exactly once.
    context = browser.new_context(reduced_motion='reduce')
    page = context.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(args.base + '/index.html')
    page.evaluate("""() => {
        window.results = [];
        addEventListener('message', e => { if(e.data.tipo === 'fin') results.push(e.data); });
        const frame = document.createElement('iframe'); frame.id = 'game';
        frame.src = 'tragaperras/index.html'; document.body.append(frame);
    }""")
    frame = page.frame_locator('#game')
    frame.locator('#coin-button').wait_for()
    child = next(f for f in page.frames if '/tragaperras/' in f.url)
    child.wait_for_function('window.CimavillaTragaperras !== undefined')
    page.evaluate("game.contentWindow.postMessage({tipo:'iniciar',id:'tragaperras',contexto:{Pesetas:100,Semilla:7}},location.origin)")
    child.wait_for_function('CimavillaTragaperras.estado().wallet === 100')
    frame.locator('#coin-button').click(); frame.locator('#spin-button').click()
    child.wait_for_function('!document.querySelector("#coin-button").disabled')
    page.evaluate("game.contentWindow.postMessage({tipo:'terminar',id:'tragaperras'},location.origin)")
    page.wait_for_function('results.length === 1')
    assert page.evaluate('results[0].pesetasDelta') == 25
    assert child.evaluate('CimavillaTragaperras.estado().wallet') == 125
    context.close(); print('PASS: contexto del anfitrión y resultado en iframe')

    # Render the actual mixer, including decoded voice assets, without a sound device.
    context = browser.new_context()
    page = context.new_page(); page.goto(args.base + '/tragaperras/'); ready(page)
    async_audio_check = """async (mode) => {
        const { MachineAudio } = await import('./audio.mjs');
        const native = window.AudioContext, nativeFetch = window.fetch;
        const slow = mode === 'slow';
        if(slow) window.fetch = () => new Promise(() => {});
        let offline;
        window.AudioContext = function() {
            offline = new OfflineAudioContext(1, 44100 * 4, 44100);
            offline.resume = async () => {};
            return offline;
        };
        try {
            const audio = new MachineAudio(); audio.setMuted(mode === true);
            const unblocked = await Promise.race([
                audio.unlock().then(() => true), new Promise(resolve => setTimeout(() => resolve(false), 300))
            ]);
            if(!unblocked) return {blocked:true};
            if(audio.sampleReady && !slow) await audio.sampleReady;
            audio.win(true);
            const rendered = await offline.startRendering(), data = rendered.getChannelData(0);
            let peak = 0, energy = 0;
            for(const value of data) { peak = Math.max(peak, Math.abs(value)); energy += value * value; }
            return {peak, rms:Math.sqrt(energy / data.length), voices:audio.samples.size};
        } finally { window.AudioContext = native; window.fetch = nativeFetch; }
    }"""
    sound = page.evaluate(async_audio_check, False)
    assert sound['voices'] == 2 and sound['rms'] > .01 and sound['peak'] < .98, sound
    silence = page.evaluate(async_audio_check, True)
    assert silence['peak'] == 0 and silence['rms'] == 0, silence
    slow = page.evaluate(async_audio_check, 'slow')
    assert not slow.get('blocked') and slow['voices'] == 0 and slow['rms'] > .01, slow
    context.close(); print('PASS: voces locales, sin saturación, silencio completo y sonido sin bloquear con muestras lentas')

    assert not errors, errors
    browser.close()
    print('Todos los controles de navegador pasan; sin errores de JavaScript.')
