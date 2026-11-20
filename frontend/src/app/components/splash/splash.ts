import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { SplashService } from '../../core/splash.service';
import { ThemeService } from '../../core/theme.service';

// Tiempos (ms). Ajústalos a gusto.
const APPEAR_MS = 500;   // aparición del logo al centro
const HOLD_MS = 800;    // tiempo con el logo en primer plano
const SPLIT_MS = 340;    // "latido" en que el logo se multiplica
const MOVE_MS = 1000;    // traslado de cada copia a su lugar
const FOOTER_DELAY = 90; // la copia del footer sale un instante después: se ve cómo se separan
const EASING = 'cubic-bezier(.45, 0, .15, 1)'; // arranque suave y llegada muy suave

const LOGO = 'assets/logo-ses.svg';
const LOGO_WHITE = 'assets/logo-ses-blanco.svg';

@Component({
  selector: 'app-splash',
  template: `
    @if (!splash.done()) {
      <div #stage class="splash" [class.splash--leaving]="leaving()" aria-hidden="true">
        <img #logo class="splash__logo" [src]="theme.theme() === 'dark' ? white : normal"
             alt="" width="577" height="78" />
      </div>
    }
  `,
  styles: `
    .splash { position: fixed; inset: 0; z-index: 200; background-color: var(--bg);
      transition: background-color 1100ms ease-in-out 150ms; }
    .splash--leaving { background-color: transparent; pointer-events: none; }
    .splash__logo { position: fixed; left: 50%; top: 50%; width: min(90vw, 700px); height: auto;
      transform: translate(-50%, -50%); transform-origin: 0 0; opacity: 0; will-change: transform; }
  `,
})
export class Splash {
  splash = inject(SplashService);
  theme = inject(ThemeService);
  leaving = signal(false);
  normal = LOGO;
  white = LOGO_WHITE;
  private logo = viewChild<ElementRef<HTMLImageElement>>('logo');
  private stage = viewChild<ElementRef<HTMLDivElement>>('stage');

  constructor() {
    afterNextRender(() => { this.run(); });
  }

  private async run() {
    const img = this.logo()?.nativeElement;
    const stage = this.stage()?.nativeElement;
    if (!img || !stage) return this.finish();
    // Respaldo: si algo falla, la página se muestra igual a los pocos segundos
    const safety = setTimeout(() => this.finish(), APPEAR_MS + HOLD_MS + SPLIT_MS + MOVE_MS + 2500);

    // Esperar a que el SVG esté cargado para que no "salte" al aparecer
    try { await img.decode(); } catch { /* seguimos igual */ }

    // 1) Aparición: fundido + leve zoom
    await img.animate(
      [{ opacity: 0, transform: 'translate(-50%, -50%) scale(.94)' },
       { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }],
      { duration: APPEAR_MS, easing: 'cubic-bezier(.2, .7, .2, 1)', fill: 'forwards' },
    ).finished;

    // 2) Primer plano
    await this.wait(HOLD_MS);

    const headerTarget = document.querySelector<HTMLElement>('.header__brand img');
    const footerTarget = document.querySelector<HTMLElement>('.footer img');
    if (!headerTarget) return this.finish();

    // Fijamos el logo en su posición actual (técnica FLIP: solo animamos transform)
    const from = img.getBoundingClientRect();
    img.getAnimations().forEach((a) => a.cancel());
    Object.assign(img.style, {
      left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, transform: 'none', opacity: '1',
    });

    // 3) Multiplicación: el logo "late" y de él se desprende una copia
    const copy = this.makeFooterCopy(from, img.src);
    stage.appendChild(copy);
    const echo = img.cloneNode() as HTMLImageElement; // eco que se expande y desvanece
    stage.insertBefore(echo, img);
    echo.animate(
      [{ transform: 'scale(1)', opacity: .45, filter: 'blur(0px)' },
       { transform: 'scale(1.18)', opacity: 0, filter: 'blur(6px)' }],
      { duration: SPLIT_MS + 200, easing: 'ease-out', fill: 'forwards' },
    );
    const pulse = [{ transform: 'scale(1)' }, { transform: 'scale(1.05)', offset: .45 }, { transform: 'scale(1)' }];
    img.style.transformOrigin = copy.style.transformOrigin = 'center';
    copy.animate(pulse, { duration: SPLIT_MS, easing: 'ease-in-out' });
    await img.animate(pulse, { duration: SPLIT_MS, easing: 'ease-in-out' }).finished;
    img.style.transformOrigin = copy.style.transformOrigin = '0 0';

    // 4) Cada copia viaja a su lugar: una al navbar y otra al footer
    this.leaving.set(true); // el fondo se desvanece mientras los logos viajan
    const toHeader = headerTarget.getBoundingClientRect();
    const flights = [
      img.animate(
        [{ transform: 'translate(0, 0) scale(1)' }, { transform: this.flight(from, toHeader) }],
        { duration: MOVE_MS, easing: EASING, fill: 'forwards' },
      ).finished,
    ];
    if (footerTarget) {
      const toFooter = footerTarget.getBoundingClientRect();
      flights.push(copy.animate(
        [{ transform: 'translate(0, 0) scale(1)' }, { transform: this.flight(from, toFooter) }],
        { duration: MOVE_MS, delay: FOOTER_DELAY, easing: EASING, fill: 'forwards' },
      ).finished);
      // En el camino, la copia cambia a la versión blanca del logo (la del footer)
      const white = copy.querySelector<HTMLImageElement>('.white');
      const normal = copy.querySelector<HTMLImageElement>('.normal');
      if (white && normal && normal.src !== white.src) {
        const fade = { duration: MOVE_MS * .6, delay: FOOTER_DELAY + MOVE_MS * .2, easing: 'ease-in-out', fill: 'forwards' as const };
        normal.animate([{ opacity: 1 }, { opacity: 0 }], fade);
        white.animate([{ opacity: 0 }, { opacity: 1 }], fade);
      }
    } else {
      copy.remove();
    }
    await Promise.all(flights);

    clearTimeout(safety);
    this.finish();
  }

  /** Copia del logo para el footer: lleva las dos versiones (normal y blanca) para cambiar de una a otra en vuelo. */
  private makeFooterCopy(from: DOMRect, src: string) {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
      position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`,
      height: `${from.height}px`, transformOrigin: '0 0', willChange: 'transform',
    });
    for (const [cls, s, op] of [['normal', src, '1'], ['white', LOGO_WHITE, '0']] as const) {
      const im = document.createElement('img');
      im.className = cls; im.src = s; im.alt = '';
      Object.assign(im.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', opacity: op });
      wrap.appendChild(im);
    }
    return wrap;
  }

  private flight(from: DOMRect, to: DOMRect) {
    return `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})`;
  }

  private wait(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

  private finish() { this.splash.done.set(true); }
}
